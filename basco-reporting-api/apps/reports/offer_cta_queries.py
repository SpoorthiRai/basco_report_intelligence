OFFER_CTA_QUERY = """
SELECT
    THREAD_ID AS Email_Thread_ID,
    ISNULL(OFFER_FLAG, 'No') AS Offer_Flag,
    ISNULL(OFFER_TYPE, 'No Offer') AS Offer_Type,
    ISNULL(OFFER_TEXT, 'None') AS Offer_Text,
    ISNULL(CTA_FLAG, 'No') AS CTA_Flag,
    ISNULL(CTA_TEXT, 'None') AS CTA_Text,
    ISNULL(CONTENT, 'Unknown') AS Content,
    ISNULL(CAMPAIGN_TYPE, 'Unknown') AS Campaign_Type,
    PARENT_ACCOUNT AS Retailer,
    REGION AS Region,
    COUNTRY AS Country,
    REPLACE(QUARTER, '-', ' ') AS quarter_label
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
"""

OFFER_EVIDENCE_QUERY = """
SELECT
    ASSET_URL AS Asset_URL,
    ISNULL(OFFER_TYPE, 'No Offer') AS Offer_Type,
    ISNULL(CTA_FLAG, 'No') AS CTA_Flag,
    ISNULL(CONTENT, 'Unknown') AS Content,
    PARENT_ACCOUNT AS Retailer,
    REGION AS Region,
    COUNTRY AS Country,
    REPLACE(QUARTER, '-', ' ') AS quarter_label
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
WHERE ASSET_URL IS NOT NULL
ORDER BY SEND_DATE DESC
"""
