VISUAL_ADOPTION_MAIN_QUERY = """
SELECT
    CHILD_ACCOUNT AS Retailer,
    CHILD_ACCOUNT AS Child_Account,
    PARENT_ACCOUNT AS Parent_Account,
    COUNTRY AS Country,
    REGION AS Region,
    REPLACE(QUARTER, '-', ' ') AS quarter_label,
    ISNULL(LAYOUT_CATEGORY, 'Unknown') AS Layout_Category,
    ISNULL(GENERAL_VISUAL_STYLE, 'Unknown') AS Visual_Style,
    ISNULL(INTEL_VISUAL_FLAG, 'No') AS Intel_Visual_Flag,
    ISNULL(VISUAL_CONTENT_NAME, 'None') AS Visual_Content_Name,
    VISUAL_CONTENT_URL AS Visual_Content_URL,
    ISNULL(INTEL_VISUAL_USAGE, 'None') AS Intel_Visual_Usage,
    ISNULL(CAMPAIGN_TYPE, 'Unknown') AS Campaign_Type,
    COUNT(*) AS creative_count
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
GROUP BY
    CHILD_ACCOUNT,
    PARENT_ACCOUNT,
    COUNTRY,
    REGION,
    QUARTER,
    LAYOUT_CATEGORY,
    GENERAL_VISUAL_STYLE,
    INTEL_VISUAL_FLAG,
    VISUAL_CONTENT_NAME,
    VISUAL_CONTENT_URL,
    INTEL_VISUAL_USAGE,
    CAMPAIGN_TYPE
ORDER BY Retailer ASC
"""

PMS_VISUALS_QUERY = """
SELECT DISTINCT
    VISUAL_CONTENT_NAME AS PMSVisual_Name,
    VISUAL_CONTENT_URL AS PMSVisual_URL,
    MIN(CONTENT) AS Content
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
WHERE VISUAL_CONTENT_NAME IS NOT NULL
  AND VISUAL_CONTENT_NAME NOT IN ('None', '', 'NA')
  AND VISUAL_CONTENT_URL IS NOT NULL
  AND VISUAL_CONTENT_URL NOT IN ('None', '', 'NA')
GROUP BY
    VISUAL_CONTENT_NAME,
    VISUAL_CONTENT_URL
ORDER BY PMSVisual_Name ASC
"""

VISUAL_USAGE_EVIDENCE_QUERY = """
SELECT
    ASSET_URL AS Asset_URL,
    ISNULL(VISUAL_CONTENT_NAME, 'None') AS Visual_Content_Name,
    VISUAL_CONTENT_URL AS Visual_Content_URL,
    CHILD_ACCOUNT AS Retailer,
    CHILD_ACCOUNT AS Child_Account,
    PARENT_ACCOUNT AS Parent_Account,
    REGION AS Region,
    COUNTRY AS Country,
    REPLACE(QUARTER, '-', ' ') AS quarter_label,
    ISNULL(CAMPAIGN_NAME, ISNULL(CAMPAIGN_TYPE, 'Unknown')) AS Campaign,
    ISNULL(CONTENT, ISNULL(PRODUCT, 'Unknown')) AS Products,
    ISNULL(OFFER_FLAG, 'No') AS Offer_Flag,
    ISNULL(CTA_FLAG, 'No') AS CTA_Flag,
    ISNULL(INTEL_VISUAL_USAGE, 'None') AS Intel_Visual_Usage,
    ISNULL(LAYOUT_CATEGORY, 'Unknown') AS Layout_Category
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
WHERE ASSET_URL IS NOT NULL
  AND VISUAL_CONTENT_NAME IS NOT NULL
  AND VISUAL_CONTENT_NAME NOT IN ('None', '', 'NA')
ORDER BY SEND_DATE DESC
"""

