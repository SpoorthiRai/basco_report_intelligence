"""
apps/reports/queries.py
------------------------
Raw SQL query strings for all reporting endpoints against BLUE_BASCO / BASCO_WAREHOUSE_2024 warehouse.

Rules for this file:
  - Module-level constants ONLY — no functions, no logic, no imports.
  - Every constant must have a comment above it describing what it returns.
  - All queries target the warehouse (read-only).
  - Strictly filtered to 2026 data.
"""

# Returns per-retailer compliance summary for 2026 from BASCO_POP_Input_Data_Trend
LEAGUE_TABLE_QUERY = """
SELECT
    Account AS retailer,
    Country AS country,
    Region AS region,
    CONCAT(Quarter, ' ', Year) AS quarter,
    CONCAT(Quarter, ' ', Year) AS period,
    Artwork AS queries,
    Artwork AS artwork,
    ROUND(CAST(Score * 100.0 AS FLOAT), 1) AS basco,
    0 AS violations,
    ROUND(CAST(ISNULL(FMV, Artwork * 35000) AS FLOAT), 0) AS fmv,
    ROUND(CAST(ISNULL(Attribution_Loss, 0) AS FLOAT), 0) AS attr_loss,
    ROUND(CAST(ISNULL(Attribution_Gain, 0) AS FLOAT), 0) AS attr_gain,
    ISNULL(Top_Account, 'NO') AS topAccount,
    COALESCE(PARENT_ACCOUNT_V2, Account) AS parent_account,
    COALESCE(CHILD_ACCOUNT, Account) AS child_account,
    ROUND(CAST(ISNULL(Logo, 0) * 100.0 AS FLOAT), 1) AS logo,
    ROUND(CAST(ISNULL(Badge, 0) * 100.0 AS FLOAT), 1) AS badge,
    ROUND(CAST(ISNULL(Text_Mention, 0) * 100.0 AS FLOAT), 1) AS text_mention,
    ROUND(CAST(ISNULL(Key_Visuals, 0) * 100.0 AS FLOAT), 1) AS key_visuals
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_Input_Data_Trend] WITH (NOLOCK)
WHERE Year = 2026
  AND Account NOT IN ('Unknown', 'Unmapped', 'None', '', 'NA', 'Intel Creative', 'Red Baron')
  AND Country NOT IN ('Unknown', 'Unmapped', 'None', '')
ORDER BY Quarter DESC, basco ASC
"""

# Returns country-level market maturity summary for 2026 from BASCO_POP_Input_Data_Trend
MARKET_MATURITY_QUERY = """
SELECT
    Country AS country,
    Region AS region,
    CONCAT(Quarter, ' ', Year) AS quarter_label,
    SUM(Artwork) AS total_jobs,
    ROUND(CAST(SUM(Score * Artwork) * 100.0 / NULLIF(SUM(Artwork), 0) AS FLOAT), 1) AS avg_basco_score,
    0 AS total_violations,
    SUM(ISNULL(FMV, Artwork * 35000)) AS fmv,
    SUM(ISNULL(Attribution_Loss, 0)) AS attr_loss,
    SUM(ISNULL(Attribution_Gain, 0)) AS attr_gain,
    COUNT(DISTINCT Account) AS retailer_count
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_Input_Data_Trend] WITH (NOLOCK)
WHERE Year = 2026
  AND Country NOT IN ('Unknown', 'Unmapped', 'None', '')
GROUP BY Country, Region, Quarter, Year
ORDER BY Quarter DESC, avg_basco_score ASC
"""

# Returns Intel visual type usage per sender/retailer from BASCO_AIHD_Metadata
VISUAL_ADOPTION_QUERY = """
    SELECT
        PARENT_ACCOUNT AS retailer_name,
        ISNULL(VISUAL_CONTENT_NAME, 'Unknown') AS visual_type,
        COUNT(*) AS usage_count
    FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
    WHERE INTEL_VISUAL_FLAG = 'Yes'
      AND VISUAL_CONTENT_NAME IS NOT NULL
      AND VISUAL_CONTENT_NAME NOT IN ('None', '', 'NA')
    GROUP BY
        PARENT_ACCOUNT,
        VISUAL_CONTENT_NAME
    ORDER BY
        PARENT_ACCOUNT ASC,
        usage_count DESC
"""

# Returns campaign type and CTA objective breakdown across all completed creatives
CTA_MIX_QUERY = """
    SELECT
        ISNULL(CAMPAIGN_TYPE, 'Unknown') AS campaign_type,
        ISNULL(OBJECTIVE, 'Unknown') AS cta_type,
        COUNT(*) AS count
    FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
    WHERE CAMPAIGN_TYPE IS NOT NULL
      AND CAMPAIGN_TYPE NOT IN ('None', '', 'NA')
    GROUP BY
        CAMPAIGN_TYPE,
        OBJECTIVE
    ORDER BY count DESC
"""
