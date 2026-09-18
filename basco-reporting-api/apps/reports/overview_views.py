"""GET /api/reports/overview/ — precomputed Overview KPIs."""

from datetime import date

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.db import get_warehouse_connection
from .permissions import IsAnyReportingRole
from .queries import LEAGUE_TABLE_QUERY, MARKET_MATURITY_QUERY
from .visual_adoption_queries import VISUAL_ADOPTION_MAIN_QUERY
from .visual_adoption_views import (
    is_any_intel_layout,
    is_custom_intel_layout,
    is_intel_layout_only,
)
from .views import (
    apply_user_scope,
    enrich_league_rows,
    _rows_to_dicts,
    normalize_quarter_label,
    sort_quarters_desc,
)
from .kpi import (
    compute_league_kpis,
    compute_market_kpis,
    compute_visual_kpis,
    compute_execution_gaps,
    compute_helpdesk_kpis,
    compute_creative_effectiveness,
    compute_promotion_led,
    compute_pop_pms_adoption,
    compute_intel_visual_adoption,
)
from .offer_cta_queries import OFFER_CTA_QUERY
from .cta_campaign_queries import CTA_CAMPAIGN_QUERY


def _is_all_period(value: str) -> bool:
    return (value or "").strip() in ("", "All", "All Quarters")


def current_quarter_label(today=None) -> str:
    day = today or date.today()
    quarter = (day.month - 1) // 3 + 1
    return f"Q{quarter} {day.year}"


def _is_all_region(value: str) -> bool:
    return (value or "").strip() in ("", "All", "All Regions")


def _row_quarter_label(row: dict) -> str:
    return normalize_quarter_label(
        row.get("quarter") or row.get("period") or row.get("quarter_label")
    )


def _row_region_label(row: dict) -> str:
    return str(row.get("region") or row.get("Region") or "").strip()


def _apply_overview_filters(rows, quarter: str, region: str):
    out = rows
    if not _is_all_region(region):
        wanted = region.strip().upper()
        out = [r for r in out if _row_region_label(r).upper() == wanted]
    if not _is_all_period(quarter):
        wanted = normalize_quarter_label(quarter).upper()
        out = [r for r in out if _row_quarter_label(r).upper() == wanted]
    return out


def _latest_pop_quarter(league_rows) -> str:
    found = {_row_quarter_label(row) for row in league_rows if _row_quarter_label(row)}
    ordered = sort_quarters_desc(found)
    return ordered[0] if ordered else current_quarter_label()


def _collect_quarters(*row_sets):
    found = set()
    for rows in row_sets:
        for row in rows:
            label = _row_quarter_label(row)
            if label:
                found.add(label)
    return ["All Quarters"] + sort_quarters_desc(found)


def _collect_regions(*row_sets):
    found = set()
    skip = {"", "Unknown", "None", "Unmapped", "NA"}
    for rows in row_sets:
        for row in rows:
            name = _row_region_label(row)
            if name and name not in skip:
                found.add(name)
    return ["All"] + sorted(found)


def _aggregate_market(raw_rows, quarter: str):
    if not _is_all_period(quarter):
        return [
            {
                "country": r.get("country"),
                "region": r.get("region"),
                "total_jobs": r.get("total_jobs") or 0,
                "avg_basco_score": float(r.get("avg_basco_score") or 0),
            }
            for r in raw_rows
            if r.get("quarter_label") == quarter
        ]

    agg = {}
    for r in raw_rows:
        key = (r.get("country"), r.get("region"))
        if key not in agg:
            agg[key] = {
                "country": r.get("country"),
                "region": r.get("region"),
                "total_jobs": 0,
                "weighted_score": 0.0,
            }
        jobs = r.get("total_jobs") or 0
        score = float(r.get("avg_basco_score") or 0)
        agg[key]["total_jobs"] += jobs
        agg[key]["weighted_score"] += score * jobs

    out = []
    for item in agg.values():
        jobs = item["total_jobs"]
        out.append({
            "country": item["country"],
            "region": item["region"],
            "total_jobs": jobs,
            "avg_basco_score": round(item["weighted_score"] / jobs, 1) if jobs else 0.0,
        })
    return out


