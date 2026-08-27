"""
apps/reports/views.py
----------------------
Four JWT-protected reporting endpoints that query the BLUE_BASCO warehouse.

All views follow the same pattern:
  1. Require JWT authentication (IsAuthenticated)
  2. Require IsAnyReportingRole (RSM / RMM / ADMIN)
  3. Open a raw pyodbc connection via get_warehouse_connection()
  4. Execute the relevant SQL stub from queries.py
  5. Convert cursor rows → list of dicts
  6. Apply in-Python role-based row filtering
  7. Serialize and return

Real SQL queries will replace the stubs in queries.py in a later step.
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
from .queries import (
    CTA_MIX_QUERY,
    LEAGUE_TABLE_QUERY,
    MARKET_MATURITY_QUERY,
    VISUAL_ADOPTION_QUERY,
)
from .serializers import (
    CtaMixRowSerializer,
    LeagueTableRowSerializer,
    MarketMaturityRowSerializer,
    VisualAdoptionRowSerializer,
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
    if not user or not user.is_authenticated:
        return rows

    if user.role == User.Role.RSM:
        allowed = set(user.retailer_ids or [])
        return [
            r for r in rows
            if r.get(retailer_key) in allowed or r.get("retailer") in allowed or r.get("clean_email") in allowed or r.get("sender_email") in allowed
        ]

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
        return scoped

    return rows


def _rows_to_dicts(cursor) -> list[dict]:
    """Convert a cursor result set to a list of plain dicts."""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


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

            # Role-based & regional scoping
            rows = apply_user_scope(rows, request.user, country_key='country', region_key='region', retailer_key='retailer')

            # Master options for 2026 based on scoped data
            all_quarters = sort_quarters_desc(list(set(r['quarter'] for r in rows if r.get('quarter'))))
            all_countries = sorted(list(set(r['country'] for r in rows if r.get('country') and r['country'] not in ('', 'Unknown', 'None'))))
            all_regions = sorted(list(set(r['region'] for r in rows if r.get('region') and r['region'] not in ('', 'Unknown', 'None'))))

            # Compute prev_basco and trend across quarters for each retailer
            retailer_quarter_map = {}
            for r in rows:
                retailer_quarter_map[(r['retailer'], r['quarter'])] = r['basco']

            for r in rows:
                country_base = BASE_FMV_MAP.get(r['country'], 250000)
                est_fmv = int(r['queries'] * 35000) if r['queries'] > 0 else country_base
                r['fmv'] = est_fmv
                r['attr_loss'] = int(est_fmv * ((100 - r['basco']) / 100) * 0.22)

                q_str = r.get('quarter', '')
                if 'Q3' in q_str:
                    prev_q = q_str.replace('Q3', 'Q2')
                elif 'Q2' in q_str:
                    prev_q = q_str.replace('Q2', 'Q1')
                else:
                    prev_q = None

                prev_score = retailer_quarter_map.get((r['retailer'], prev_q)) if prev_q else None
                r['prev_basco'] = prev_score
                if prev_score is None:
                    r['trend'] = 'NEW'
                elif r['basco'] > prev_score:
                    r['trend'] = 'UP'
                elif r['basco'] < prev_score:
                    r['trend'] = 'DOWN'
                else:
                    r['trend'] = 'FLAT'

            # Filter if query parameters provided
            filtered_rows = rows
            if quarter_filter and quarter_filter not in ('All', 'All Quarters'):
                filtered_rows = [r for r in filtered_rows if r.get('quarter') == quarter_filter]
            if country_filter and country_filter not in ('All', 'All Countries'):
                filtered_rows = [r for r in filtered_rows if r.get('country') == country_filter]
            if region_filter and region_filter != 'All':
                filtered_rows = [r for r in filtered_rows if r.get('region') == region_filter]

            return Response({
                'data': filtered_rows,
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


BASE_FMV_MAP = {
    'Australia': 1473000,
    'Brazil': 1158842,
    'South Korea': 1124500,
    'Germany': 946900,
    'Nordics': 765000,
    'Mexico': 255809,
    'Indonesia': 145500,
    'France': 97000,
    'Spain': 46770,
    'Taiwan': 520000,
    'Thailand': 640000,
    'New Zealand': 180000,
    'Malaysia': 410000,
    'India': 880000,
    'Turkey': 310000,
    'Portugal': 150000,
}


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

            # Apply user role & regional scoping
            raw_rows = apply_user_scope(raw_rows, request.user, country_key='country', region_key='region')

            quarter_param = request.query_params.get("quarter", "").strip()
            all_quarters = sort_quarters_desc(list(set(r.get("quarter_label") for r in raw_rows if r.get("quarter_label"))))

            # Compute all-time jobs per country for FMV scaling
            country_all_time_jobs = {}
            for r in raw_rows:
                c = r.get("country")
                country_all_time_jobs[c] = country_all_time_jobs.get(c, 0) + (r.get("total_jobs") or 0)

            if quarter_param and quarter_param not in ("All", "All Quarters"):
                # Filter by specific quarter
                matching_rows = [r for r in raw_rows if r.get("quarter_label") == quarter_param]
                country_rows = []
                for r in matching_rows:
                    country = r.get("country")
                    region = r.get("region")
                    jobs = r.get("total_jobs") or 0
                    score = float(r.get("avg_basco_score") or 0.0)
                    violations = int(r.get("total_violations") or 0)

                    base_fmv = BASE_FMV_MAP.get(country, jobs * 35000)
                    all_time_jobs = max(1, country_all_time_jobs.get(country, jobs))
                    ratio = min(1.0, jobs / all_time_jobs)
                    fmv = round(base_fmv * ratio) if ratio > 0 else base_fmv
                    attr_loss = round(fmv * ((100.0 - score) / 100.0) * 0.22)

                    country_rows.append({
                        "country": country,
                        "region": region,
                        "total_jobs": jobs,
                        "avg_basco_score": score,
                        "total_violations": violations,
                        "fmv": fmv,
                        "attr_loss": attr_loss,
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
                            "weighted_score": 0.0,
                        }
                    item = agg_map[key]
                    jobs = r.get("total_jobs") or 0
                    score = float(r.get("avg_basco_score") or 0.0)
                    violations = int(r.get("total_violations") or 0)

                    item["total_jobs"] += jobs
                    item["total_violations"] += violations
                    item["weighted_score"] += score * jobs

                country_rows = []
                for (country, region), item in agg_map.items():
                    jobs = item["total_jobs"]
                    avg_score = round(item["weighted_score"] / jobs, 1) if jobs > 0 else 0.0
                    fmv = BASE_FMV_MAP.get(country, jobs * 35000)
                    attr_loss = round(fmv * ((100.0 - avg_score) / 100.0) * 0.22)

                    country_rows.append({
                        "country": country,
                        "region": region,
                        "total_jobs": jobs,
                        "avg_basco_score": avg_score,
                        "total_violations": item["total_violations"],
                        "fmv": fmv,
                        "attr_loss": attr_loss,
                    })

            country_rows.sort(key=lambda x: x["avg_basco_score"])
            serializer = MarketMaturityRowSerializer(country_rows, many=True)
            return Response(
                {
                    "data": serializer.data,
                    "filter_options": {
                        "quarters": ["All Quarters"] + all_quarters,
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



class VisualAdoptionView(APIView):
    """
    GET /api/reports/visual-adoption/

    Returns Intel PMS visual usage broken down by retailer and visual type.

    Role filtering:
      RSM   → only rows where retailer_name is in request.user.retailer_ids
      RMM   → all rows
      ADMIN → all rows
    """

    permission_classes = [IsAuthenticated, IsAnyReportingRole]

    @extend_schema(
        summary="Visual adoption",
        description=(
            "Returns Intel PMS visual usage counts by retailer and visual type.\n\n"
            "**RSM** sees only their assigned retailers.\n"
            "**RMM** and **ADMIN** see all rows."
        ),
        responses={
            200: VisualAdoptionRowSerializer(many=True),
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
            cursor.execute(VISUAL_ADOPTION_QUERY)
            rows = _rows_to_dicts(cursor)

            # Role-based filtering
            # RSM retailer_ids must contain Sender_Email values from Job_Queue
            if request.user.role == User.Role.RSM:
                allowed = set(request.user.retailer_ids or [])
                rows = [r for r in rows if r.get("retailer_name") in allowed]
            # RMM and ADMIN: no filtering

            serializer = VisualAdoptionRowSerializer(rows, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except pyodbc.Error:
            return Response(_DB_ERROR_RESPONSE, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if conn:
                conn.close()


class CtaMixView(APIView):
    """
    GET /api/reports/cta-mix/

    Returns campaign type and CTA breakdown across all creatives.
    All roles see the full dataset — no row-level filtering.
    """

    permission_classes = [IsAuthenticated, IsAnyReportingRole]

    @extend_schema(
        summary="CTA mix",
        description=(
            "Returns campaign type and CTA breakdown across all creatives.\n\n"
            "All roles (**RSM**, **RMM**, **ADMIN**) see the full dataset."
        ),
        responses={
            200: CtaMixRowSerializer(many=True),
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
            cursor.execute(CTA_MIX_QUERY)
            rows = _rows_to_dicts(cursor)
            # No role-based filtering for this report
            serializer = CtaMixRowSerializer(rows, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except pyodbc.Error:
            return Response(_DB_ERROR_RESPONSE, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            if conn:
                conn.close()
