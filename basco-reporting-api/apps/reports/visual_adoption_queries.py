VISUAL_ADOPTION_MAIN_QUERY = """
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
    FROM [BLUE_BASCO].[dbo].[Job_Queue] jq
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
CreativeBase AS (
    SELECT
        cml.Email_Thread_ID,
        cml.Intel_Visual_Flag,
        cml.Visual_Content_Name,
        cml.Visual_Content_URL,
        cml.Intel_Visual_Usage,
        cml.Visual_Style,
        si.Country,
        si.Region,
        si.Retailer,
        si.Received_Time,
        CONCAT(
            'Q', DATEPART(QUARTER, si.Received_Time),
            ' ', YEAR(si.Received_Time)
        ) AS quarter_label
    FROM [BLUE_BASCO].[dbo].[Creative_Metadata_Log] cml
    INNER JOIN SenderInfo si
        ON cml.Email_Thread_ID = si.Thread_ID
    WHERE cml.Visual_Content_Name IS NOT NULL
      AND cml.Visual_Content_Name NOT IN ('None', '', 'NA')
)
SELECT
    Retailer,
    Country,
    Region,
    quarter_label,
    Visual_Style,
    Intel_Visual_Flag,
    Visual_Content_Name,
    Visual_Content_URL,
    Intel_Visual_Usage,
    COUNT(*) AS creative_count
FROM CreativeBase
GROUP BY
    Retailer,
    Country,
    Region,
    quarter_label,
    Visual_Style,
    Intel_Visual_Flag,
    Visual_Content_Name,
    Visual_Content_URL,
    Intel_Visual_Usage
ORDER BY Retailer ASC
"""

PMS_VISUALS_QUERY = """
SELECT
    PMSVisual_ID,
    PMSVisual_Name,
    PMSVisual_URL,
    Content
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_PMSVisual]
ORDER BY PMSVisual_Name ASC
"""
