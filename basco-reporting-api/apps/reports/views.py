"""JWT-protected reporting endpoints against the BASCO warehouse.

Shared helpers (apply_user_scope, quarter sorting) live here; page-specific
views live in their own modules and import these helpers.
"""

import pyodbc
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from core.db import get_warehouse_connection
from apps.accounts.models import User

from .permissions import IsAnyReportingRole
from .kpi import (
    attach_country_helpdesk,
    attach_helpdesk_usage,
    compute_league_kpis,
    compute_market_kpis,
    drop_skipped_retailer_rows,
    group_parent_accounts,
    normalize_parent,
    region_thresholds_for_period,
)
from .queries import (
    HELPDESK_MASTER_MERGE_PARENT_USAGE_QUERY,
    LEAGUE_TABLE_QUERY,
    MARKET_MATURITY_QUERY,
    POP_PARENT_COUNTRY_QUERY,
    REGION_ATTR_LOSS_THRESHOLD_QUERY,
)

# ---------------------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------------------

_DB_ERROR_RESPONSE = {"detail": "Database error. Please try again later."}


import re


def sort_quarters_desc(quarters) -> list[str]:
    """Sort a collection of quarter strings like 'Q3 2026' descending by year and quarter."""
    def parse_q(q):
        m = re.search(r'Q(\d)\s*(\d{4})', str(q))
        if m:
            return (int(m.group(2)), int(m.group(1)))
        return (0, 0)
    return sorted(quarters, key=parse_q, reverse=True)


def apply_user_scope(rows, user, country_key="country", region_key="region", retailer_key="retailer"):
    """
    Applies role-based and regional scoping to reporting rows:
    - RSM: filtered to user.retailer_ids
    - RMM:
        - If user.region is set (e.g. 'EMEA'): filtered to user.region
        - If user.country is set (e.g. 'India'): filtered to user.country
    - ADMIN: unfiltered
    """
    extra = (retailer_key,) if retailer_key else ()

    def _finish(result):
        return drop_skipped_retailer_rows(result, extra_keys=extra)

    if not user or not user.is_authenticated:
        return _finish(rows)

    if user.role == User.Role.RSM:
        allowed_raw = {str(v).strip() for v in (user.retailer_ids or []) if str(v).strip()}
        allowed_norm = {normalize_parent(v) for v in allowed_raw if normalize_parent(v)}
        account_keys = (
            retailer_key,
            "retailer",
            "Retailer",
            "child_account",
            "Child_Account",
            "parent_account",
            "Parent_Account",
        )

        def _in_rsm_scope(row: dict) -> bool:
            if row.get("clean_email") in allowed_raw or row.get("sender_email") in allowed_raw:
                return True
            for key in account_keys:
                text = str(row.get(key) or "").strip()
                if not text:
                    continue
                if text in allowed_raw:
                    return True
                norm = normalize_parent(text)
                if not norm:
                    continue
                if norm in allowed_norm:
                    return True
                if any(norm.startswith(a + " ") or a.startswith(norm + " ") for a in allowed_norm):
                    return True
            return False

        return _finish([r for r in rows if _in_rsm_scope(r)])

    if user.role == User.Role.RMM:
        user_region = (getattr(user, "region", "") or "").strip().upper()
        user_country = (getattr(user, "country", "") or "").strip().lower()

        scoped = rows
        if user_region:
            scoped = [
                r for r in scoped
                if (r.get(region_key) or r.get("region") or r.get("Region") or "").strip().upper() == user_region
            ]
        if user_country:
            scoped = [
                r for r in scoped
                if (r.get(country_key) or r.get("country") or r.get("Country") or "").strip().lower() == user_country
            ]
        return _finish(scoped)

    return _finish(rows)


