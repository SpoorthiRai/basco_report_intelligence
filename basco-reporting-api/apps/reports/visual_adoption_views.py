from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import get_warehouse_connection
from .visual_adoption_queries import (
    VISUAL_ADOPTION_MAIN_QUERY, 
    PMS_VISUALS_QUERY
)
from .views import apply_user_scope, sort_quarters_desc


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

            # ── 1. Fetch main creative data for right-side visual details ──
            cursor.execute(VISUAL_ADOPTION_MAIN_QUERY)
            cols = [c[0] for c in cursor.description]
            raw_rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

            # ── 2. Fetch PMS master visuals list ──
            cursor.execute(PMS_VISUALS_QUERY)
            pms_cols = [c[0] for c in cursor.description]
            pms_visuals = [dict(zip(pms_cols, r)) for r in cursor.fetchall()]

            conn.close()

        except Exception as e:
            return Response({'error': str(e)}, status=500)

        # ── 3. Apply user role and regional scoping ──
        rows = apply_user_scope(raw_rows, request.user, country_key='Country', region_key='Region', retailer_key='Retailer')

        # ── 4. Derived Master Dropdown Options (scoped to user data) ──
        master_quarters = sort_quarters_desc(list(set(r.get('quarter_label') for r in rows if r.get('quarter_label'))))
        master_countries = sorted(list(set(r.get('Country') for r in rows if r.get('Country') and r['Country'] not in ('', 'Unknown', 'None'))))
        master_visual_styles = sorted(list(set(r.get('Visual_Style') for r in rows if r.get('Visual_Style') and r['Visual_Style'] not in ('', 'None', 'NA'))))

        # ── 5. Apply Active UI Filters for KPIs and Retailer Breakdown ──
        filtered_rows = rows
        if quarter_filter and quarter_filter != 'All':
            filtered_rows = [r for r in filtered_rows if r.get('quarter_label') == quarter_filter]
        if country_filter and country_filter != 'All':
            filtered_rows = [r for r in filtered_rows if r.get('Country') == country_filter]
        if visual_style_filter and visual_style_filter != 'All':
            filtered_rows = [r for r in filtered_rows if r.get('Visual_Style') == visual_style_filter]

        total_creatives = sum(r.get('creative_count', 1) for r in filtered_rows)
        used_intel = sum(r.get('creative_count', 1) for r in filtered_rows if r.get('Intel_Visual_Flag') == 'Yes')
        adoption_pct = round(used_intel / total_creatives * 100, 1) if total_creatives > 0 else 0

        # Retailer-wise adoption breakdown
        ret_map = {}
        for r in filtered_rows:
            ret = r.get('Retailer')
            if not ret or ret in ('', 'Unknown', 'Unmapped', 'None', 'NA', 'Intel Creative', 'Red Baron'):
                continue
            if ret not in ret_map:
                ret_map[ret] = {'total': 0, 'intel': 0}
            cnt = r.get('creative_count', 1)
            ret_map[ret]['total'] += cnt
            if r.get('Intel_Visual_Flag') == 'Yes':
                ret_map[ret]['intel'] += cnt

        retailer_adoption = sorted([
            {
                'retailer': ret,
                'total_creatives': stats['total'],
                'intel_visual_creatives': stats['intel'],
                'adoption_pct': round(stats['intel'] / stats['total'] * 100, 1) if stats['total'] > 0 else 0
            }
            for ret, stats in ret_map.items()
        ], key=lambda x: (x['adoption_pct'], x['intel_visual_creatives']), reverse=True)

        # ── 6. Expand pipe/semicolon-separated visuals for visual cards ──
        expanded_rows = []
        for row in filtered_rows:
            names = row.get('Visual_Content_Name', '') or ''
            urls  = row.get('Visual_Content_URL',  '') or ''
            name_tokens = [
                t.strip() for t in 
                names.replace(';', '|').split('|') 
                if t.strip()
            ]
            url_tokens = [
                t.strip() for t in 
                urls.replace(';', '|').split('|') 
                if t.strip()
            ]
            for i, name in enumerate(name_tokens):
                url = url_tokens[i] if i < len(url_tokens) else ''
                expanded_rows.append({
                    **row,
                    'Visual_Content_Name': name,
                    'Visual_Content_URL':  url,
                })

        # ── 7. Per-visual stats (for selected visual) ──
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

            pms_match = next(
                (p for p in pms_visuals 
                 if p['PMSVisual_Name'] == selected_visual), 
                None
            )
            thumbnail = (
                pms_match['PMSVisual_URL'] if pms_match 
                else (visual_rows[0].get('Visual_Content_URL', '') 
                      if visual_rows else '')
            )

            visual_stats = {
                'visual_name':    selected_visual,
                'thumbnail_url':  thumbnail,
                'creative_count': visual_count,
                'adoption_pct':   visual_pct,
            }

            ret_visual_map = {}
            for r in visual_rows:
                ret = r.get('Retailer', 'Unknown')
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
                'used_intel_visuals':         used_intel,
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
