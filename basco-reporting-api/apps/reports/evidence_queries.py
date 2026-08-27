def build_evidence_locker_query(year: int = 2026, quarter_num: int = None) -> str:
    """
    Build the Evidence Locker SQL query.
    Defaults to 2026 data.
    When quarter_num is provided, a WHERE clause is injected into the
    CleanSenders CTE so the filter happens at the database level.
    Adding WITH (NOLOCK) on all read-heavy warehouse tables avoids lock contention.
    """
    target_year = int(year) if year else 2026
    date_filter = f"    AND YEAR(jq.Received_Time) = {target_year}\n"
    if quarter_num:
        date_filter += f"    AND DATEPART(QUARTER, jq.Received_Time) = {int(quarter_num)}\n"

    return f"""
WITH CleanSenders AS (
    SELECT
        jq.Thread_ID,
        jq.Subject,
        jq.Received_Time,
        CASE
            WHEN CHARINDEX('<', jq.Sender_Email) > 0
            THEN LTRIM(RTRIM(SUBSTRING(
                    jq.Sender_Email,
                    CHARINDEX('<', jq.Sender_Email) + 1,
                    CHARINDEX('>', jq.Sender_Email)
                        - CHARINDEX('<', jq.Sender_Email) - 1
                )))
            ELSE LTRIM(RTRIM(jq.Sender_Email))
        END AS clean_email
    FROM [BLUE_BASCO].[dbo].[Job_Queue] jq WITH (NOLOCK)
    WHERE jq.Status = 'COMPLETED'
      AND jq.Received_Time IS NOT NULL
{date_filter}
),
DeduplicatedCreatives AS (
    SELECT
        cal.Analysis_ID,
        cal.Asset_URL,
        cal.Thread_ID,
        cal.Audit_Result,
        CASE
            WHEN cal.Audit_Result IS NULL OR cal.Audit_Result = '[]'
                THEN 'Compliant'
            ELSE 'Non-Compliant'
        END AS compliance_status,
        ROW_NUMBER() OVER (
            PARTITION BY cal.Asset_URL
            ORDER BY cal.Analysis_ID DESC
        ) AS rn
    FROM [BLUE_BASCO].[dbo].[Creative_Analysis_Log] cal WITH (NOLOCK)
    INNER JOIN CleanSenders cs ON cal.Thread_ID = cs.Thread_ID
    WHERE cal.Asset_URL IS NOT NULL
),
UniqueCreatives AS (
    SELECT *
    FROM DeduplicatedCreatives
    WHERE rn = 1
),
SenderCountry AS (
    SELECT
        cs.Thread_ID,
        cs.Subject,
        cs.Received_Time,
        cs.clean_email,
        COALESCE(aihd.COUNTRY, scm.Country, 'Unknown') AS Country,
        COALESCE(aihd.REGION, scm.Region, 'Unknown') AS Region,
        COALESCE(aihd.PARENT_ACCOUNT_V2, aihd.PARENT_ACCOUNT, scm.Parent_Account, 'Unknown') AS Parent_Account
    FROM CleanSenders cs
    LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_SenderDetails] aihd WITH (NOLOCK)
        ON cs.clean_email = aihd.CLEAN_SENDER_ID
    LEFT JOIN [BASCO_REPORTING_AUTH].[dbo].[Sender_Country_Map] scm WITH (NOLOCK)
        ON cs.clean_email = scm.Sender_Email
)
SELECT
    uc.Analysis_ID,
    uc.Asset_URL,
    uc.compliance_status,
    sc.clean_email          AS sender_email,
    sc.Country,
    sc.Region,
    sc.Parent_Account,
    sc.Subject,
    sc.Received_Time,
    CONCAT(
        'Q', DATEPART(QUARTER, sc.Received_Time),
        ' ', YEAR(sc.Received_Time)
    )                       AS quarter_label,
    ISNULL(cml.Campaign_Type,       'Unknown') AS Campaign_Type,
    ISNULL(cml.Campaign_Name,       'Unknown') AS Campaign_Name,
    ISNULL(cml.Layout,              'Unknown') AS Layout,
    ISNULL(cml.Content,             'Unknown') AS Content,
    ISNULL(cml.OEM_Flag,            'No')      AS OEM_Flag,
    ISNULL(cml.OEM_Values,          'None')    AS OEM_Values,
    ISNULL(cml.Intel_Visual_Flag,   'No')      AS Intel_Visual_Flag,
    ISNULL(cml.Visual_Content_Name, 'None')    AS Visual_Content_Name,
    ISNULL(cml.AI_Messaging,        'No')      AS AI_Messaging,
    ISNULL(cml.Inside_Messaging,    'No')      AS Inside_Messaging,
    ISNULL(cml.Offer_Flag,          'No')      AS Offer_Flag,
    ISNULL(cml.CTA_Flag,            'No')      AS CTA_Flag,
    ISNULL(cml.Objective,           'Unknown') AS Objective
FROM UniqueCreatives uc
INNER JOIN SenderCountry sc
    ON uc.Thread_ID = sc.Thread_ID
LEFT JOIN [BLUE_BASCO].[dbo].[Creative_Metadata_Log] cml WITH (NOLOCK)
    ON uc.Thread_ID = cml.Email_Thread_ID
ORDER BY uc.compliance_status ASC, uc.Analysis_ID DESC
"""
