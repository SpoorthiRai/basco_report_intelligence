from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import get_warehouse_connection
from .product_mix_queries import PRODUCT_MIX_QUERY
from .views import apply_user_scope, sort_quarters_desc


def classify_token(token):
    """
    Takes a raw Content token like 'Intel Core Ultra-Series 3'
    and returns (family, series_or_gen).
    Order of checks matters — most specific first.
    """
    t = token.strip()

    # --- Family classification (most specific first) ---
    if 'Gaming Core Ultra' in t:
        family = 'Gaming Core Ultra'
    elif 'Gaming' in t:
        family = 'Gaming'
    elif 'Intel Core Ultra' in t:
        family = 'Intel Core Ultra'
    elif 'Intel Core Processors' in t:
        family = 'Intel Core Processors'
    elif 'Intel Processors' in t:
        family = 'Intel Processors'
    elif 'Intel Evo Edition' in t:
        family = 'Intel Evo Edition'
    elif 'Intel Evo' in t:
        family = 'Intel Evo'
    elif 'Intel Arc' in t:
        family = 'Intel Arc Graphics'
    elif 'Intel Iris' in t:
        family = 'Intel Iris Graphics'
    else:
        family = 'Other'

    # --- Series/Gen extraction from suffix after '-' ---
    suffix = ''
    if '-' in t:
        suffix = t.split('-', 1)[1].strip()
        # Clean multi-series/gen values for clean presentation
        suffix = suffix.replace('Series 2|3', 'Series 2 / Series 3')
        suffix = suffix.replace('Series 1|Series 2|Series 3', 'Series 1 / 2 / 3')
        suffix = suffix.replace('Series 1|Series 2', 'Series 1 / Series 2')
        suffix = suffix.replace('12th Gen|13th Gen|14th Gen', '12th / 13th / 14th Gen')
        suffix = suffix.replace('14th Gen|13th Gen', '13th Gen / 14th Gen')
        suffix = suffix.replace('13th Gen|14th Gen', '13th Gen / 14th Gen')
        suffix = suffix.replace('14th Gen|12th Gen', '12th Gen / 14th Gen')
        suffix = suffix.replace('12th Gen|14th Gen', '12th Gen / 14th Gen')
        suffix = suffix.replace('|', ' / ')

    # Classify suffix into Series or Generation bucket
    if 'Series' in suffix:
        gen_label = suffix  # e.g. "Series 3", "Series 2", "Series 1"
    elif 'Gen' in suffix:
        gen_label = suffix  # e.g. "14th Gen", "13th Gen"
    elif suffix:
        gen_label = suffix
    else:
        # Meaningful labels for umbrella / brand-level creatives without sub-tier suffix
        if 'Ultra' in family:
            gen_label = 'Unspecified Series'
        elif 'Processor' in family or 'Gaming' in family:
            gen_label = 'Unspecified Generation'
        elif 'Evo' in family or 'Graphics' in family:
            gen_label = 'Standard'
        else:
            gen_label = 'Unspecified'

    return family, gen_label