def _rows_to_dicts(cursor) -> list[dict]:
    """Convert a cursor result set to a list of plain dicts."""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def normalize_quarter_label(value, year=None) -> str:
    """Canonical 'Q3 2026' from warehouse variants like 'Q3-2026' or 'Q3 2026 2026'."""
    text = str(value or "").strip().replace("-", " ").replace("_", " ")
    text = re.sub(r"\s+", " ", text)
    match = re.search(r"Q\s*([1-4])(?:\D+(\d{4}))?", text, re.I)
    if not match:
        return text
    quarter_num = match.group(1)
    year_part = match.group(2) or (str(year) if year else "")
    if year_part:
        return f"Q{quarter_num} {year_part}"
    return f"Q{quarter_num}"


def enrich_league_rows(rows: list[dict]) -> list[dict]:
    """Attach integer money fields, prev_basco, and trend on retailer rows."""
    for r in rows:
        label = normalize_quarter_label(r.get("quarter") or r.get("period"), r.get("year"))
        r["quarter"] = label
        r["period"] = label

    retailer_quarter_map = {}
    for r in rows:
        retailer_quarter_map[(r.get("retailer"), r.get("quarter"))] = r.get("basco")

    for r in rows:
        r["fmv"] = int(r.get("fmv") or 0)
        r["attr_loss"] = int(r.get("attr_loss") or 0)
        r["attr_gain"] = int(r.get("attr_gain") or 0)

        q_str = r.get("quarter") or ""
        if "Q3" in q_str:
            prev_q = q_str.replace("Q3", "Q2")
        elif "Q2" in q_str:
            prev_q = q_str.replace("Q2", "Q1")
        else:
            prev_q = None

        prev_score = retailer_quarter_map.get((r.get("retailer"), prev_q)) if prev_q else None
        r["prev_basco"] = prev_score
        if prev_score is None:
            r["trend"] = "NEW"
        elif r.get("basco") is not None and r["basco"] > prev_score:
            r["trend"] = "UP"
        elif r.get("basco") is not None and r["basco"] < prev_score:
            r["trend"] = "DOWN"
        else:
            r["trend"] = "FLAT"
    return rows


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------


