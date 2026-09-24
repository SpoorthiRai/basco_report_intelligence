"""GET /api/reports/overview/ — precomputed Overview KPIs."""

from datetime import date
import re

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.db import get_warehouse_connection
from .permissions import IsAnyReportingRole
from .queries import LEAGUE_TABLE_QUERY, MARKET_MATURITY_QUERY
from .visual_adoption_queries import VISUAL_ADOPTION_MAIN_QUERY
from .views import (
    apply_user_scope,
    enrich_league_rows,
    _rows_to_dicts,
    normalize_quarter_label,
    sort_quarters_desc,
    build_cascading_filter_options,
)
from .kpi import (
    compute_league_kpis,
    compute_market_kpis,
    compute_pop_execution_gaps,
    compute_helpdesk_kpis,
    compute_creative_effectiveness,
    compute_promotion_led,
    compute_intel_visual_adoption,
    compute_top_compliance_issue_element_cat,
    compute_creatives_at_risk_hist,
)
from .offer_cta_queries import OFFER_CTA_QUERY
from .cta_campaign_queries import CTA_CAMPAIGN_QUERY
from .overview_queries import (
    OVERVIEW_FEEDBACK_QUERY,
    OVERVIEW_HELPDESK_MASTER_QUERY,
    OVERVIEW_HIST_QUERY,
    OVERVIEW_HOSTED_QUERY,
)


def _is_all_period(value: str) -> bool:
    return (value or "").strip() in ("", "All", "All Quarters")


OVERVIEW_ALL_QUARTERS_MIN_YEAR = 2026


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


def _row_quarter_year(row: dict) -> int | None:
    """Year from row Year/year fields or from a quarter label like 'Q2 2026'."""
    for key in ("Year", "year", "YEAR"):
        raw = row.get(key)
        if raw in (None, ""):
            continue
        try:
            return int(raw)
        except (TypeError, ValueError):
            pass
    label = _row_quarter_label(row)
    match = re.search(r"(20\d{2})", label or "")
    if match:
        return int(match.group(1))
    return None


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
    else:
        # All Quarters on Overview = 2026 onwards only
        filtered = []
        for r in out:
            year = _row_quarter_year(r)
            if year is None or year >= OVERVIEW_ALL_QUARTERS_MIN_YEAR:
                filtered.append(r)
        out = filtered
    return out


def _latest_quarter(rows) -> str:
    found = {_row_quarter_label(row) for row in rows if _row_quarter_label(row)}
    ordered = sort_quarters_desc(found)
    return ordered[0] if ordered else ""


def _latest_pop_quarter(league_rows) -> str:
    return _latest_quarter(league_rows) or current_quarter_label()


def _dataset_has_quarter(rows, quarter: str) -> bool:
    wanted = normalize_quarter_label(quarter).upper()
    if not wanted:
        return False
    return any(_row_quarter_label(row).upper() == wanted for row in rows)


def _effective_quarter(rows, selected: str, use_fallback: bool) -> str:
    """When viewing the current calendar quarter, use latest present in this dataset if selected is missing."""
    if _is_all_period(selected):
        return selected
    if use_fallback and not _dataset_has_quarter(rows, selected):
        return _latest_quarter(rows) or selected
    return selected


