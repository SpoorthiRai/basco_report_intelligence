import re

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import get_warehouse_connection
from .views import sort_quarters_desc, apply_user_scope
from .evidence_queries import build_evidence_locker_query


PRODUCT_FAMILIES = [
    'All Products',
    'Gaming',
    'Intel Core Ultra',
    'Intel Core Processors',
    'Intel Evo',
    'Intel Graphics',
    'Other / General',
]

GENERATIONS = [
    'All Generations / Series',
    'Series 3',
    'Series 2',
    'Series 1',
    '14th Gen',
    '13th Gen',
    '12th Gen',
    '11th Gen',
    '10th Gen',
]


def extract_product_families(content_str: str) -> list:
    if not content_str or content_str in ('None', '', 'NA', 'Unknown'):
        return ['Other / General']
    fams = []
    s = content_str.lower()
    if 'gaming' in s or 'gamer' in s:
        fams.append('Gaming')
    if 'core ultra' in s:
        fams.append('Intel Core Ultra')
    if 'core processor' in s or 'intel processor' in s or 'processors' in s:
        fams.append('Intel Core Processors')
    if 'evo' in s:
        fams.append('Intel Evo')
    if 'arc' in s or 'iris' in s or 'graphic' in s:
        fams.append('Intel Graphics')
    if not fams:
        fams.append('Other / General')
    return fams


def extract_generations(content_str: str) -> list:
    if not content_str or content_str in ('None', '', 'NA', 'Unknown'):
        return []
    gens = []
    s = content_str.lower()
    if 'series 3' in s or 'series-3' in s or 'series3' in s:
        gens.append('Series 3')
    if 'series 2' in s or 'series-2' in s or 'series2' in s:
        gens.append('Series 2')
    if 'series 1' in s or 'series-1' in s or 'series1' in s:
        gens.append('Series 1')
    if '14th' in s:
        gens.append('14th Gen')
    if '13th' in s:
        gens.append('13th Gen')
    if '12th' in s:
        gens.append('12th Gen')
    if '11th' in s:
        gens.append('11th Gen')
    if '10th' in s:
        gens.append('10th Gen')
    return gens


def _parse_quarter(quarter_str: str):
    """
    Parse a quarter string like 'Q3 2026' into (quarter_num, year) integers.
    Always defaults to year 2026.
    """
    if not quarter_str or quarter_str.strip() in ('All', 'All Quarters'):
        return None, 2026
    m = re.match(r'Q(\d)\s+(\d{4})', quarter_str.strip())
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, 2026


class EvidenceLockerView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        compliance_filter = request.query_params.get('compliance', None)
        product_filter    = request.query_params.get('product', None)
        generation_filter = request.query_params.get('generation', None)
        country_filter    = request.query_params.get('country', None)
        quarter_filter    = request.query_params.get('quarter', None)

        # Parse quarter into integers so we can push the filter into SQL
        quarter_num, year = _parse_quarter(quarter_filter)

        try:
            conn   = get_warehouse_connection()
            cursor = conn.cursor()

            # ── Main evidence query — date-filtered strictly at 2026 SQL level ──
            sql = build_evidence_locker_query(year=year, quarter_num=quarter_num)
            cursor.execute(sql)
            columns  = [col[0] for col in cursor.description]
            raw_rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

            conn.close()

        except Exception as e:
            return Response({'error': str(e)}, status=500)

        # ── Apply role-based & regional scoping ──
        raw_rows = apply_user_scope(raw_rows, request.user, country_key='Country', region_key='Region', retailer_key='Parent_Account')

        # Annotate each creative with broad product families & generations
        for r in raw_rows:
            r['product_families'] = extract_product_families(r.get('Content', ''))
            r['generations'] = extract_generations(r.get('Content', ''))

        countries = sorted(set(
            r['Country'] for r in raw_rows
            if r.get('Country') and r['Country'] not in ('None', '', None)
        ))

        quarters = sort_quarters_desc(set(
            r['quarter_label'] for r in raw_rows
            if r.get('quarter_label') and '2026' in r.get('quarter_label', '')
        ))

        rows = raw_rows

        # Remaining filters applied in Python (compliance, product family, generation, country)
        if compliance_filter and compliance_filter in ('Compliant', 'Non-Compliant'):
            rows = [r for r in rows if r['compliance_status'] == compliance_filter]

        if product_filter and product_filter not in ('All', 'All Products'):
            rows = [r for r in rows if product_filter in r.get('product_families', [])]

        if generation_filter and generation_filter not in ('All', 'All Generations / Series'):
            rows = [r for r in rows if generation_filter in r.get('generations', [])]

        if country_filter and country_filter != 'All':
            rows = [r for r in rows if r.get('Country') == country_filter]

        total     = len(rows)
        compliant = sum(1 for r in rows if r['compliance_status'] == 'Compliant')
        non_comp  = sum(1 for r in rows if r['compliance_status'] == 'Non-Compliant')
        quarter   = (
            quarter_filter
            if quarter_filter and quarter_filter not in ('All', 'All Quarters')
            else (quarters[0] if quarters else 'Q3 2026')
        )

        return Response({
            'quarter': quarter,
            'summary': {
                'total': total,
                'compliant': compliant,
                'non_compliant': non_comp,
            },
            'filter_options': {
                'quarters': ['All Quarters'] + quarters,
                'products': PRODUCT_FAMILIES,
                'generations': GENERATIONS,
                'countries': ['All'] + countries,
            },
            'creatives': rows,
        })
