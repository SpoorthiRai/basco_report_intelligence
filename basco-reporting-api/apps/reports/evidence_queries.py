"""SQL for Retailer Creative Performance (evidence locker) against POP warehouse tables."""

# 2026 creatives: hosted analysis + hist scoring, joined on MD_TAG / quarter
EVIDENCE_CREATIVES_QUERY = """
SELECT
    H.ID AS Analysis_ID,
    H.MD_TAG AS MD_Tag,
    COALESCE(H.Image_URL, R.MD_Tag_Image_URL) AS Asset_URL,
    CONCAT(H.Quarter, ' ', H.Year) AS quarter_label,
    H.Year AS Year,
    H.Quarter AS Quarter,
    R.REGION AS Region,
    R.Country AS Country,
    R.Retailer AS Retailer,
    R.PARENT_ACCOUNT_V2 AS Parent_Account,
    R.CHILD_ACCOUNT AS Child_Account,
    R.Top_Account AS Top_Account,
    R.Presence_Logo,
    R.Logo,
    R.Presence_Badge,
    R.Badge,
    R.Presence_Text,
    R.Text_Mention,
    R.Presence_Visual,
    R.Key_Visuals,
    R.BASCO_SCORE,
    H.Campaign_Type,
    H.Campaign_Name,
    H.Layout,
    H.Content,
    H.Intel_Visual_Flag,
    H.Visual_Content_Name,
    H.Intel_Visual_Usage,
    H.AI_Messaging,
    H.Inside_Messaging,
    H.CTA_Flag,
    H.CTA,
    H.Objective,
    H.Offer_Flag,
    H.Offer_Type,
    H.Offer_Text,
    H.OEM_Flag,
    H.OEM_Values
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_HOSTED_MetadataAnalysis] H WITH (NOLOCK)
LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_Raw_HIST_FINAL] R WITH (NOLOCK)
    ON H.MD_TAG = R.MD_Tag
   AND H.Year = R.YEAR
   AND H.Quarter = R.QUARTER
WHERE H.Image_URL IS NOT NULL
ORDER BY H.Year DESC, H.Quarter DESC, H.MD_TAG
"""

EVIDENCE_QUARTER_OPTIONS_QUERY = """
SELECT DISTINCT CONCAT(Quarter, ' ', Year) AS quarter_label
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_HOSTED_MetadataAnalysis] WITH (NOLOCK)
WHERE Quarter IS NOT NULL
  AND LTRIM(RTRIM(Quarter)) NOT IN ('', 'None', 'Unknown')
"""

# POP feedback reasons + category (CAT) for Compliance Gap
EVIDENCE_FEEDBACK_QUERY = """
SELECT DISTINCT
    A.YEAR AS Year,
    A.QUARTER AS Quarter,
    CONCAT(A.QUARTER, ' ', A.YEAR) AS quarter_label,
    A.Creative,
    A.Reason,
    C.FEEDBACK AS CAT,
    D.FEEDBACK AS ELEMENT_CAT
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_TAGS_FEEDBACK_Q12024] A WITH (NOLOCK)
LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_FEEDBACK_MASTER_HD_POP_OLD] C WITH (NOLOCK)
    ON A.Reason = C.Reason
LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_FEEDBACK_MASTER_BE_OLD] D WITH (NOLOCK)
    ON A.Reason = D.Reason
WHERE A.Reason IS NOT NULL
  AND A.Reason NOT LIKE '%evaluated%'
"""