def _ensure_quarter_option(options: dict, quarter: str) -> None:
    label = normalize_quarter_label(quarter)
    if not label:
        return
    quarters = list(options.get("quarters") or [])
    if label in quarters:
        return
    rest = [q for q in quarters if q not in ("All Quarters", "All", "")]
    options["quarters"] = ["All Quarters"] + sort_quarters_desc(set(rest + [label]))


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
        year = _row_quarter_year(r)
        if year is not None and year < OVERVIEW_ALL_QUARTERS_MIN_YEAR:
            continue
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
                apply_user_scope(
                    _rows_to_dicts(cursor),
                    request.user,
                    retailer_key="child_account",
                )
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

            cursor.execute(OVERVIEW_HIST_QUERY)
            hist_rows = apply_user_scope(
                _rows_to_dicts(cursor),
                request.user,
                country_key="Country",
                region_key="Region",
                retailer_key="Child_Account",
            )

            cursor.execute(OVERVIEW_HOSTED_QUERY)
            hosted_rows = apply_user_scope(
                _rows_to_dicts(cursor),
                request.user,
                country_key="Country",
                region_key="Region",
                retailer_key="Child_Account",
            )

            cursor.execute(OVERVIEW_FEEDBACK_QUERY)
            feedback_rows = apply_user_scope(
                _rows_to_dicts(cursor),
                request.user,
                country_key="Country",
                region_key="Region",
                retailer_key="Child_Account",
            )

            cursor.execute(OVERVIEW_HELPDESK_MASTER_QUERY)
            helpdesk_rows = apply_user_scope(
                _rows_to_dicts(cursor),
                request.user,
                country_key="Country",
                region_key="Region",
                retailer_key="Child_Account",
            )
        except Exception as e:
            return Response({"detail": "Database error.", "error": str(e)}, status=500)
        finally:
            if conn:
                conn.close()

        calendar_quarter = current_quarter_label()
        latest_pop_quarter = _latest_pop_quarter(league_rows)
        latest_helpdesk_quarter = _latest_quarter(helpdesk_rows) or calendar_quarter
        quarter = requested_quarter or calendar_quarter
        is_current = (
            not _is_all_period(quarter)
            and normalize_quarter_label(quarter) == calendar_quarter
        )

        cascade_rows = league_rows + visual_rows + market_rows + offer_rows + cta_rows + helpdesk_rows
        filter_options = build_cascading_filter_options(
            cascade_rows,
            selected_quarter=quarter,
            selected_region=region,
            quarter_keys=("quarter", "period", "quarter_label"),
            region_keys=("region", "Region"),
            country_keys=("country", "Country"),
            include_retailers=False,
            region_all="All",
        )
        _ensure_quarter_option(filter_options, calendar_quarter)
        filter_options["default_quarter"] = calendar_quarter

        pop_q = _effective_quarter(league_rows, quarter, is_current)
        hist_q = _effective_quarter(hist_rows, quarter, is_current)
        hosted_q = _effective_quarter(hosted_rows, quarter, is_current)
        feedback_q = _effective_quarter(feedback_rows, quarter, is_current)
        market_q = _effective_quarter(market_rows, quarter, is_current)
        offer_q = _effective_quarter(offer_rows, quarter, is_current)
        cta_q = _effective_quarter(cta_rows, quarter, is_current)
        visual_q = _effective_quarter(visual_rows, quarter, is_current)
        helpdesk_q = _effective_quarter(helpdesk_rows, quarter, is_current)

        league_f = _apply_overview_filters(league_rows, pop_q, region)
        visual_f = _apply_overview_filters(visual_rows, visual_q, region)
        market_f = _apply_overview_filters(market_rows, market_q, region)
        offer_f = _apply_overview_filters(offer_rows, offer_q, region)
        cta_f = _apply_overview_filters(cta_rows, cta_q, region)
        hist_f = _apply_overview_filters(hist_rows, hist_q, region)
        hosted_f = _apply_overview_filters(hosted_rows, hosted_q, region)
        feedback_f = _apply_overview_filters(feedback_rows, feedback_q, region)
        helpdesk_f = _apply_overview_filters(helpdesk_rows, helpdesk_q, region)
        league_history = _apply_overview_filters(league_rows, "All Quarters", region)
        helpdesk_history = _apply_overview_filters(helpdesk_rows, "All Quarters", region)
        if _is_all_period(quarter):
            pop_compare = latest_pop_quarter
            hd_compare = latest_helpdesk_quarter
        else:
            pop_compare = normalize_quarter_label(pop_q)
            hd_compare = normalize_quarter_label(helpdesk_q)

        retailer_kpis = compute_league_kpis(league_f)
        market_kpis = compute_market_kpis(_aggregate_market(market_f, "All Quarters"))
        execution_gaps = compute_pop_execution_gaps(hist_f, hosted_f, feedback_f)
        at_risk = compute_creatives_at_risk_hist(hist_f)
        top_compliance_issue = compute_top_compliance_issue_element_cat(feedback_f)
        helpdesk = compute_helpdesk_kpis(
            league_f,
            visual_f,
            helpdesk_f,
            league_history=league_history,
            helpdesk_history=helpdesk_history,
            compare_quarter=pop_compare,
            pop_quarter=pop_compare,
            helpdesk_quarter=hd_compare,
        )
        creative_effectiveness = compute_creative_effectiveness(cta_f)
        promotion_led = compute_promotion_led(offer_f)
        intel_visual = compute_intel_visual_adoption(visual_f, hosted_f)

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
                    "count": at_risk["count"],
                    "total": at_risk["total"],
                },
                "retailers_below_target": {
                    "count": retailer_kpis["retailers_below_target"],
                    "top_accounts": retailer_kpis["below_target_top_accounts"],
                },
                "top_compliance_issue": top_compliance_issue,
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
