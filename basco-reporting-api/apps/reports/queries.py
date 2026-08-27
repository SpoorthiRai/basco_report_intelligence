"""
apps/reports/queries.py
------------------------
Raw SQL query strings for all reporting endpoints against BLUE_BASCO warehouse.

Rules for this file:
  - Module-level constants ONLY — no functions, no logic, no imports.
  - Every constant must have a comment above it describing what it returns.
  - All queries target the BLUE_BASCO warehouse (read-only).
  - Parameters are passed by the view via cursor.execute(QUERY, params) —
    never interpolated into the string directly (SQL injection prevention).
"""

# Returns per-retailer compliance summary for 2026: derived BASCO score, violations, queries, country, region, quarter
LEAGUE_TABLE_QUERY = """
WITH CleanSenders AS (
    SELECT
        jq.Thread_ID,
        MAX(jq.Received_Time) AS Received_Time,
        MAX(CONCAT('Q', DATEPART(QUARTER, jq.Received_Time), ' ', YEAR(jq.Received_Time))) AS quarter_label,
        MAX(CASE
            WHEN CHARINDEX('<', jq.Sender_Email) > 0
            THEN LTRIM(RTRIM(SUBSTRING(
                    jq.Sender_Email,
                    CHARINDEX('<', jq.Sender_Email) + 1,
                    CHARINDEX('>', jq.Sender_Email)
                        - CHARINDEX('<', jq.Sender_Email) - 1
                )))
            ELSE LTRIM(RTRIM(jq.Sender_Email))
        END) AS clean_email
    FROM [BLUE_BASCO].[dbo].[Job_Queue] jq WITH (NOLOCK)
    WHERE jq.Status = 'COMPLETED'
      AND jq.Received_Time IS NOT NULL
      AND YEAR(jq.Received_Time) = 2026
    GROUP BY jq.Thread_ID
),
SenderInfo AS (
    SELECT
        cs.Thread_ID,
        cs.Received_Time,
        cs.quarter_label,
        cs.clean_email,
        COALESCE(aihd.COUNTRY, scm.Country, 'Unknown') AS Country,
        COALESCE(aihd.REGION, scm.Region, 'Unknown') AS Region,
        COALESCE(aihd.PARENT_ACCOUNT_V2, aihd.PARENT_ACCOUNT, scm.Parent_Account, 'Unknown') AS Retailer,
        ISNULL(aihd.TOP_ACCOUNT_FLAG, 'NO') AS Top_Account
    FROM CleanSenders cs
    LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_SenderDetails] aihd WITH (NOLOCK)
        ON cs.clean_email = aihd.CLEAN_SENDER_ID
    LEFT JOIN [BASCO_REPORTING_AUTH].[dbo].[Sender_Country_Map] scm WITH (NOLOCK)
        ON cs.clean_email = scm.Sender_Email
),
ViolationCounts AS (
    SELECT
        cal.Thread_ID,
        COUNT(v.value) AS violation_count,
        CASE WHEN (100 - COUNT(v.value) * 10) < 0 THEN 0 
             ELSE (100 - COUNT(v.value) * 10) 
        END AS basco_score
    FROM [BLUE_BASCO].[dbo].[Creative_Analysis_Log] cal WITH (NOLOCK)
    CROSS APPLY OPENJSON(cal.Audit_Result) v
    WHERE cal.Status = 'REPORT_GENERATED'
    GROUP BY cal.Thread_ID
)
SELECT
    si.Retailer AS retailer,
    si.Country AS country,
    si.Region AS region,
    si.quarter_label AS quarter,
    si.quarter_label AS period,
    COUNT(DISTINCT si.Thread_ID) AS queries,
    ROUND(AVG(CAST(ISNULL(vc.basco_score, 100) AS FLOAT)), 1) AS basco,
    SUM(ISNULL(vc.violation_count, 0)) AS violations,
    MAX(si.Top_Account) AS topAccount,
    MAX(si.clean_email) AS clean_email
FROM SenderInfo si
LEFT JOIN ViolationCounts vc ON si.Thread_ID = vc.Thread_ID
WHERE si.Retailer NOT IN ('Unknown', 'Unmapped', 'None', '', 'NA', 'Intel Creative', 'Red Baron')
  AND si.Country NOT IN ('Unknown', 'Unmapped', 'None', '')
GROUP BY si.Retailer, si.Country, si.Region, si.quarter_label
ORDER BY si.quarter_label DESC, basco ASC
"""

