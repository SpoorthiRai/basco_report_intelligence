CTA_CAMPAIGN_QUERY = """
SELECT
    THREAD_ID AS Email_Thread_ID,
    ASSET_URL AS Asset_URL,
    ISNULL(OBJECTIVE, 'Unknown') AS Objective,
    ISNULL(CTA_FLAG, 'No') AS CTA_Flag,
    ISNULL(CTA_TEXT, 'None') AS CTA_Text,
    ISNULL(NARRATIVE_STYLE, 'Unknown') AS Narrative_Style,
    ISNULL(VOICE_OF_ATTRIBUTES, 'None') AS Voice_Of_Attribute,
    ISNULL(CAMPAIGN_TYPE, 'Unknown') AS Campaign_Type,
    ISNULL(CONTENT, 'Unknown') AS Content,
    ISNULL(PRODUCT, 'Unknown') AS Product,
    PARENT_ACCOUNT AS Retailer,
    REGION AS Region,
    COUNTRY AS Country,
    REPLACE(QUARTER, '-', ' ') AS quarter_label,
    SEND_DATE AS Send_Date
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
WHERE OBJECTIVE IS NOT NULL
  AND OBJECTIVE NOT IN ('NA', '', 'None')
"""