class ProductMixView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        quarter_filter = request.query_params.get('quarter', 'All') or 'All'
        country_filter = request.query_params.get('country', 'All') or 'All'
        family_filter  = request.query_params.get('family', 'Intel Core Ultra') or 'Intel Core Ultra'
        series_filter  = request.query_params.get('target_series', 'Series 3') or 'Series 3'

        try:
            conn   = get_warehouse_connection()
            cursor = conn.cursor()

            # Execute 2026-scoped product mix query
            cursor.execute(PRODUCT_MIX_QUERY)
            cols = [c[0] for c in cursor.description]
            all_raw_rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

            conn.close()
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        # ── Apply role-based & regional scoping ──
        all_raw_rows = apply_user_scope(all_raw_rows, request.user, country_key='Country', region_key='Region', retailer_key='Retailer')

        # ── 2026 Master filter dropdowns (derived directly from scoped 2026 data) ──
        raw_quarters = set(r.get('quarter_label') for r in all_raw_rows if r.get('quarter_label'))
        master_quarters = sort_quarters_desc(list(raw_quarters))

        raw_countries = set(
            r.get('Country') for r in all_raw_rows
            if r.get('Country') and r.get('Country') not in ('Unknown', 'None', '')
        )
        master_countries = sorted(list(raw_countries))

        # Apply filters
        rows = all_raw_rows
        if quarter_filter and quarter_filter != 'All':
            rows = [r for r in rows if r.get('quarter_label') == quarter_filter]
        if country_filter and country_filter != 'All':
            rows = [r for r in rows if r.get('Country') == country_filter]

        # --- Expand rows: split semicolon-separated Content ---
        expanded = []
        all_series_set = set()
        for row in rows:
            content = row.get('Content', '') or ''
            if not content and (row.get('Product') or row.get('Gen')):
                p = row.get('Product', '') or ''
                g = row.get('Gen', '') or ''
                content = f"{p}-{g}".strip('-')

            tokens = [
                t.strip() for t in content.replace(';', '|').split('|')
                if t.strip() and len(t.strip()) > 1
            ]
            if not tokens and row.get('Product'):
                tokens = [str(row.get('Product'))]

            for token in tokens:
                family, gen_label = classify_token(token)
                if gen_label and not gen_label.startswith('Unspecified') and gen_label != 'Standard':
                    all_series_set.add(gen_label)
                expanded.append({
                    'thread_id':    row['Email_Thread_ID'],
                    'retailer':     row['Retailer'],
                    'region':       row['Region'],
                    'country':      row['Country'],
                    'quarter':      row['quarter_label'],
                    'raw_token':    token,
                    'family':       family,
                    'gen_label':    gen_label,
                })

        # -------------------------------------------------------
        # PANEL 1 — Selected Series/Gen adoption by Region
        # -------------------------------------------------------
        raw_target = series_filter.strip()
        search_token = raw_target
        for prefix in ['Intel Core Ultra ', 'Core Ultra ', 'Intel Core ', 'Core ', 'Intel ']:
            if search_token.startswith(prefix):
                search_token = search_token[len(prefix):].strip()

        region_map = {}
        for r in rows:
            reg = r.get('Region', 'Unknown')
            if reg not in region_map:
                region_map[reg] = {
                    'region': reg,
                    'total': 0,
                    'selected_series': 0
                }
            region_map[reg]['total'] += 1
            content = r.get('Content', '') or ''
            if search_token.lower() in content.lower():
                region_map[reg]['selected_series'] += 1

        series_by_region = sorted([
            {
                'region':       v['region'],
                'total':        v['total'],
                'series_count': v['selected_series'],
                'other':        v['total'] - v['selected_series'],
                'series_pct':   round(
                    v['selected_series'] / v['total'] * 100, 1
                ) if v['total'] > 0 else 0,
                # backward compatibility keys
                'series3':      v['selected_series'],
                'series3_pct':  round(
                    v['selected_series'] / v['total'] * 100, 1
                ) if v['total'] > 0 else 0,
            }
            for v in region_map.values()
            if v['region'] != 'Unknown'
        ], key=lambda x: x['series_pct'], reverse=True)


        # -------------------------------------------------------
        # PANEL 2 — Retailer-wise product proportion
        # Each retailer gets a stacked bar of family counts
        # -------------------------------------------------------
        retailer_family_map = {}
        for e in expanded:
            ret = e['retailer']
            fam = e['family']
            if ret not in retailer_family_map:
                retailer_family_map[ret] = {}
            retailer_family_map[ret][fam] = (
                retailer_family_map[ret].get(fam, 0) + 1
            )

        # Get all unique families for chart legend
        all_families = sorted(set(e['family'] for e in expanded))

        retailer_product_mix = sorted([
            {
                'retailer': ret,
                'total': sum(fams.values()),
                **{fam: fams.get(fam, 0) for fam in all_families}
            }
            for ret, fams in retailer_family_map.items()
        ], key=lambda x: x['total'], reverse=True)[:20]

        # -------------------------------------------------------
        # PANEL 3 — Selected family → generation/series breakdown
        # -------------------------------------------------------
        active_family = family_filter or 'Intel Core Ultra'

        family_rows = [
            e for e in expanded
            if e['family'] == active_family
        ]

        gen_map = {}
        for e in family_rows:
            gl = e['gen_label']
            gen_map[gl] = gen_map.get(gl, 0) + 1

        gen_series_breakdown = sorted([
            {'label': gl, 'count': cnt}
            for gl, cnt in gen_map.items()
        ], key=lambda x: x['count'], reverse=True)

        # All unique families for the dropdown
        all_family_options = sorted(set(e['family'] for e in expanded))
        if 'Intel Core Ultra' in all_families and (not all_family_options or all_family_options[0] != 'Intel Core Ultra'):
            if 'Intel Core Ultra' in all_family_options:
                all_family_options.remove('Intel Core Ultra')
            all_family_options.insert(0, 'Intel Core Ultra')

        # Standard Target Series options with proper prefixes
        def format_series_option(s):
            if 'Series' in s:
                return f"Core Ultra {s}"
            elif 'Gen' in s:
                return f"Core {s}"
            return s

        priority_series = ['Series 3', 'Series 2', 'Series 1', '14th Gen', '13th Gen', '12th Gen', '11th Gen', '10th Gen']
        series_options = [
            format_series_option(s) for s in priority_series
            if any(s.lower() in x.lower() for x in all_series_set)
        ]
        for s in sorted(all_series_set):
            formatted = format_series_option(s)
            if formatted not in series_options and not s.startswith('Unspecified') and s != 'Standard':
                series_options.append(formatted)

        if not series_options:
            series_options = [
                'Core Ultra Series 3', 'Core Ultra Series 2', 'Core Ultra Series 1',
                'Core 14th Gen', 'Core 13th Gen', 'Core 12th Gen', 'Core 11th Gen', 'Core 10th Gen'
            ]

        # Formatted target series for display
        display_target = format_series_option(search_token)

        return Response({
            'series3_by_region':      series_by_region,
            'retailer_product_mix':   retailer_product_mix,
            'all_families':           all_families,
            'gen_series_breakdown':   gen_series_breakdown,
            'active_family':          active_family,
            'family_options':         all_family_options,
            'target_series':          display_target,
            'series_options':         series_options,
            'filter_options': {
                'quarters':  ['All Quarters'] + master_quarters,
                'countries': ['All Countries'] + master_countries,
            }
        })

