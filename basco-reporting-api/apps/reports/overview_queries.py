"""POP warehouse queries used by Overview execution/compliance cards."""

OVERVIEW_HELPDESK_MASTER_QUERY = """
SELECT
    LTRIM(RTRIM(CHILD_ACCOUNT)) AS Child_Account,
    REPLACE(LTRIM(RTRIM(QUARTER)), '-', ' ') AS quarter_label,
    YEAR AS Year,
    LTRIM(RTRIM(COUNTRY)) AS Country,
    LTRIM(RTRIM(REGION)) AS Region,
    FINAL_BASCO_APPROVAL AS Final_Basco_Approval
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_HELPDESK_MASTER_MERGE] WITH (NOLOCK)
WHERE YEAR = 2026
  AND CHILD_ACCOUNT IS NOT NULL
  AND LTRIM(RTRIM(CHILD_ACCOUNT))
      NOT IN ('Unknown', 'Unmapped', 'None', '', 'NA', 'Intel Creative', 'Red Baron')
"""

OVERVIEW_HIST_QUERY = """
SELECT
    YEAR,
    QUARTER,
    CONCAT(QUARTER, ' ', YEAR) AS quarter_label,
    REGION AS Region,
    Country,
    Retailer,
    CHILD_ACCOUNT AS Child_Account,
    PARENT_ACCOUNT_V2 AS Parent_Account,
    MD_Tag,
    BASCO_SCORE
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_Raw_HIST_FINAL] WITH (NOLOCK)
"""

OVERVIEW_HOSTED_QUERY = """
SELECT
    H.MD_TAG AS MD_Tag,
    H.Year AS Year,
    H.Quarter AS Quarter,
    CONCAT(H.Quarter, ' ', H.Year) AS quarter_label,
    H.Offer_Flag,
    H.CTA_Flag,
    ISNULL(H.Layout, 'Unknown') AS Layout_Category,
    ISNULL(H.Intel_Visual_Usage, 'None') AS Intel_Visual_Usage,
    ISNULL(H.Intel_Visual_Flag, 'No') AS Intel_Visual_Flag,
    H.Image_URL AS Image_URL,
    R.REGION AS Region,
    R.Country AS Country,
    R.CHILD_ACCOUNT AS Child_Account,
    R.Retailer AS Retailer
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_HOSTED_MetadataAnalysis] H WITH (NOLOCK)
LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_Raw_HIST_FINAL] R WITH (NOLOCK)
    ON H.MD_TAG = R.MD_Tag
   AND H.Year = R.YEAR
   AND H.Quarter = R.QUARTER
WHERE H.Image_URL IS NOT NULL
"""

OVERVIEW_FEEDBACK_QUERY = """
SELECT DISTINCT
    A.YEAR AS Year,
    A.QUARTER AS Quarter,
    CONCAT(A.QUARTER, ' ', A.YEAR) AS quarter_label,
    A.Creative,
    A.Reason,
    C.FEEDBACK AS CAT,
    D.FEEDBACK AS ELEMENT_CAT,
    R.REGION AS Region,
    R.Country AS Country,
    R.CHILD_ACCOUNT AS Child_Account,
    R.Retailer AS Retailer
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_TAGS_FEEDBACK_Q12024] A WITH (NOLOCK)
LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_FEEDBACK_MASTER_HD_POP_OLD] C WITH (NOLOCK)
    ON A.Reason = C.Reason
LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_FEEDBACK_MASTER_BE_OLD] D WITH (NOLOCK)
    ON A.Reason = D.Reason
LEFT JOIN [BASCO_WAREHOUSE_2024].[dbo].[BASCO_POP_Raw_HIST_FINAL] R WITH (NOLOCK)
    ON A.Creative = R.MD_Tag
   AND A.YEAR = R.YEAR
   AND A.QUARTER = R.QUARTER
WHERE A.Reason IS NOT NULL
  AND A.Reason NOT LIKE '%evaluated%'
"""
