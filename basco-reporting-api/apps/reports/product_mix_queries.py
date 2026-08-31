PRODUCT_MIX_QUERY = """
SELECT
    THREAD_ID AS Email_Thread_ID,
    CONTENT AS Content,
    PRODUCT AS Product,
    GEN AS Gen,
    PARENT_ACCOUNT AS Retailer,
    COUNTRY AS Country,
    REGION AS Region,
    REPLACE(QUARTER, '-', ' ') AS quarter_label
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
WHERE CONTENT IS NOT NULL
  AND CONTENT NOT IN ('None', '', 'NA')
"""
