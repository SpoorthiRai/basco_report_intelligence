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
    COALESCE(NULLIF(LTRIM(RTRIM(CHILD_ACCOUNT)), ''), Account) AS retailer,
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
    COALESCE(NULLIF(LTRIM(RTRIM(CHILD_ACCOUNT)), ''), Account) AS child_account,
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
    COUNT(DISTINCT COALESCE(NULLIF(LTRIM(RTRIM(CHILD_ACCOUNT)), ''), Account)) AS retailer_count
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_Input_Data_Trend] WITH (NOLOCK)
WHERE Year = 2026
  AND Country NOT IN ('Unknown', 'Unmapped', 'None', '')
GROUP BY Country, Region, Quarter, Year
ORDER BY Quarter DESC, avg_basco_score ASC
"""

# Returns POP child accounts by country/quarter for Helpdesk joins
POP_PARENT_COUNTRY_QUERY = """
SELECT DISTINCT
    Country AS country,
    Region AS region,
    CONCAT(Quarter, ' ', Year) AS quarter_label,
    COALESCE(NULLIF(LTRIM(RTRIM(CHILD_ACCOUNT)), ''), Account) AS child_account,
    COALESCE(PARENT_ACCOUNT_V2, Account) AS parent_account
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_Input_Data_Trend] WITH (NOLOCK)
WHERE Year = 2026
  AND Account NOT IN ('Unknown', 'Unmapped', 'None', '', 'NA', 'Intel Creative', 'Red Baron')
  AND Country NOT IN ('Unknown', 'Unmapped', 'None', '')
"""

# Returns Helpdesk query/artwork counts from BASCO_HELPDESK_MASTER_MERGE for Market Maturity bubbles
HELPDESK_MASTER_MERGE_PARENT_USAGE_QUERY = """
SELECT
    LTRIM(RTRIM(CHILD_ACCOUNT)) AS child_account,
    LTRIM(RTRIM(CHILD_ACCOUNT)) AS parent_account,
    REPLACE(LTRIM(RTRIM(QUARTER)), '-', ' ') AS quarter_label,
    LTRIM(RTRIM(COUNTRY)) AS country,
    LTRIM(RTRIM(REGION)) AS region,
    SUM(ISNULL(NO_OF_ARTWORKS, 0)) AS helpdesk_artworks,
    COUNT(SUBJECT_LINE) AS helpdesk_queries
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_HELPDESK_MASTER_MERGE] WITH (NOLOCK)
WHERE YEAR = 2026
  AND CHILD_ACCOUNT IS NOT NULL
  AND LTRIM(RTRIM(CHILD_ACCOUNT)) NOT IN ('Unknown', 'Unmapped', 'None', '', 'NA', 'Intel Creative', 'Red Baron')
GROUP BY
    LTRIM(RTRIM(CHILD_ACCOUNT)),
    LTRIM(RTRIM(QUARTER)),
    LTRIM(RTRIM(COUNTRY)),
    LTRIM(RTRIM(REGION))
"""
