CTA_CAMPAIGN_QUERY = """
SELECT
    THREAD_ID AS Email_Thread_ID,
    ISNULL(OBJECTIVE, 'Unknown') AS Objective,
    ISNULL(CTA_FLAG, 'No') AS CTA_Flag,
    ISNULL(CTA_TEXT, 'None') AS CTA_Text,
    ISNULL(NARRATIVE_STYLE, 'Unknown') AS Narrative_Style,
    ISNULL(CAMPAIGN_TYPE, 'Unknown') AS Campaign_Type,
    PARENT_ACCOUNT AS Retailer,
    REGION AS Region,
    COUNTRY AS Country,
    REPLACE(QUARTER, '-', ' ') AS quarter_label
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
WHERE OBJECTIVE IS NOT NULL
  AND OBJECTIVE NOT IN ('NA', '', 'None')
"""

MISALIGNED_EVIDENCE_QUERY = """
SELECT
    ASSET_URL AS Asset_URL,
    OBJECTIVE AS Objective,
    ISNULL(CTA_TEXT, 'None') AS CTA_Text,
    ISNULL(CTA_FLAG, 'No') AS CTA_Flag,
    ISNULL(NARRATIVE_STYLE, 'Unknown') AS Narrative_Style,
    PARENT_ACCOUNT AS Retailer,
    REGION AS Region,
    COUNTRY AS Country,
    REPLACE(QUARTER, '-', ' ') AS quarter_label
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
WHERE ASSET_URL IS NOT NULL
  AND OBJECTIVE = 'Conversion/Sales'
  AND CTA_FLAG = 'No'
ORDER BY SEND_DATE DESC
"""
