CTA_CAMPAIGN_QUERY = """
SELECT
    A.THREAD_ID AS Email_Thread_ID,
    A.ASSET_URL AS Asset_URL,
    ISNULL(A.OBJECTIVE, 'Unknown') AS Objective,
    ISNULL(A.CTA_FLAG, 'No') AS CTA_Flag,
    ISNULL(A.CTA_TEXT, 'None') AS CTA_Text,
    M.Clean_CTA AS Clean_CTA,
    M.CTA_Bucket AS Mapped_CTA_Bucket,
    ISNULL(A.NARRATIVE_STYLE, 'Unknown') AS Narrative_Style,
    ISNULL(A.VOICE_OF_ATTRIBUTES, 'None') AS Voice_Of_Attribute,
    A.APPLICATION_OF_VOICE AS Application_Of_Voice,
    ISNULL(A.CAMPAIGN_TYPE, 'Unknown') AS Campaign_Type,
    ISNULL(A.CONTENT, 'Unknown') AS Content,
    ISNULL(A.PRODUCT, 'Unknown') AS Product,
    A.CHILD_ACCOUNT AS Retailer,
    A.PARENT_ACCOUNT AS Parent_Account,
    A.REGION AS Region,
    A.COUNTRY AS Country,
    REPLACE(A.QUARTER, '-', ' ') AS quarter_label,
    A.SEND_DATE AS Send_Date
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] A WITH (NOLOCK)
LEFT JOIN (
    SELECT
        LTRIM(RTRIM(CTA_TEXT_RAW)) AS CTA_TEXT_RAW,
        MAX(Clean_CTA) AS Clean_CTA,
        MAX(CTA_Bucket) AS CTA_Bucket
    FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_CTA_MAPPING] WITH (NOLOCK)
    GROUP BY LTRIM(RTRIM(CTA_TEXT_RAW))
) M
    ON LTRIM(RTRIM(A.CTA_TEXT)) = M.CTA_TEXT_RAW
WHERE A.OBJECTIVE IS NOT NULL
  AND A.OBJECTIVE NOT IN ('NA', '', 'None')
"""