class LeagueTableView(APIView):
    """
    GET /api/reports/league-table/

    Returns 2026 retailer performance metrics: retailer, country, region, queries, basco, violations, prev_basco, trend, fmv, attr_loss, topAccount.
    """

    permission_classes = [IsAuthenticated, IsAnyReportingRole]

    @extend_schema(
        summary="League table / Retailer Performance Overview",
        description="Returns 2026 retailer performance overview data with quarters and filter options.",
        tags=["Reports"],
    )
    def get(self, request: Request) -> Response:
        quarter_filter = request.query_params.get("quarter", "").strip()
        country_filter = request.query_params.get("country", "").strip()
        region_filter  = request.query_params.get("region", "").strip()

        conn = None
        try:
            conn = get_warehouse_connection()
            cursor = conn.cursor()
            cursor.execute(LEAGUE_TABLE_QUERY)
            rows = _rows_to_dicts(cursor)

            cursor.execute(HELPDESK_MASTER_MERGE_PARENT_USAGE_QUERY)
            helpdesk_rows = apply_user_scope(
                _rows_to_dicts(cursor),
                request.user,
                country_key="country",
                region_key="region",
                retailer_key="child_account",
            )

            cursor.execute(REGION_ATTR_LOSS_THRESHOLD_QUERY)
            region_thresholds = region_thresholds_for_period(
                _rows_to_dicts(cursor),
                quarter_filter,
            )

            # Role-based & regional scoping
            rows = apply_user_scope(rows, request.user, country_key='country', region_key='region', retailer_key='child_account')

            # Master options for 2026 based on scoped data
            all_quarters = sort_quarters_desc(list(set(r['quarter'] for r in rows if r.get('quarter'))))
            all_countries = sorted(list(set(r['country'] for r in rows if r.get('country') and r['country'] not in ('', 'Unknown', 'None'))))
            all_regions = sorted(list(set(r['region'] for r in rows if r.get('region') and r['region'] not in ('', 'Unknown', 'None'))))

            # Compute prev_basco and trend across quarters for each retailer
            rows = enrich_league_rows(rows)

            # Filter if query parameters provided
            filtered_rows = rows
            if quarter_filter and quarter_filter not in ('All', 'All Quarters'):
                filtered_rows = [r for r in filtered_rows if r.get('quarter') == quarter_filter]
            if country_filter and country_filter not in ('All', 'All Countries'):
                filtered_rows = [r for r in filtered_rows if r.get('country') == country_filter]
            if region_filter and region_filter != 'All':
                filtered_rows = [r for r in filtered_rows if r.get('region') == region_filter]

            helpdesk_filtered = helpdesk_rows
            if quarter_filter and quarter_filter not in ('All', 'All Quarters'):
                wanted = normalize_quarter_label(quarter_filter).upper()
                helpdesk_filtered = [
                    r for r in helpdesk_filtered
                    if normalize_quarter_label(r.get("quarter_label")).upper() == wanted
                ]
            # Parent-name join: do not require Helpdesk COUNTRY/REGION to match POP.
            # BASCO_HELPDESK_MASTER_MERGE often tags a parent in a different market.

            return Response({
                'data': filtered_rows,
                'kpis': compute_league_kpis(filtered_rows),
                'parent_accounts': attach_helpdesk_usage(
                    group_parent_accounts(filtered_rows, region_thresholds),
                    helpdesk_filtered,
                ),
                'region_thresholds': region_thresholds,
                'filter_options': {
                    'quarters': ['All Quarters'] + all_quarters,
                    'countries': ['All Countries'] + all_countries,
                    'regions': ['All'] + all_regions,
                }
            }, status=status.HTTP_200_OK)

        except pyodbc.Error as e:
            return Response({'error': str(e), 'detail': 'Database error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if conn:
                conn.close()


class MarketMaturityView(APIView):
    """
    GET /api/reports/market-maturity/

    Returns country-level market maturity data: country, region, total_jobs, avg_basco_score, total_violations, fmv, attr_loss.
    Supports optional `quarter` query parameter (e.g. `?quarter=Q2%202026`).
    """

    permission_classes = [IsAuthenticated, IsAnyReportingRole]

    @extend_schema(
        summary="Market maturity",
        description=(
            "Returns country-level market maturity data (BASCO score vs total violations vs FMV & Attribution Loss).\n\n"
            "Scoped to user role / region."
        ),
        responses={
            200: OpenApiResponse(description="Market maturity data list wrapped in 'data' key with filter options."),
            403: OpenApiResponse(description="Insufficient role."),
            500: OpenApiResponse(description="Database error."),
        },
        tags=["Reports"],
    )
    def get(self, request: Request) -> Response:
        conn = None
        try:
            conn = get_warehouse_connection()
            cursor = conn.cursor()
            cursor.execute(MARKET_MATURITY_QUERY)
            raw_rows = _rows_to_dicts(cursor)

            cursor.execute(HELPDESK_MASTER_MERGE_PARENT_USAGE_QUERY)
            helpdesk_rows = apply_user_scope(
                _rows_to_dicts(cursor),
                request.user,
                country_key="country",
                region_key="region",
                retailer_key="child_account",
            )

            cursor.execute(POP_PARENT_COUNTRY_QUERY)
            pop_parent_rows = apply_user_scope(
                _rows_to_dicts(cursor),
                request.user,
                country_key="country",
                region_key="region",
                retailer_key="child_account",
            )

            cursor.execute(REGION_ATTR_LOSS_THRESHOLD_QUERY)
            threshold_rows = _rows_to_dicts(cursor)

            # Apply user role & regional scoping
            raw_rows = apply_user_scope(raw_rows, request.user, country_key='country', region_key='region')

            quarter_param = request.query_params.get("quarter", "").strip()
            region_param = request.query_params.get("region", "").strip()
            all_quarters = sort_quarters_desc(list(set(r.get("quarter_label") for r in raw_rows if r.get("quarter_label"))))
            all_regions = sorted(list(set(
                r.get("region") for r in raw_rows
                if r.get("region") and r.get("region") not in ("", "Unknown", "None")
            )))

            if quarter_param and quarter_param not in ("All", "All Quarters"):
                # Filter by specific quarter
                matching_rows = [r for r in raw_rows if r.get("quarter_label") == quarter_param]
                country_rows = []
                for r in matching_rows:
                    fmv_raw = r.get("fmv")
                    country_rows.append({
                        "country": r.get("country"),
                        "region": r.get("region"),
                        "total_jobs": r.get("total_jobs") or 0,
                        "avg_basco_score": float(r.get("avg_basco_score") or 0.0),
                        "total_violations": int(r.get("total_violations") or 0),
                        "fmv": int(fmv_raw) if fmv_raw not in (None, "") else None,
                        "attr_loss": int(r.get("attr_loss") or 0),
                    })
            else:
                # Aggregate across all quarters
                agg_map = {}
                for r in raw_rows:
                    key = (r.get("country"), r.get("region"))
                    if key not in agg_map:
                        agg_map[key] = {
                            "country": r.get("country"),
                            "region": r.get("region"),
                            "total_jobs": 0,
                            "total_violations": 0,
                            "score_sum": 0.0,
                            "row_count": 0,
                            "fmv": None,
                            "attr_loss": 0,
                        }
                    item = agg_map[key]
                    jobs = r.get("total_jobs") or 0
                    violations = int(r.get("total_violations") or 0)

                    item["total_jobs"] += jobs
                    item["total_violations"] += violations
                    item["score_sum"] += float(r.get("score_sum") or 0)
                    item["row_count"] += int(r.get("row_count") or 0)
                    fmv_raw = r.get("fmv")
                    if fmv_raw not in (None, ""):
                        item["fmv"] = int(item["fmv"] or 0) + int(fmv_raw)
                    item["attr_loss"] += int(r.get("attr_loss") or 0)

                country_rows = []
                for (country, region), item in agg_map.items():
                    n = item["row_count"]
                    avg_score = round(item["score_sum"] / n * 100.0, 1) if n > 0 else 0.0

                    country_rows.append({
                        "country": country,
                        "region": region,
                        "total_jobs": item["total_jobs"],
                        "avg_basco_score": avg_score,
                        "total_violations": item["total_violations"],
                        "fmv": item["fmv"],
                        "attr_loss": item["attr_loss"],
                    })

            region_thresholds = region_thresholds_for_period(threshold_rows, quarter_param)

            if region_param and region_param not in ("All", "All Regions"):
                wanted = region_param.strip().upper()
                country_rows = [
                    r for r in country_rows
                    if str(r.get("region") or "").strip().upper() == wanted
                ]

            helpdesk_filtered = helpdesk_rows
            pop_filtered = pop_parent_rows
            if quarter_param and quarter_param not in ("All", "All Quarters"):
                wanted_q = normalize_quarter_label(quarter_param).upper()
                helpdesk_filtered = [
                    r for r in helpdesk_filtered
                    if normalize_quarter_label(r.get("quarter_label")).upper() == wanted_q
                ]
                pop_filtered = [
                    r for r in pop_filtered
                    if normalize_quarter_label(r.get("quarter_label")).upper() == wanted_q
                ]
            if region_param and region_param not in ("All", "All Regions"):
                wanted_r = region_param.strip().upper()
                # Keep all Helpdesk parent rows: merge-table region/country can
                # differ from POP (same parent in more than one market).
                pop_filtered = [
                    r for r in pop_filtered
                    if str(r.get("region") or "").strip().upper() == wanted_r
                ]

            attach_country_helpdesk(country_rows, helpdesk_filtered, pop_filtered)

            country_rows.sort(key=lambda x: x["avg_basco_score"])
            return Response(
                {
                    "data": country_rows,
                    "kpis": compute_market_kpis(country_rows),
                    "region_thresholds": region_thresholds,
                    "filter_options": {
                        "quarters": ["All Quarters"] + all_quarters,
                        "regions": ["All"] + all_regions,
                    },
                },
                status=status.HTTP_200_OK,
            )

        except pyodbc.Error as e:
            return Response(
                {"detail": "Database error. Please try again later.", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            return Response(
                {"detail": "Internal server error.", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            if conn:
                conn.close()
