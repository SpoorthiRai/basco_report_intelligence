import re

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.db import get_warehouse_connection
from .permissions import IsAnyReportingRole
from .evidence_queries import (
    EVIDENCE_CREATIVES_QUERY,
    EVIDENCE_FEEDBACK_QUERY,
    EVIDENCE_QUARTER_OPTIONS_QUERY,
)
from .views import _rows_to_dicts, apply_user_scope, sort_quarters_desc


PRODUCT_FAMILIES = [
    "All Products",
    "Gaming",
    "Gaming Core Ultra",
    "Intel Core Ultra",
    "Intel Core Processors",
    "Intel Evo",
    "Intel Evo Edition",
    "Intel Graphics",
    "Other / General",
]


def extract_product_families(content_str: str) -> list:
    if not content_str or content_str in ("None", "", "NA", "Unknown"):
        return ["Other / General"]
    fams = []
    s = content_str.lower()
    has_gaming = "gaming" in s or "gamer" in s
    has_core_ultra = "core ultra" in s
    if has_gaming and has_core_ultra:
        fams.append("Gaming Core Ultra")
    elif has_gaming:
        fams.append("Gaming")
    elif has_core_ultra:
        fams.append("Intel Core Ultra")
    if "core processor" in s or "intel processor" in s or "processors" in s:
        fams.append("Intel Core Processors")
    if "evo edition" in s:
        fams.append("Intel Evo Edition")
    elif "evo" in s:
        fams.append("Intel Evo")
    if "arc" in s or "iris" in s or "graphic" in s:
        fams.append("Intel Graphics")
    if not fams:
        fams.append("Other / General")
    return fams


def _parse_quarter(quarter_str: str):
    if not quarter_str or quarter_str.strip() in ("All", "All Quarters"):
        return None, None
    m = re.match(r"Q(\d)\s+(\d{4})", quarter_str.strip(), re.I)
    if m:
        return f"Q{m.group(1)}", int(m.group(2))
    return None, None


def _norm_tag(value) -> str:
    return str(value or "").strip().lower()


def _to_brand_pct(raw) -> float | None:
    """BRAND_SCORE from HIST as-is, shown as percent (value * 100)."""
    if raw in (None, ""):
        return None
    try:
        return round(float(raw) * 100.0, 1)
    except (TypeError, ValueError):
        return None


def _feedback_missing(value) -> bool:
    text = str(value or "").strip().lower()
    return text in ("", "none", "null", "na", "n/a")


def _attach_feedback(rows: list[dict], feedback_rows: list[dict]) -> None:
    grouped: dict[tuple, dict] = {}
    for row in feedback_rows:
        key = (_norm_tag(row.get("Creative")), str(row.get("Year") or ""), str(row.get("Quarter") or "").strip())
        item = grouped.setdefault(key, {"reasons": [], "cats": [], "seen_reason": set(), "seen_cat": set()})
        element = str(row.get("Element") or "").strip()
        reason_raw = str(row.get("Reason") or "").strip()
        reason_missing = reason_raw.lower() in ("", "none", "null", "na", "n/a")
        reason = element if reason_missing else reason_raw
        cat = element if reason_missing else str(row.get("CAT") or "").strip()
        if reason and reason not in item["seen_reason"]:
            item["seen_reason"].add(reason)
            item["reasons"].append(reason)
        if cat and cat not in item["seen_cat"] and not _feedback_missing(cat):
            item["seen_cat"].add(cat)
            item["cats"].append(cat)

    for row in rows:
        key = (_norm_tag(row.get("MD_Tag")), str(row.get("Year") or ""), str(row.get("Quarter") or "").strip())
        fb = grouped.get(key, {"reasons": [], "cats": []})
        row["FeedbackType"] = " | ".join(fb["cats"]) if fb["cats"] else ""
        row["Reason"] = " | ".join(fb["reasons"]) if fb["reasons"] else ""


def _apply_perfect_score_feedback_default(rows: list[dict]) -> None:
    """Perfect brand score (1 / 100%) with no feedback → Creative Looks Good."""
    for row in rows:
        score = row.get("brand_score")
        if score is None:
            continue
        try:
            pct = float(score)
        except (TypeError, ValueError):
            continue
        if pct < 100:
            continue
        if _feedback_missing(row.get("FeedbackType")):
            row["FeedbackType"] = "Creative Looks Good"


class EvidenceLockerView(APIView):
    permission_classes = [IsAuthenticated, IsAnyReportingRole]

    def get(self, request):
        product_filter = request.query_params.get("product", None)
        country_filter = request.query_params.get("country", None)
        region_filter = request.query_params.get("region", None)
        quarter_filter = request.query_params.get("quarter", None)
        quarter_code, year = _parse_quarter(quarter_filter)

        conn = None
        try:
            conn = get_warehouse_connection()
            cursor = conn.cursor()
            cursor.execute(EVIDENCE_CREATIVES_QUERY)
            raw_rows = _rows_to_dicts(cursor)
            cursor.execute(EVIDENCE_QUARTER_OPTIONS_QUERY)
            quarter_option_rows = _rows_to_dicts(cursor)
            cursor.execute(EVIDENCE_FEEDBACK_QUERY)
            feedback_rows = _rows_to_dicts(cursor)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
        finally:
            if conn:
                conn.close()

        raw_rows = apply_user_scope(
            raw_rows,
            request.user,
            country_key="Country",
            region_key="Region",
            retailer_key="Child_Account",
        )

        if quarter_code:
            raw_rows = [
                r for r in raw_rows
                if str(r.get("Quarter") or "").strip().upper() == quarter_code.upper()
                and (year is None or int(r.get("Year") or 0) == year)
            ]
            feedback_rows = [
                r for r in feedback_rows
                if str(r.get("Quarter") or "").strip().upper() == quarter_code.upper()
                and (year is None or int(r.get("Year") or 0) == year)
            ]

        _attach_feedback(raw_rows, feedback_rows)

        for r in raw_rows:
            r["product_families"] = extract_product_families(r.get("Content") or "")
            raw_score = r.get("BRAND_SCORE")
            r["brand_score"] = _to_brand_pct(raw_score)
        _apply_perfect_score_feedback_default(raw_rows)

        countries = sorted({
            r["Country"] for r in raw_rows
            if r.get("Country") and r["Country"] not in ("None", "", None)
        })
        regions = sorted({
            r["Region"] for r in raw_rows
            if r.get("Region") and str(r.get("Region")).strip() not in ("None", "", "Unknown")
        })
        quarters = sort_quarters_desc({
            r.get("quarter_label") for r in quarter_option_rows
            if r.get("quarter_label")
        })

        rows = raw_rows
        if product_filter and product_filter not in ("All", "All Products"):
            rows = [r for r in rows if product_filter in r.get("product_families", [])]
        if region_filter and region_filter not in ("All", "All Regions"):
            rows = [r for r in rows if str(r.get("Region") or "").strip().upper() == region_filter.strip().upper()]
        if country_filter and country_filter not in ("All", "All Countries"):
            rows = [r for r in rows if r.get("Country") == country_filter]

        total = len(rows)
        return Response({
            "quarter": quarter_filter if quarter_filter else "All Quarters",
            "summary": {
                "total": total,
            },
            "filter_options": {
                "quarters": ["All Quarters"] + quarters,
                "products": PRODUCT_FAMILIES,
                "regions": ["All Regions"] + regions,
                "countries": ["All Countries"] + countries,
            },
            "creatives": rows,
        })