POP_VISUAL_ADOPTION_MAIN_QUERY = """
SELECT
    R.CHILD_ACCOUNT AS Retailer,
    R.CHILD_ACCOUNT AS Child_Account,
    R.PARENT_ACCOUNT_V2 AS Parent_Account,
    R.Country AS Country,
    R.REGION AS Region,
    CONCAT(H.Quarter, ' ', H.Year) AS quarter_label,
    ISNULL(H.Layout, 'Unknown') AS Layout_Category,
    ISNULL(H.Visual_Style, 'Unknown') AS Visual_Style,
    ISNULL(H.Intel_Visual_Flag, 'No') AS Intel_Visual_Flag,
    ISNULL(H.Visual_Content_Name, 'None') AS Visual_Content_Name,
    H.Visual_Content_URL AS Visual_Content_URL,
    ISNULL(H.Intel_Visual_Usage, 'None') AS Intel_Visual_Usage,
    ISNULL(H.Campaign_Type, 'Unknown') AS Campaign_Type,
    COUNT(*) AS creative_count
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_HOSTED_MetadataAnalysis] H WITH (NOLOCK)
LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_Raw_HIST_FINAL] R WITH (NOLOCK)
    ON H.MD_TAG = R.MD_Tag
   AND H.Year = R.YEAR
   AND H.Quarter = R.QUARTER
GROUP BY
    R.CHILD_ACCOUNT,
    R.PARENT_ACCOUNT_V2,
    R.Country,
    R.REGION,
    H.Quarter,
    H.Year,
    H.Layout,
    H.Visual_Style,
    H.Intel_Visual_Flag,
    H.Visual_Content_Name,
    H.Visual_Content_URL,
    H.Intel_Visual_Usage,
    H.Campaign_Type
ORDER BY Retailer ASC
"""

POP_PMS_VISUALS_QUERY = """
SELECT DISTINCT
    Visual_Content_Name AS PMSVisual_Name,
    Visual_Content_URL AS PMSVisual_URL,
    MIN(Content) AS Content
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_HOSTED_MetadataAnalysis] WITH (NOLOCK)
WHERE Visual_Content_Name IS NOT NULL
  AND Visual_Content_Name NOT IN ('None', '', 'NA')
  AND Visual_Content_URL IS NOT NULL
  AND Visual_Content_URL NOT IN ('None', '', 'NA')
GROUP BY
    Visual_Content_Name,
    Visual_Content_URL
ORDER BY PMSVisual_Name ASC
"""

POP_VISUAL_USAGE_EVIDENCE_QUERY = """
SELECT
    COALESCE(H.Image_URL, R.MD_Tag_Image_URL) AS Asset_URL,
    ISNULL(H.Visual_Content_Name, 'None') AS Visual_Content_Name,
    H.Visual_Content_URL AS Visual_Content_URL,
    R.CHILD_ACCOUNT AS Retailer,
    R.CHILD_ACCOUNT AS Child_Account,
    R.PARENT_ACCOUNT_V2 AS Parent_Account,
    R.REGION AS Region,
    R.Country AS Country,
    CONCAT(H.Quarter, ' ', H.Year) AS quarter_label,
    ISNULL(H.Campaign_Name, ISNULL(H.Campaign_Type, 'Unknown')) AS Campaign,
    ISNULL(H.Content, 'Unknown') AS Products,
    ISNULL(H.Offer_Flag, 'No') AS Offer_Flag,
    ISNULL(H.CTA_Flag, 'No') AS CTA_Flag,
    ISNULL(H.Intel_Visual_Usage, 'None') AS Intel_Visual_Usage,
    ISNULL(H.Layout, 'Unknown') AS Layout_Category
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_HOSTED_MetadataAnalysis] H WITH (NOLOCK)
LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_Raw_HIST_FINAL] R WITH (NOLOCK)
    ON H.MD_TAG = R.MD_Tag
   AND H.Year = R.YEAR
   AND H.Quarter = R.QUARTER
WHERE COALESCE(H.Image_URL, R.MD_Tag_Image_URL) IS NOT NULL
  AND H.Visual_Content_Name IS NOT NULL
  AND H.Visual_Content_Name NOT IN ('None', '', 'NA')
ORDER BY H.Year DESC, H.Quarter DESC, H.MD_TAG
"""
