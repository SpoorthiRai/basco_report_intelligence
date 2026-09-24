import re

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import get_warehouse_connection
from .visual_adoption_queries import (
    VISUAL_ADOPTION_MAIN_QUERY,
    PMS_VISUALS_QUERY,
    VISUAL_USAGE_EVIDENCE_QUERY,
    POP_VISUAL_ADOPTION_MAIN_QUERY,
    POP_PMS_VISUALS_QUERY,
    POP_VISUAL_USAGE_EVIDENCE_QUERY,
)
from .kpi import classify_pms_usage, compute_visual_kpis
from .layout import (
    is_custom_intel_layout,
    is_intel_layout_only,
)
from .permissions import IsAnyReportingRole
from .offer_cta_views import classify_product_family
from .views import apply_user_scope, build_cascading_filter_options, is_all_filter

_TITLE_ACRONYMS = {
    'igd', 'pms', 'ai', 'cta', 'pop', 'oem', 'cpu', 'gpu', 'kv', 'uhd', 'arc', 'evo', 'aihd',
    'smb', 'oem',
}
_TITLE_SMALL = {'of', 'the', 'and', 'in', 'on', 'for', 'to', 'a', 'an', 'vs'}
_VISUAL_WORDS = (
    'intel', 'gaming', 'gamer', 'days', 'core', 'ultra', 'series',
    'copilot', 'hero', 'premium', 'everyday', 'student', 'benefits',
    'performance', 'work', 'smb', 'banner', 'lifestyle', 'campaign',
    'visual', 'master', 'product', 'image', 'edition', 'copilothero',
)


def clean_visual_label(name) -> str:
    raw = str(name or '').strip()
    if not raw or raw.lower() in ('none', 'na', 'unknown'):
        return 'Unknown'
    token = raw.split('/')[-1]
    token = re.sub(r'\.(png|jpg|jpeg|webp|gif|svg)$', '', token, flags=re.I)
    token = token.replace('&amp;', '&')
    token = re.sub(r'([a-z])([A-Z])', r'\1 \2', token)
    token = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1 \2', token)
    token = re.sub(r'[_\-]+', ' ', token)
    token = re.sub(r'(?i)\bv(\d+)', r' V\1 ', token)
    token = re.sub(r'([A-Za-z])(\d)', r'\1 \2', token)
    token = re.sub(r'(\d)([A-Za-z])', r'\1 \2', token)
    token = re.sub(r'\s+', ' ', token).strip()

    known = tuple(sorted(_VISUAL_WORDS, key=len, reverse=True))

    def greedy_parts(chunk: str) -> list[str]:
        compact = re.sub(r'[^a-z0-9]+', '', chunk.lower())
        if not compact:
            return []
        parts = []
        i = 0
        while i < len(compact):
            if compact[i].isdigit():
                j = i
                while j < len(compact) and compact[j].isdigit():
                    j += 1
                parts.append(compact[i:j])
                i = j
                continue
            hit = next((w for w in known if compact.startswith(w, i)), None)
            if hit:
                if hit == 'copilothero':
                    parts.extend(['copilot', 'hero'])
                else:
                    parts.append(hit)
                i += len(hit)
                continue
            j = i + 1
            while j < len(compact) and not compact[j].isdigit() and not any(compact.startswith(w, j) for w in known):
                j += 1
            parts.append(compact[i:j])
            i = j
        merged = []
        k = 0
        while k < len(parts):
            if k + 1 < len(parts) and parts[k] == 'co' and parts[k + 1] == 'pilot':
                merged.append('copilot')
                k += 2
                continue
            merged.append(parts[k])
            k += 1
        return merged

    formatted = []
    for word in token.split(' '):
        if re.fullmatch(r'V\d+', word, flags=re.I):
            formatted.append('V' + word[1:])
            continue
        if word.isdigit():
            formatted.append(word)
            continue
        for part in greedy_parts(word):
            if re.fullmatch(r'v\d+', part):
                formatted.append('V' + part[1:])
            elif part in _TITLE_ACRONYMS:
                formatted.append(part.upper())
            elif part == 'intel':
                formatted.append('Intel')
            elif part == 'copilot':
                formatted.append('Copilot')
            elif formatted and part in _TITLE_SMALL:
                formatted.append(part)
            else:
                formatted.append(part[:1].upper() + part[1:] if part else part)
    cleaned = []
    for part in formatted:
        if cleaned and cleaned[-1] == 'V' and part.isdigit():
            cleaned[-1] = 'V' + part
        elif cleaned and cleaned[-1] == 'Co' and part.lower() == 'pilot':
            cleaned[-1] = 'Copilot'
        else:
            cleaned.append(part)
    return ' '.join(cleaned) or raw


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


