from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import get_warehouse_connection
from .visual_adoption_queries import (
    VISUAL_ADOPTION_MAIN_QUERY, 
    PMS_VISUALS_QUERY
)
from .views import apply_user_scope, sort_quarters_desc


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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        quarter_filter      = request.query_params.get('quarter', 'All') or 'All'
        country_filter      = request.query_params.get('country', 'All') or 'All'
        visual_style_filter = request.query_params.get('visual_style', 'All') or 'All'
        selected_visual     = request.query_params.get('visual_name', None)

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

            conn.close()

        except Exception as e:
            return Response({'error': str(e)}, status=500)

        # ── 3. Apply user role and regional scoping ──
        rows = apply_user_scope(raw_rows, request.user, country_key='Country', region_key='Region', retailer_key='Retailer')

        # ── 4. Derived Master Dropdown Options (scoped to user data) ──
        master_quarters = sort_quarters_desc(list(set(r.get('quarter_label') for r in rows if r.get('quarter_label'))))
        master_countries = sorted(list(set(r.get('Country') for r in rows if r.get('Country') and r['Country'] not in ('', 'Unknown', 'None'))))
        master_visual_styles = sorted(list(set(r.get('Visual_Style') for r in rows if r.get('Visual_Style') and r['Visual_Style'] not in ('', 'None', 'NA', 'Unknown'))))

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
            name_tokens = [t.strip() for t in names.replace(';', '|').split('|') if t.strip() and t.strip() not in ('None', '', 'NA')]
            url_tokens = [t.strip() for t in urls.replace(';', '|').split('|') if t.strip() and t.strip() not in ('None', '', 'NA')]
            for i, name in enumerate(name_tokens):
                if name and name not in visual_catalog and name != 'None':
                    url = url_tokens[i] if i < len(url_tokens) else (url_tokens[0] if url_tokens else '')
                    if url:
                        visual_catalog[name] = url

        pms_visuals = [
            {'PMSVisual_ID': idx + 1, 'PMSVisual_Name': name, 'PMSVisual_URL': url}
            for idx, (name, url) in enumerate(sorted(visual_catalog.items(), key=lambda x: x[0]))
        ]

        # ── 6. Apply Active UI Filters for KPIs and Retailer Breakdown ──
        filtered_rows = rows
        if quarter_filter and quarter_filter != 'All':
            filtered_rows = [r for r in filtered_rows if r.get('quarter_label') == quarter_filter]
        if country_filter and country_filter != 'All':
            filtered_rows = [r for r in filtered_rows if r.get('Country') == country_filter]
        if visual_style_filter and visual_style_filter != 'All':
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

        # ── 7. Expand pipe/semicolon-separated visuals for visual cards ──
        expanded_rows = []
        for row in filtered_rows:
            names = row.get('Visual_Content_Name', '') or ''
            urls  = row.get('Visual_Content_URL',  '') or ''
            name_tokens = [
                t.strip() for t in 
                names.replace(';', '|').split('|') 
                if t.strip() and t.strip() not in ('None', '', 'NA')
            ]
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

        return Response({
            'kpis': {
                'total_creatives':            total_creatives,
                'used_intel_visuals':         intel_layouts_count,
                'intel_layouts_count':        intel_layouts_count,
                'custom_intel_layouts_count': custom_intel_count,
                'master_visual_adoption_pct': adoption_pct,
            },
            'retailer_adoption':          retailer_adoption,
            'pms_visuals':                pms_visuals,
            'selected_visual_stats':      visual_stats,
            'retailer_visual_breakdown':  retailer_visual_breakdown,
            'filter_options': {
                'quarters':      ['All'] + master_quarters,
                'countries':     ['All'] + master_countries,
                'visual_styles': ['All'] + master_visual_styles,
            }
        })
