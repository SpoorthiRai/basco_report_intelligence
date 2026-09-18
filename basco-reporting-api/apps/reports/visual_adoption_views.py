import re

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import get_warehouse_connection
from .visual_adoption_queries import (
    VISUAL_ADOPTION_MAIN_QUERY,
    PMS_VISUALS_QUERY,
    VISUAL_USAGE_EVIDENCE_QUERY,
)
from .kpi import classify_pms_usage, compute_visual_kpis, to_basco_pct
from .permissions import IsAnyReportingRole
from .queries import LEAGUE_TABLE_QUERY
from .offer_cta_views import classify_product_family
from .views import apply_user_scope, sort_quarters_desc

_TITLE_ACRONYMS = {
    'igd', 'pms', 'ai', 'cta', 'pop', 'oem', 'cpu', 'gpu', 'kv', 'uhd', 'arc', 'evo', 'aihd',
}
_TITLE_SMALL = {'of', 'the', 'and', 'in', 'on', 'for', 'to', 'a', 'an', 'vs'}


def clean_visual_label(name) -> str:
    raw = str(name or '').strip()
    if not raw or raw.lower() in ('none', 'na', 'unknown'):
        return 'Unknown'
    token = raw.split('/')[-1]
    token = re.sub(r'\.(png|jpg|jpeg|webp|gif|svg)$', '', token, flags=re.I)
    token = token.replace('&amp;', '&')
    token = re.sub(r'[_\-]+', ' ', token)
    token = re.sub(r'\s+', ' ', token).strip()
    words = token.split(' ')
    out = []
    for i, word in enumerate(words):
        low = word.lower()
        if low in _TITLE_ACRONYMS:
            out.append(low.upper())
        elif low == 'intel':
            out.append('Intel')
        elif i > 0 and low in _TITLE_SMALL:
            out.append(low)
        elif word.isupper() and len(word) <= 4:
            out.append(word)
        else:
            out.append(word[:1].upper() + word[1:].lower() if word else word)
    return ' '.join(out) or raw


def flag_yn(value) -> str:
    text = str(value or '').strip().lower()
    if text in ('yes', 'y', '1', 'true'):
        return 'Y'
    return 'N'


def split_visual_tokens(names) -> list:
    text = str(names or '')
    return [
        t.strip() for t in text.replace(';', '|').split('|')
        if t.strip() and t.strip() not in ('None', '', 'NA')
    ]


def is_intel_layout_only(layout_str) -> bool:
    """
    Returns True ONLY for 'Intel Layouts' (standard Intel layouts, not custom).
    """
    if not layout_str:
        return False
    l = str(layout_str).lower().strip()
    return ('intel' in l and 'layout' in l) and ('custom' not in l)


def is_custom_intel_layout(layout_str) -> bool:
    """
    Returns True for 'Custom-Intel Layouts' (customized Intel layouts).
    """
    if not layout_str:
        return False
    l = str(layout_str).lower().strip()
    return ('custom' in l and 'intel' in l)


def is_any_intel_layout(layout_str, intel_flag=None) -> bool:
    """
    Returns True for either 'Intel Layouts' or 'Custom-Intel Layouts' or Intel_Visual_Flag = 'Yes'.
    """
    return (
        is_intel_layout_only(layout_str) 
        or is_custom_intel_layout(layout_str) 
        or (str(intel_flag).lower().strip() == 'yes' if intel_flag else False)
    )