_PLACEHOLDER_LABELS = frozenset({
    '', 'na', 'n/a', 'null', 'none', 'unknown', 'unmapped',
    'intel creative', 'red baron',
})


def is_placeholder_label(value) -> bool:
    if value is None:
        return True
    return str(value).strip().lower() in _PLACEHOLDER_LABELS


def child_account_label(row: dict) -> str:
    name = str(row.get('Child_Account') or row.get('CHILD_ACCOUNT') or '').strip()
    if is_placeholder_label(name):
        return ''
    return name


def is_partial_or_complete_usage(usage) -> bool:
    bucket = classify_pms_usage(usage)
    return bucket in ('Completely Used', 'Partially Used')


class VisualAdoptionView(APIView):
    permission_classes = [IsAuthenticated, IsAnyReportingRole]

    def get(self, request):
        quarter_filter      = request.query_params.get('quarter', 'All') or 'All'
        region_filter       = request.query_params.get('region', 'All') or 'All'
        country_filter      = request.query_params.get('country', 'All') or 'All'
        visual_style_filter = request.query_params.get('visual_style', 'All') or 'All'
        retailer_filter     = request.query_params.get('retailer', 'All') or 'All'
        selected_visual     = request.query_params.get('visual_name', None)
        source_filter       = (request.query_params.get('source', 'helpdesk') or 'helpdesk').strip().lower()
        if source_filter not in ('pop', 'helpdesk'):
            source_filter = 'helpdesk'

        try:
            conn = get_warehouse_connection()
            cursor = conn.cursor()

            if source_filter == 'pop':
                cursor.execute(POP_VISUAL_ADOPTION_MAIN_QUERY)
                cols = [c[0] for c in cursor.description]
                raw_rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

                cursor.execute(POP_PMS_VISUALS_QUERY)
                pms_cols = [c[0] for c in cursor.description]
                raw_pms = [dict(zip(pms_cols, r)) for r in cursor.fetchall()]

                cursor.execute(POP_VISUAL_USAGE_EVIDENCE_QUERY)
                ev_cols = [c[0] for c in cursor.description]
                raw_evidence = [dict(zip(ev_cols, r)) for r in cursor.fetchall()]
            else:
                cursor.execute(VISUAL_ADOPTION_MAIN_QUERY)
                cols = [c[0] for c in cursor.description]
                raw_rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

                cursor.execute(PMS_VISUALS_QUERY)
                pms_cols = [c[0] for c in cursor.description]
                raw_pms = [dict(zip(pms_cols, r)) for r in cursor.fetchall()]

                cursor.execute(VISUAL_USAGE_EVIDENCE_QUERY)
                ev_cols = [c[0] for c in cursor.description]
                raw_evidence = [dict(zip(ev_cols, r)) for r in cursor.fetchall()]

            conn.close()

        except Exception as e:
            return Response({'error': str(e)}, status=500)

        # ── 3. Apply user role and regional scoping ──
        rows = apply_user_scope(raw_rows, request.user, country_key='Country', region_key='Region', retailer_key='Retailer')
        evidence_rows = apply_user_scope(
            raw_evidence, request.user, country_key='Country', region_key='Region', retailer_key='Retailer'
        )

        # ── 4. Cascading Quarter → Region → Country (+ retailers for table filters) ──
        filter_options = build_cascading_filter_options(
            rows,
            selected_quarter=quarter_filter,
            selected_region=region_filter,
            selected_country=country_filter,
            quarter_keys=("quarter_label",),
            region_keys=("Region",),
            country_keys=("Country",),
            retailer_keys=("Retailer", "Child_Account", "CHILD_ACCOUNT"),
            region_all="All",
            country_all="All",
            retailer_all="All",
            quarter_all="All",
        )
        master_quarters = [q for q in filter_options["quarters"] if q != "All"]
        master_visual_styles = sorted(list(set(r.get('Visual_Style') for r in rows if r.get('Visual_Style') and r['Visual_Style'] not in ('', 'None', 'NA', 'Unknown'))))
        master_retailers = [r for r in filter_options.get("retailers", []) if r != "All"]
        if not master_retailers:
            master_retailers = sorted(list(set(
                child_account_label(r)
                for r in evidence_rows
                if child_account_label(r)
            )))
            filter_options["retailers"] = ["All"] + master_retailers

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
        if not is_all_filter(retailer_filter, 'All', 'All Retailers'):
            wanted_ret = retailer_filter.strip()
            filtered_rows = [
                r for r in filtered_rows
                if child_account_label(r) == wanted_ret or str(r.get('Retailer') or '').strip() == wanted_ret
            ]
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

        layout_intel_or_custom = intel_layouts_count + custom_intel_count

        # Retailer-wise adoption breakdown for horizontal chart (child accounts)
        ret_map = {}
        for r in filtered_rows:
            ret = child_account_label(r)
            if not ret:
                continue
            if ret not in ret_map:
                ret_map[ret] = {'total': 0, 'intel': 0, 'intel_only': 0, 'custom': 0}
            cnt = r.get('creative_count', 1)
            ret_map[ret]['total'] += cnt
            if is_intel_layout_only(r.get('Layout_Category')):
                ret_map[ret]['intel_only'] += cnt
            if is_custom_intel_layout(r.get('Layout_Category')):
                ret_map[ret]['custom'] += cnt
            if is_intel_layout_only(r.get('Layout_Category')) or is_custom_intel_layout(r.get('Layout_Category')):
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
            layout_intel_or_custom,
            custom_intel_count,
            layout_intel_or_custom,
        )

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
                if not is_partial_or_complete_usage(r.get('Intel_Visual_Usage')):
                    continue
                ret = child_account_label(r)
                if not ret:
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
                if not is_all_filter(retailer_filter, 'All', 'All Retailers'):
                    wanted_ret = retailer_filter.strip()
                    if child_account_label(r) != wanted_ret and str(r.get('Retailer') or '').strip() != wanted_ret:
                        continue
                names = split_visual_tokens(r.get('Visual_Content_Name'))
                if selected_visual not in names:
                    continue
                asset = r.get('Asset_URL')
                if not asset or asset in seen_assets:
                    continue
                retailer = child_account_label(r)
                campaign = str(r.get('Campaign') or '').strip()
                if not retailer or is_placeholder_label(campaign):
                    continue
                seen_assets.add(asset)
                bucket = classify_pms_usage(r.get('Intel_Visual_Usage'), r.get('Layout_Category'))
                if bucket == 'Completely Used':
                    usage_label = 'Completely used'
                elif bucket == 'Partially Used':
                    usage_label = 'Partially used'
                else:
                    usage_label = str(r.get('Intel_Visual_Usage') or '').strip() or 'Other'
                families = classify_product_family(r.get('Products'))
                usage_table.append({
                    'master_visual_url': visual_catalog.get(selected_visual) or r.get('Visual_Content_URL') or '',
                    'master_visual_name': clean_visual_label(selected_visual),
                    'actual_creative_url': asset,
                    'retailer': retailer,
                    'campaign': campaign,
                    'products': ', '.join(families[:3]) if families else 'Unknown',
                    'offer': flag_yn(r.get('Offer_Flag')),
                    'cta': flag_yn(r.get('CTA_Flag')),
                    'usage': usage_label,
                    'intel_visual_usage': usage_label,
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
                **filter_options,
                'visual_styles': ['All'] + master_visual_styles,
            }
        })