# Returns country-level market maturity summary for 2026: total jobs, avg BASCO score, total violations, and quarter
MARKET_MATURITY_QUERY = """
WITH CleanSenders AS (
    SELECT
        jq.Thread_ID,
        MAX(jq.Received_Time) AS Received_Time,
        MAX(CONCAT('Q', DATEPART(QUARTER, jq.Received_Time), ' ', YEAR(jq.Received_Time))) AS quarter_label,
        MAX(CASE
            WHEN CHARINDEX('<', jq.Sender_Email) > 0
            THEN LTRIM(RTRIM(SUBSTRING(
                    jq.Sender_Email,
                    CHARINDEX('<', jq.Sender_Email) + 1,
                    CHARINDEX('>', jq.Sender_Email)
                        - CHARINDEX('<', jq.Sender_Email) - 1
                )))
            ELSE LTRIM(RTRIM(jq.Sender_Email))
        END) AS clean_email
    FROM [BLUE_BASCO].[dbo].[Job_Queue] jq WITH (NOLOCK)
    WHERE jq.Status = 'COMPLETED'
      AND jq.Received_Time IS NOT NULL
      AND YEAR(jq.Received_Time) = 2026
    GROUP BY jq.Thread_ID
),
SenderInfo AS (
    SELECT
        cs.Thread_ID,
        cs.Received_Time,
        cs.quarter_label,
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
ViolationCounts AS (
    SELECT
        cal.Thread_ID,
        COUNT(v.value) AS violation_count,
        CASE WHEN (100 - COUNT(v.value) * 10) < 0 THEN 0 
             ELSE (100 - COUNT(v.value) * 10) 
        END AS basco_score
    FROM [BLUE_BASCO].[dbo].[Creative_Analysis_Log] cal WITH (NOLOCK)
    CROSS APPLY OPENJSON(cal.Audit_Result) v
    WHERE cal.Status = 'REPORT_GENERATED'
    GROUP BY cal.Thread_ID
)
SELECT
    si.Country AS country,
    si.Region AS region,
    si.quarter_label,
    COUNT(DISTINCT si.Thread_ID) AS total_jobs,
    ROUND(AVG(CAST(ISNULL(vc.basco_score, 100) AS FLOAT)), 1) AS avg_basco_score,
    SUM(ISNULL(vc.violation_count, 0)) AS total_violations
FROM SenderInfo si
LEFT JOIN ViolationCounts vc ON si.Thread_ID = vc.Thread_ID
WHERE si.Retailer NOT IN ('Unknown', 'Unmapped', 'None', '', 'NA', 'Intel Creative', 'Red Baron')
  AND si.Country NOT IN ('Unknown', 'Unmapped', 'None', '')
GROUP BY si.Country, si.Region, si.quarter_label
ORDER BY si.quarter_label DESC, avg_basco_score ASC
"""

# Returns Intel visual type usage per sender/retailer from Creative_Metadata_Log
VISUAL_ADOPTION_QUERY = """
    SELECT
        jq.Sender_Email AS retailer_name,
        ISNULL(cml.Visual_Content_Name, 'Unknown') AS visual_type,
        COUNT(*) AS usage_count
    FROM [BLUE_BASCO].[dbo].[Creative_Metadata_Log] cml
    INNER JOIN [BLUE_BASCO].[dbo].[Job_Queue] jq
        ON cml.Email_Thread_ID = jq.Thread_ID
    WHERE jq.Status = 'COMPLETED'
      AND cml.Intel_Visual_Flag = 'Yes'
      AND cml.Visual_Content_Name IS NOT NULL
      AND cml.Visual_Content_Name != 'None'
    GROUP BY
        jq.Sender_Email,
        cml.Visual_Content_Name
    ORDER BY
        jq.Sender_Email ASC,
        usage_count DESC
"""

# Returns campaign type and CTA objective breakdown across all completed creatives
CTA_MIX_QUERY = """
    SELECT
        ISNULL(cml.Campaign_Type, 'Unknown') AS campaign_type,
        ISNULL(cml.Objective, 'Unknown') AS cta_type,
        COUNT(*) AS count
    FROM [BLUE_BASCO].[dbo].[Creative_Metadata_Log] cml
    INNER JOIN [BLUE_BASCO].[dbo].[Job_Queue] jq
        ON cml.Email_Thread_ID = jq.Thread_ID
    WHERE jq.Status = 'COMPLETED'
      AND cml.Campaign_Type IS NOT NULL
      AND cml.Campaign_Type != 'None'
    GROUP BY
        cml.Campaign_Type,
        cml.Objective
    ORDER BY count DESC
"""
