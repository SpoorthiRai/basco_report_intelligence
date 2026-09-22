OFFER_CTA_QUERY = """
SELECT
    A.THREAD_ID AS Email_Thread_ID,
    ISNULL(A.OFFER_FLAG, 'No') AS Offer_Flag,
    ISNULL(A.OFFER_TYPE, 'No Offer') AS Offer_Type,
    ISNULL(A.OFFER_TEXT, 'None') AS Offer_Text,
    ISNULL(A.CTA_FLAG, 'No') AS CTA_Flag,
    ISNULL(A.CTA_TEXT, 'None') AS CTA_Text,
    M.CTA_Bucket AS Mapped_CTA_Bucket,
    ISNULL(A.CONTENT, 'Unknown') AS Content,
    ISNULL(A.CAMPAIGN_TYPE, 'Unknown') AS Campaign_Type,
    A.CHILD_ACCOUNT AS Retailer,
    A.CHILD_ACCOUNT AS Child_Account,
    A.PARENT_ACCOUNT AS Parent_Account,
    A.REGION AS Region,
    A.COUNTRY AS Country,
    REPLACE(A.QUARTER, '-', ' ') AS quarter_label
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] A WITH (NOLOCK)
LEFT JOIN (
    SELECT
        LTRIM(RTRIM(CTA_TEXT_RAW)) AS CTA_TEXT_RAW,
        MAX(CTA_Bucket) AS CTA_Bucket
    FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_CTA_MAPPING] WITH (NOLOCK)
    GROUP BY LTRIM(RTRIM(CTA_TEXT_RAW))
) M
    ON LTRIM(RTRIM(A.CTA_TEXT)) = M.CTA_TEXT_RAW
    AND ISNULL(A.CTA_FLAG, 'No') NOT IN ('No', 'N', 'n', '0')
    AND LTRIM(RTRIM(ISNULL(A.CTA_TEXT, ''))) NOT IN ('', 'None', 'NA', 'Unknown')
"""

OFFER_EVIDENCE_QUERY = """
SELECT
    ASSET_URL AS Asset_URL,
    ISNULL(OFFER_FLAG, 'No') AS Offer_Flag,
    ISNULL(OFFER_TYPE, 'No Offer') AS Offer_Type,
    ISNULL(CTA_FLAG, 'No') AS CTA_Flag,
    ISNULL(CONTENT, 'Unknown') AS Content,
    ISNULL(CAMPAIGN_TYPE, 'Unknown') AS Campaign_Type,
    ISNULL(NARRATIVE_STYLE, 'Unknown') AS Messaging_Style,
    CHILD_ACCOUNT AS Retailer,
    PARENT_ACCOUNT AS Parent_Account,
    REGION AS Region,
    COUNTRY AS Country,
    REPLACE(QUARTER, '-', ' ') AS quarter_label
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
WHERE ASSET_URL IS NOT NULL
ORDER BY SEND_DATE DESC
"""
