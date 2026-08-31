def build_evidence_locker_query(year: int = 2026, quarter_num: int = None) -> str:
    """
    Build the Evidence Locker SQL query using [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata].
    Defaults to 2026 data.
    """
    target_year = int(year) if year else 2026
    where_clauses = [
        f"YEAR(SEND_DATE) = {target_year}",
        "ASSET_URL IS NOT NULL"
    ]
    if quarter_num:
        where_clauses.append(f"(QUARTER LIKE 'Q{int(quarter_num)}%' OR DATEPART(QUARTER, SEND_DATE) = {int(quarter_num)})")

    where_sql = " AND ".join(where_clauses)

    return f"""
SELECT
    ANALYSIS_ID AS Analysis_ID,
    ASSET_URL AS Asset_URL,
    'Compliant' AS compliance_status,
    SENDER_ID AS sender_email,
    COUNTRY AS Country,
    REGION AS Region,
    PARENT_ACCOUNT AS Parent_Account,
    SUBJECT_LINE AS Subject,
    SEND_DATE AS Received_Time,
    REPLACE(QUARTER, '-', ' ') AS quarter_label,
    ISNULL(CAMPAIGN_TYPE, 'Unknown') AS Campaign_Type,
    ISNULL(CAMPAIGN_NAME, 'Unknown') AS Campaign_Name,
    ISNULL(LAYOUT_CATEGORY, 'Unknown') AS Layout,
    ISNULL(CONTENT, 'Unknown') AS Content,
    ISNULL(OEM_PRESENCE_FLAG, 'No') AS OEM_Flag,
    ISNULL(OEM_NAMES, 'None') AS OEM_Values,
    ISNULL(INTEL_VISUAL_FLAG, 'No') AS Intel_Visual_Flag,
    ISNULL(VISUAL_CONTENT_NAME, 'None') AS Visual_Content_Name,
    ISNULL(AI_MESSAGING_FLAG, 'No') AS AI_Messaging,
    ISNULL(INSIDE_MESSAGING_FLAG, 'No') AS Inside_Messaging,
    ISNULL(OFFER_FLAG, 'No') AS Offer_Flag,
    ISNULL(CTA_FLAG, 'No') AS CTA_Flag,
    ISNULL(OBJECTIVE, 'Unknown') AS Objective
FROM [BASCO_WAREHOUSE_2024].[dbo].[BASCO_AIHD_Metadata] WITH (NOLOCK)
WHERE {where_sql}
ORDER BY SEND_DATE DESC, ANALYSIS_ID DESC
"""