class OverviewView(APIView):
    permission_classes = [IsAuthenticated, IsAnyReportingRole]

    def get(self, request):
        region = (request.query_params.get("region") or "All").strip()
        requested_quarter = (request.query_params.get("quarter") or "").strip()
        conn = None
        try:
            conn = get_warehouse_connection()
            cursor = conn.cursor()

            cursor.execute(LEAGUE_TABLE_QUERY)
            league_rows = enrich_league_rows(
                apply_user_scope(_rows_to_dicts(cursor), request.user)
            )

            cursor.execute(VISUAL_ADOPTION_MAIN_QUERY)
            visual_rows = apply_user_scope(
                _rows_to_dicts(cursor),
                request.user,
                country_key="Country",
                region_key="Region",
                retailer_key="Retailer",
            )

            cursor.execute(MARKET_MATURITY_QUERY)
            market_rows = apply_user_scope(
                _rows_to_dicts(cursor),
                request.user,
                country_key="country",
                region_key="region",
            )

            cursor.execute(OFFER_CTA_QUERY)
            offer_rows = apply_user_scope(
                _rows_to_dicts(cursor),
                request.user,
                country_key="Country",
                region_key="Region",
                retailer_key="Retailer",
            )

            cursor.execute(CTA_CAMPAIGN_QUERY)
            cta_rows = apply_user_scope(
                _rows_to_dicts(cursor),
                request.user,
                country_key="Country",
                region_key="Region",
                retailer_key="Retailer",
            )
        except Exception as e:
            return Response({"detail": "Database error.", "error": str(e)}, status=500)
        finally:
            if conn:
                conn.close()

        latest_pop_quarter = _latest_pop_quarter(league_rows)
        quarter = requested_quarter or latest_pop_quarter

        filter_options = {
            "quarters": _collect_quarters(
                league_rows, visual_rows, market_rows, offer_rows, cta_rows
            ),
            "regions": _collect_regions(
                league_rows, visual_rows, market_rows, offer_rows, cta_rows
            ),
            "default_quarter": latest_pop_quarter,
        }

        league_f = _apply_overview_filters(league_rows, quarter, region)
        visual_f = _apply_overview_filters(visual_rows, quarter, region)
        market_f = _apply_overview_filters(market_rows, quarter, region)
        offer_f = _apply_overview_filters(offer_rows, quarter, region)
        cta_f = _apply_overview_filters(cta_rows, quarter, region)

        retailer_kpis = compute_league_kpis(league_f)

        total_creatives = sum(r.get("creative_count", 1) for r in visual_f)
        intel_only = sum(
            r.get("creative_count", 1)
            for r in visual_f
            if is_intel_layout_only(r.get("Layout_Category"))
        )
        custom = sum(
            r.get("creative_count", 1)
            for r in visual_f
            if is_custom_intel_layout(r.get("Layout_Category"))
        )
        intel_any = sum(
            r.get("creative_count", 1)
            for r in visual_f
            if is_any_intel_layout(r.get("Layout_Category"), r.get("Intel_Visual_Flag"))
        )
        visual_kpis = compute_visual_kpis(total_creatives, intel_only, custom, intel_any)
        market_kpis = compute_market_kpis(_aggregate_market(market_f, "All Quarters"))
        execution_gaps = compute_execution_gaps(league_f)
        execution_gaps["promo_without_cta"] = len([
            r for r in offer_f
            if r.get("Offer_Flag") == "Yes" and r.get("CTA_Flag") == "No"
        ])
        helpdesk = compute_helpdesk_kpis(league_f, visual_f)
        creative_effectiveness = compute_creative_effectiveness(cta_f)
        promotion_led = compute_promotion_led(offer_f)
        intel_visual = compute_intel_visual_adoption(
            visual_f,
            compute_pop_pms_adoption(league_f),
        )

        return Response({
            "quarter": quarter,
            "region": region,
            "filter_options": filter_options,
            "cards": {
                "basco_score": {
                    "value": retailer_kpis["avg_basco"],
                    "delta_pts": retailer_kpis["basco_delta_pts"],
                },
                "creatives_at_risk": {
                    "count": visual_kpis["creatives_at_risk"],
                    "total": visual_kpis["total_creatives"],
                },
                "retailers_below_target": {
                    "count": retailer_kpis["retailers_below_target"],
                    "top_accounts": retailer_kpis["below_target_top_accounts"],
                },
                "top_compliance_issue": retailer_kpis["top_compliance_issue"],
                "fmv_loss": {
                    "value": retailer_kpis["fmv_loss"],
                    "retailer_count": retailer_kpis["total_retailers"],
                },
                "fmv_protected": {
                    "value": retailer_kpis["fmv_protected"],
                    "retailer_count": retailer_kpis["total_retailers"],
                },
            },
            "modules": {
                "market_maturity": market_kpis,
                "market_coverage": {
                    "retailers_monitored": retailer_kpis["total_retailers"],
                    "basco_score": retailer_kpis["avg_basco"],
                    "creatives_evaluated": retailer_kpis["creatives_evaluated"],
                    "fmv_loss": retailer_kpis["fmv_loss"],
                    "retailer_health": retailer_kpis["retailer_health"],
                },
                "execution_gaps": execution_gaps,
                "retailer": retailer_kpis,
                "helpdesk": helpdesk,
                "creative_effectiveness": creative_effectiveness,
                "promotion_led": promotion_led,
                "visual_adoption": intel_visual,
            },
        })