class VisualAdoptionView(APIView):
    permission_classes = [IsAuthenticated, IsAnyReportingRole]

    def get(self, request):
        quarter_filter      = request.query_params.get('quarter', 'All') or 'All'
        region_filter       = request.query_params.get('region', 'All') or 'All'
        country_filter      = request.query_params.get('country', 'All') or 'All'
        visual_style_filter = request.query_params.get('visual_style', 'All') or 'All'
        selected_visual     = request.query_params.get('visual_name', None)
        source_filter       = (request.query_params.get('source', 'helpdesk') or 'helpdesk').strip().lower()
        if source_filter not in ('pop', 'helpdesk'):
            source_filter = 'helpdesk'

        try:
            conn = get_warehouse_connection()
            cursor = conn.cursor()

            # ── 1. Fetch main creative data ──
            cursor.execute(VISUAL_ADOPTION_MAIN_QUERY)
            cols = [c[0] for c in cursor.description]
            raw_rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

            # ── 2. Fetch master visuals list from metadata ──
            cursor.execute(PMS_VISUALS_QUERY)
            pms_cols = [c[0] for c in cursor.description]
            raw_pms = [dict(zip(pms_cols, r)) for r in cursor.fetchall()]

            cursor.execute(VISUAL_USAGE_EVIDENCE_QUERY)
            ev_cols = [c[0] for c in cursor.description]
            raw_evidence = [dict(zip(ev_cols, r)) for r in cursor.fetchall()]

            pop_rows = []
            if source_filter == 'pop':
                cursor.execute(LEAGUE_TABLE_QUERY)
                pop_cols = [c[0] for c in cursor.description]
                pop_rows = [dict(zip(pop_cols, r)) for r in cursor.fetchall()]

            conn.close()

        except Exception as e:
            return Response({'error': str(e)}, status=500)

        # ── 3. Apply user role and regional scoping ──
        rows = apply_user_scope(raw_rows, request.user, country_key='Country', region_key='Region', retailer_key='Retailer')
        evidence_rows = apply_user_scope(
            raw_evidence, request.user, country_key='Country', region_key='Region', retailer_key='Retailer'
        )
        pop_rows = apply_user_scope(
            pop_rows, request.user, country_key='country', region_key='region', retailer_key='parent_account'
        )

        # ── 4. Derived Master Dropdown Options (scoped to user data) ──
        master_quarters = sort_quarters_desc(list(set(r.get('quarter_label') for r in rows if r.get('quarter_label'))))
        master_regions = sorted(list(set(
            r.get('Region') for r in rows
            if r.get('Region') and str(r.get('Region')).strip() not in ('', 'Unknown', 'None', 'NA')
        )))
        master_countries = sorted(list(set(r.get('Country') for r in rows if r.get('Country') and r['Country'] not in ('', 'Unknown', 'None'))))
        master_visual_styles = sorted(list(set(r.get('Visual_Style') for r in rows if r.get('Visual_Style') and r['Visual_Style'] not in ('', 'None', 'NA', 'Unknown'))))
        master_retailers = sorted(list(set(
            r.get('Retailer') for r in evidence_rows
            if r.get('Retailer') and r.get('Retailer') not in ('', 'Unknown', 'Unmapped', 'None', 'NA', 'Intel Creative', 'Red Baron')
        )))

        # ── 5. Build Master Visual Catalog from Metadata (VISUAL_CONTENT_URL & VISUAL_CONTENT_NAME) ──
        visual_catalog = {}
        for p in raw_pms:
            name = p.get('PMSVisual_Name')
            url = p.get('PMSVisual_URL')
            if name and name not in ('None', '', 'NA') and url and url not in ('None', '', 'NA'):
                visual_catalog[name] = url

        for r in rows:
            names = r.get('Visual_Content_Name', '') or ''
            urls = r.get('Visual_Content_URL', '') or ''
            name_tokens = split_visual_tokens(names)
            url_tokens = [t.strip() for t in urls.replace(';', '|').split('|') if t.strip() and t.strip() not in ('None', '', 'NA')]
            for i, name in enumerate(name_tokens):
                if name and name not in visual_catalog and name != 'None':
                    url = url_tokens[i] if i < len(url_tokens) else (url_tokens[0] if url_tokens else '')
                    if url:
                        visual_catalog[name] = url

        # ── 5.1 Track Recency & Usage Metrics for Each Visual ──
        quarter_rank = {q: idx for idx, q in enumerate(master_quarters)}

        visual_metrics = {}
        for r in rows:
            q_label = r.get('quarter_label')
            cnt = r.get('creative_count', 1)
            names = r.get('Visual_Content_Name', '') or ''
            tokens = split_visual_tokens(names)
            for name in tokens:
                if name not in visual_catalog:
                    continue
                if name not in visual_metrics:
                    visual_metrics[name] = {
                        'best_quarter_rank': quarter_rank.get(q_label, 999),
                        'latest_quarter_count': 0,
                        'total_count': 0,
                    }
                q_r = quarter_rank.get(q_label, 999)
                if q_r < visual_metrics[name]['best_quarter_rank']:
                    visual_metrics[name]['best_quarter_rank'] = q_r
                    visual_metrics[name]['latest_quarter_count'] = cnt
                elif q_r == visual_metrics[name]['best_quarter_rank']:
                    visual_metrics[name]['latest_quarter_count'] += cnt
                visual_metrics[name]['total_count'] += cnt

        # Sort visual catalog so latest visuals (most recent quarter, highest creative count) appear first
        def visual_sort_key(name):
            m = visual_metrics.get(name)
            if m:
                return (m['best_quarter_rank'], -m['latest_quarter_count'], -m['total_count'], name.lower())
            return (9999, 0, 0, name.lower())

        sorted_visual_names = sorted(visual_catalog.keys(), key=visual_sort_key)

        pms_visuals = [
            {
                'PMSVisual_ID': idx + 1,
                'PMSVisual_Name': name,
                'PMSVisual_Label': clean_visual_label(name),
                'PMSVisual_URL': visual_catalog[name],
            }
            for idx, name in enumerate(sorted_visual_names)
        ]

        # Determine the latest default visual (scoped to active quarter filter if set)
        default_visual = None
        if quarter_filter and quarter_filter not in ('All', 'All Quarters'):
            q_r = quarter_rank.get(quarter_filter)
            q_visuals = [
                name for name in sorted_visual_names 
                if visual_metrics.get(name, {}).get('best_quarter_rank') == q_r
            ]
            default_visual = q_visuals[0] if q_visuals else (pms_visuals[0]['PMSVisual_Name'] if pms_visuals else None)
        else:
            default_visual = pms_visuals[0]['PMSVisual_Name'] if pms_visuals else None

        # If user didn't specify a visual, default to the latest visual
        if not selected_visual or selected_visual not in visual_catalog:
            selected_visual = default_visual

        # ── 6. Apply Active UI Filters for KPIs and Retailer Breakdown ──
        filtered_rows = rows
        if quarter_filter and quarter_filter not in ('All', 'All Quarters'):
            filtered_rows = [r for r in filtered_rows if r.get('quarter_label') == quarter_filter]
        if region_filter and region_filter not in ('All', 'All Regions'):
            wanted_region = region_filter.strip().upper()
            filtered_rows = [
                r for r in filtered_rows
                if str(r.get('Region') or '').strip().upper() == wanted_region
            ]
        if country_filter and country_filter not in ('All', 'All Countries'):
            filtered_rows = [r for r in filtered_rows if r.get('Country') == country_filter]
        if visual_style_filter and visual_style_filter not in ('All', 'All Styles'):
            filtered_rows = [r for r in filtered_rows if r.get('Visual_Style') == visual_style_filter]

        total_creatives = sum(r.get('creative_count', 1) for r in filtered_rows)

        # Card 2: Intel Visuals Used = count(Intel Layouts)
        intel_layouts_count = sum(
            r.get('creative_count', 1) for r in filtered_rows
            if is_intel_layout_only(r.get('Layout_Category'))
        )

        # Custom-Intel Layouts count
        custom_intel_count = sum(
            r.get('creative_count', 1) for r in filtered_rows
            if is_custom_intel_layout(r.get('Layout_Category'))
        )

        # Total Intel + Custom Intel Layouts
        total_intel_layouts = sum(
            r.get('creative_count', 1) for r in filtered_rows
            if is_any_intel_layout(r.get('Layout_Category'), r.get('Intel_Visual_Flag'))
        )

        # Card 3: Master Intel Visual Adoption % = (count(Intel Layouts) + count(Custom-Intel Layouts)) / total creatives * 100
        adoption_pct = round(total_intel_layouts / total_creatives * 100, 1) if total_creatives > 0 else 0

        # Retailer-wise adoption breakdown for horizontal chart
        # Using the same LAYOUT_CATEGORY reference: (count(Intel Layouts) + count(Custom-Intel Layouts)) / total
        ret_map = {}
        for r in filtered_rows:
            ret = r.get('Retailer')
            if not ret or ret in ('', 'Unknown', 'Unmapped', 'None', 'NA', 'Intel Creative', 'Red Baron'):
                continue
            if ret not in ret_map:
                ret_map[ret] = {'total': 0, 'intel': 0, 'intel_only': 0, 'custom': 0}
            cnt = r.get('creative_count', 1)
            ret_map[ret]['total'] += cnt
            if is_intel_layout_only(r.get('Layout_Category')):
                ret_map[ret]['intel_only'] += cnt
            if is_custom_intel_layout(r.get('Layout_Category')):
                ret_map[ret]['custom'] += cnt
            if is_any_intel_layout(r.get('Layout_Category'), r.get('Intel_Visual_Flag')):
                ret_map[ret]['intel'] += cnt

        retailer_adoption = sorted([
            {
                'retailer': ret,
                'total_creatives': stats['total'],
                'intel_visual_creatives': stats['intel'],
                'intel_layouts_count': stats['intel_only'],
                'custom_intel_count': stats['custom'],
                'adoption_pct': round(stats['intel'] / stats['total'] * 100, 1) if stats['total'] > 0 else 0
            }
            for ret, stats in ret_map.items()
        ], key=lambda x: (x['adoption_pct'], x['intel_visual_creatives']), reverse=True)

        visual_kpis = compute_visual_kpis(
            total_creatives,
            intel_layouts_count,
            custom_intel_count,
            total_intel_layouts,
        )

        if source_filter == 'pop':
            filtered_pop = pop_rows
            if quarter_filter and quarter_filter not in ('All', 'All Quarters'):
                filtered_pop = [r for r in filtered_pop if r.get('quarter') == quarter_filter]
            if region_filter and region_filter not in ('All', 'All Regions'):
                wanted_region = region_filter.strip().upper()
                filtered_pop = [
                    r for r in filtered_pop
                    if str(r.get('region') or '').strip().upper() == wanted_region
                ]
            if country_filter and country_filter not in ('All', 'All Countries'):
                filtered_pop = [
                    r for r in filtered_pop
                    if r.get('country') == country_filter
                ]

            pop_map = {}
            for r in filtered_pop:
                ret = r.get('parent_account') or r.get('retailer')
                if not ret or ret in ('', 'Unknown', 'Unmapped', 'None', 'NA', 'Intel Creative', 'Red Baron'):
                    continue
                try:
                    art = float(r.get('artwork') or r.get('queries') or 0)
                except (TypeError, ValueError):
                    art = 0
                kv = to_basco_pct(r.get('key_visuals'))
                if ret not in pop_map:
                    pop_map[ret] = {'total': 0.0, 'intel': 0.0}
                pop_map[ret]['total'] += art
                pop_map[ret]['intel'] += art * kv / 100.0

            retailer_adoption = sorted([
                {
                    'retailer': ret,
                    'total_creatives': int(round(stats['total'])),
                    'intel_visual_creatives': int(round(stats['intel'])),
                    'intel_layouts_count': int(round(stats['intel'])),
                    'custom_intel_count': 0,
                    'adoption_pct': round(stats['intel'] / stats['total'] * 100, 1) if stats['total'] > 0 else 0,
                }
                for ret, stats in pop_map.items()
            ], key=lambda x: (x['adoption_pct'], x['intel_visual_creatives']), reverse=True)

            pop_total = int(round(sum(s['total'] for s in pop_map.values())))
            pop_used = int(round(sum(s['intel'] for s in pop_map.values())))
            visual_kpis = compute_visual_kpis(pop_total, pop_used, 0, pop_used)

        # ── 7. Expand pipe/semicolon-separated visuals for visual cards ──
        expanded_rows = []
        for row in filtered_rows:
            names = row.get('Visual_Content_Name', '') or ''
            urls  = row.get('Visual_Content_URL',  '') or ''
            name_tokens = split_visual_tokens(names)
            url_tokens = [
                t.strip() for t in
                urls.replace(';', '|').split('|')
                if t.strip() and t.strip() not in ('None', '', 'NA')
            ]
            for i, name in enumerate(name_tokens):
                url = url_tokens[i] if i < len(url_tokens) else (url_tokens[0] if url_tokens else '')
                expanded_rows.append({
                    **row,
                    'Visual_Content_Name': name,
                    'Visual_Content_URL':  url or visual_catalog.get(name, ''),
                })

        # ── 8. Per-visual stats (for selected visual in Explore Intel Visuals) ──
        visual_stats = None
        retailer_visual_breakdown = []

        if selected_visual:
            visual_rows = [
                r for r in expanded_rows 
                if r.get('Visual_Content_Name') == selected_visual
            ]
            visual_count = sum(
                r.get('creative_count', 1) for r in visual_rows
            )
            visual_pct = round(
                visual_count / total_creatives * 100, 1
            ) if total_creatives > 0 else 0

            thumbnail = visual_catalog.get(selected_visual, '')
            if not thumbnail and visual_rows:
                thumbnail = visual_rows[0].get('Visual_Content_URL', '')

            visual_stats = {
                'visual_name':    selected_visual,
                'thumbnail_url':  thumbnail,
                'creative_count': visual_count,
                'adoption_pct':   visual_pct,
            }

            ret_visual_map = {}
            for r in visual_rows:
                ret = r.get('Retailer', 'Unknown')
                if not ret or ret in ('', 'Unknown', 'Unmapped', 'None', 'NA', 'Intel Creative', 'Red Baron'):
                    continue
                ret_visual_map[ret] = (
                    ret_visual_map.get(ret, 0) 
                    + r.get('creative_count', 1)
                )
            retailer_visual_breakdown = sorted([
                {'retailer': ret, 'count': cnt}
                for ret, cnt in ret_visual_map.items()
            ], key=lambda x: x['count'], reverse=True)

        usage_table = []
        seen_assets = set()
        if selected_visual:
            for r in evidence_rows:
                if quarter_filter and quarter_filter not in ('All', 'All Quarters'):
                    if r.get('quarter_label') != quarter_filter:
                        continue
                if region_filter and region_filter not in ('All', 'All Regions'):
                    if str(r.get('Region') or '').strip().upper() != region_filter.strip().upper():
                        continue
                if country_filter and country_filter not in ('All', 'All Countries'):
                    if r.get('Country') != country_filter:
                        continue
                names = split_visual_tokens(r.get('Visual_Content_Name'))
                if selected_visual not in names:
                    continue
                asset = r.get('Asset_URL')
                if not asset or asset in seen_assets:
                    continue
                seen_assets.add(asset)
                bucket = classify_pms_usage(r.get('Intel_Visual_Usage'), r.get('Layout_Category'))
                if bucket == 'Completely Used':
                    usage_label = 'Completely'
                elif bucket == 'Partially Used':
                    usage_label = 'Partial'
                else:
                    usage_label = 'Other'
                families = classify_product_family(r.get('Products'))
                usage_table.append({
                    'master_visual_url': visual_catalog.get(selected_visual) or r.get('Visual_Content_URL') or '',
                    'master_visual_name': clean_visual_label(selected_visual),
                    'actual_creative_url': asset,
                    'retailer': r.get('Retailer') or 'Unknown',
                    'campaign': clean_visual_label(r.get('Campaign')),
                    'products': ', '.join(families[:3]) if families else 'Unknown',
                    'offer': flag_yn(r.get('Offer_Flag')),
                    'cta': flag_yn(r.get('CTA_Flag')),
                    'usage': usage_label,
                    'quarter_label': r.get('quarter_label') or '',
                    'Region': r.get('Region') or '',
                    'Country': r.get('Country') or '',
                })
                if len(usage_table) >= 150:
                    break

        return Response({
            'kpis': visual_kpis,
            'source': source_filter,
            'retailer_adoption':          retailer_adoption,
            'pms_visuals':                pms_visuals,
            'default_visual':             default_visual,
            'selected_visual_stats':      visual_stats,
            'retailer_visual_breakdown':  retailer_visual_breakdown,
            'usage_table':                usage_table,
            'filter_options': {
                'quarters':      ['All'] + master_quarters,
                'regions':       ['All'] + master_regions,
                'countries':     ['All'] + master_countries,
                'retailers':     ['All'] + master_retailers,
                'visual_styles': ['All'] + master_visual_styles,
            }
        })
