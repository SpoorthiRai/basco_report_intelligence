CTA_CAMPAIGN_QUERY = """
WITH CleanSenders AS (
    SELECT
        jq.Thread_ID,
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
      AND YEAR(jq.Received_Time) = 2026
),
SenderInfo AS (
    SELECT
        cs.Thread_ID,
        cs.Received_Time,
        cs.clean_email,
        COALESCE(aihd.COUNTRY, scm.Country, 'Unknown') AS Country,
        COALESCE(aihd.REGION, scm.Region, 'Unknown') AS Region,
        COALESCE(aihd.PARENT_ACCOUNT_V2, aihd.PARENT_ACCOUNT, scm.Parent_Account, 'Unknown') AS Retailer
    FROM CleanSenders cs
    LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_SenderDetails] aihd WITH (NOLOCK)
        ON cs.clean_email = aihd.CLEAN_SENDER_ID
    LEFT JOIN [BASCO_REPORTING_AUTH].[dbo].[Sender_Country_Map] scm WITH (NOLOCK)
        ON cs.clean_email = scm.Sender_Email
)
SELECT
    cml.Email_Thread_ID,
    ISNULL(cml.Objective,       'Unknown') AS Objective,
    ISNULL(cml.CTA_Flag,        'No')      AS CTA_Flag,
    ISNULL(cml.CTA,             'None')    AS CTA_Text,
    ISNULL(cml.Narrative_Style, 'Unknown') AS Narrative_Style,
    ISNULL(cml.Campaign_Type,   'Unknown') AS Campaign_Type,
    si.Retailer,
    si.Region,
    si.Country,
    CONCAT(
        'Q', DATEPART(QUARTER, si.Received_Time),
        ' ', YEAR(si.Received_Time)
    ) AS quarter_label
FROM [BLUE_BASCO].[dbo].[Creative_Metadata_Log] cml WITH (NOLOCK)
INNER JOIN SenderInfo si
    ON cml.Email_Thread_ID = si.Thread_ID
WHERE cml.Objective IS NOT NULL
  AND cml.Objective NOT IN ('NA', '', 'None')
"""

MISALIGNED_EVIDENCE_QUERY = """
WITH CleanSenders AS (
    SELECT
        jq.Thread_ID,
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
      AND YEAR(jq.Received_Time) = 2026
),
SenderInfo AS (
    SELECT
        cs.Thread_ID,
        cs.Received_Time,
        cs.clean_email,
        COALESCE(aihd.COUNTRY, scm.Country, 'Unknown') AS Country,
        COALESCE(aihd.REGION, scm.Region, 'Unknown') AS Region,
        COALESCE(aihd.PARENT_ACCOUNT_V2, aihd.PARENT_ACCOUNT, scm.Parent_Account, 'Unknown') AS Retailer
    FROM CleanSenders cs
    LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_SenderDetails] aihd WITH (NOLOCK)
        ON cs.clean_email = aihd.CLEAN_SENDER_ID
    LEFT JOIN [BASCO_REPORTING_AUTH].[dbo].[Sender_Country_Map] scm WITH (NOLOCK)
        ON cs.clean_email = scm.Sender_Email
),
DeduplicatedAssets AS (
    SELECT
        cal.Thread_ID,
        cal.Asset_URL,
        ROW_NUMBER() OVER (
            PARTITION BY cal.Asset_URL
            ORDER BY cal.Analysis_ID DESC
        ) AS rn
    FROM [BLUE_BASCO].[dbo].[Creative_Analysis_Log] cal WITH (NOLOCK)
    INNER JOIN CleanSenders cs
        ON cal.Thread_ID = cs.Thread_ID
    WHERE cal.Asset_URL IS NOT NULL
)
SELECT
    da.Asset_URL,
    cml.Objective,
    ISNULL(cml.CTA,          'None') AS CTA_Text,
    cml.CTA_Flag,
    ISNULL(cml.Narrative_Style, 'Unknown') AS Narrative_Style,
    si.Retailer,
    si.Region,
    si.Country,
    CONCAT(
        'Q', DATEPART(QUARTER, si.Received_Time),
        ' ', YEAR(si.Received_Time)
    ) AS quarter_label
FROM DeduplicatedAssets da
INNER JOIN SenderInfo si
    ON da.Thread_ID = si.Thread_ID
INNER JOIN [BLUE_BASCO].[dbo].[Creative_Metadata_Log] cml WITH (NOLOCK)
    ON da.Thread_ID = cml.Email_Thread_ID
WHERE da.rn = 1
  AND cml.Objective = 'Conversion/Sales'
  AND cml.CTA_Flag = 'No'
ORDER BY si.Received_Time DESC
"""
