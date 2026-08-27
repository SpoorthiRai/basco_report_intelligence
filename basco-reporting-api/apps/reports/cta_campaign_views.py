from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import get_warehouse_connection
from .views import sort_quarters_desc, apply_user_scope
from .cta_campaign_queries import (
    CTA_CAMPAIGN_QUERY,
    MISALIGNED_EVIDENCE_QUERY
)


def classify_cta(cta_flag, cta_text):
    """
    Classify a CTA into one of 5 buckets.
    Order matters — check No CTA first.
    """
    if cta_flag == 'No' or not cta_text or cta_text in ('None', '', 'NA'):
        return 'No CTA'

    t = cta_text.lower()

    buy_keywords = [
        'shop', 'compre', 'compra', 'buy', '購買', 'ซื้อ', 'beli',
        'acquista', 'añadir', 'aggiungi', 'adicionar', 'garanta',
        'comprar', 'kauf', 'acheter', 'koop'
    ]
    learn_keywords = [
        'discover', 'descubr', 'learn', 'saiba', 'confira',
        'découv', 'entdecken', 'ver ', 'voir', 'se alle',
        'bekijk', 'les mer', 'zobacz', 'en savoir', 'explore',
        'find', 'finde', '知る', '了解'
    ]
    urgency_keywords = [
        'aproveite', 'garanta já', 'claim', 'compre já',
        'en profiter', 'entre no jogo', 'jetzt', 'now >',
        'hoje', 'hoy', 'aujourd'
    ]

    for kw in buy_keywords:
        if kw in t:
            return 'Buy/Shop CTA'
    for kw in learn_keywords:
        if kw in t:
            return 'Learn CTA'
    for kw in urgency_keywords:
        if kw in t:
            return 'Urgency CTA'

    return 'Other CTA'


def is_aligned(objective, cta_bucket):
    """
    Alignment rule:
    Conversion/Sales → needs Buy/Shop CTA or Urgency CTA
    Awareness        → Learn CTA or Other CTA is fine
                       No CTA is also acceptable for awareness
    """
    if objective == 'Conversion/Sales':
        return cta_bucket in ('Buy/Shop CTA', 'Urgency CTA')
    elif objective == 'Awareness':
        return True  # Awareness is always considered aligned
    return False


class CTACampaignView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        quarter_filter = request.query_params.get('quarter', None)
        country_filter = request.query_params.get('country', None)
        retailer_filter = request.query_params.get('retailer', None)

        try:
            conn = get_warehouse_connection()
            cursor = conn.cursor()

            cursor.execute(CTA_CAMPAIGN_QUERY)
            cols = [c[0] for c in cursor.description]
            rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

            cursor.execute(MISALIGNED_EVIDENCE_QUERY)
            ev_cols = [c[0] for c in cursor.description]
            evidence_rows = [
                dict(zip(ev_cols, r))
                for r in cursor.fetchall()
            ]
            conn.close()

        except Exception as e:
            return Response({'error': str(e)}, status=500)

        # ── Apply role-based & regional scoping ──
        rows = apply_user_scope(rows, request.user, country_key='Country', region_key='Region', retailer_key='Retailer')
        evidence_rows = apply_user_scope(evidence_rows, request.user, country_key='Country', region_key='Region', retailer_key='Retailer')

        # Extract master filter options from scoped data
        all_quarters = sort_quarters_desc(set(
            r['quarter_label'] for r in rows
            if r.get('quarter_label')
        ))
        all_countries = sorted(set(
            r['Country'] for r in rows
            if r.get('Country') and r['Country'] != 'Unknown'
        ))
        all_retailers = sorted(set(
            r['Retailer'] for r in rows
            if r.get('Retailer') and r['Retailer'] != 'Unknown'
        ))

        # Apply filters to main rows
        if quarter_filter and quarter_filter not in ('All', 'All Quarters'):
            rows = [r for r in rows
                    if r.get('quarter_label') == quarter_filter]
            evidence_rows = [r for r in evidence_rows
                             if r.get('quarter_label') == quarter_filter]

        if country_filter and country_filter not in ('All', 'All Countries'):
            rows = [r for r in rows
                    if r.get('Country') == country_filter]
            evidence_rows = [r for r in evidence_rows
                             if r.get('Country') == country_filter]

        if retailer_filter and retailer_filter not in ('All', 'All Retailers'):
            rows = [r for r in rows
                    if r.get('Retailer') == retailer_filter]
            evidence_rows = [r for r in evidence_rows
                             if r.get('Retailer') == retailer_filter]

        # Classify each row
        for r in rows:
            r['cta_bucket'] = classify_cta(
                r.get('CTA_Flag', 'No'),
                r.get('CTA_Text', '')
            )
            r['aligned'] = is_aligned(
                r.get('Objective', ''),
                r['cta_bucket']
            )

        # --- KPI tiles ---
        total = len(rows)
        bucket_counts = {}
        for r in rows:
            b = r['cta_bucket']
            bucket_counts[b] = bucket_counts.get(b, 0) + 1

        kpi_tiles = [
            {
                'label': 'Buy/Shop CTA',
                'count': bucket_counts.get('Buy/Shop CTA', 0),
                'pct': round(bucket_counts.get(
                    'Buy/Shop CTA', 0) / total * 100, 1
                ) if total > 0 else 0,
                'color': '#F59E0B'  # amber
            },
            {
                'label': 'Learn CTA',
                'count': bucket_counts.get('Learn CTA', 0),
                'pct': round(bucket_counts.get(
                    'Learn CTA', 0) / total * 100, 1
                ) if total > 0 else 0,
                'color': '#06B6D4'  # cyan
            },
            {
                'label': 'No CTA',
                'count': bucket_counts.get('No CTA', 0),
                'pct': round(bucket_counts.get(
                    'No CTA', 0) / total * 100, 1
                ) if total > 0 else 0,
                'color': '#F97316'  # orange
            },
            {
                'label': 'Urgency CTA',
                'count': bucket_counts.get('Urgency CTA', 0),
                'pct': round(bucket_counts.get(
                    'Urgency CTA', 0) / total * 100, 1
                ) if total > 0 else 0,
                'color': '#8B5CF6'  # purple
            },
            {
                'label': 'Other CTA',
                'count': bucket_counts.get('Other CTA', 0),
                'pct': round(bucket_counts.get(
                    'Other CTA', 0) / total * 100, 1
                ) if total > 0 else 0,
                'color': '#6B7280'  # grey
            },
        ]

        # --- Aligned vs Misaligned ---
        aligned_count = sum(1 for r in rows if r['aligned'])
        misaligned_count = total - aligned_count

        # --- Retailer-wise CTA breakdown ---
        retailer_map = {}
        for r in rows:
            ret = r.get('Retailer', 'Unknown')
            if ret not in retailer_map:
                retailer_map[ret] = {
                    'retailer': ret,
                    'total': 0,
                    'Buy/Shop CTA': 0,
                    'Learn CTA': 0,
                    'No CTA': 0,
                    'Urgency CTA': 0,
                    'Other CTA': 0,
                }
            retailer_map[ret]['total'] += 1
            retailer_map[ret][r['cta_bucket']] += 1

        retailer_cta_breakdown = sorted(
            retailer_map.values(),
            key=lambda x: x['total'],
            reverse=True
        )[:20]

        # --- Top CTA phrases (and per objective) ---
        phrase_map = {}
        phrase_obj_map = {}
        for r in rows:
            txt = r.get('CTA_Text', '') or ''
            obj = r.get('Objective', 'Unknown')
            if txt and txt not in ('None', '', 'NA', 'No CTA'):
                phrase_map[txt] = phrase_map.get(txt, 0) + 1
                if txt not in phrase_obj_map:
                    phrase_obj_map[txt] = {'Conversion/Sales': 0, 'Awareness': 0, 'Other': 0}
                if obj in phrase_obj_map[txt]:
                    phrase_obj_map[txt][obj] += 1
                else:
                    phrase_obj_map[txt]['Other'] += 1

        top_cta_phrases = sorted([
            {
                'phrase': phrase,
                'volume': vol,
                'objective_breakdown': phrase_obj_map.get(phrase, {}),
                'conversion_count': phrase_obj_map.get(phrase, {}).get('Conversion/Sales', 0),
                'awareness_count': phrase_obj_map.get(phrase, {}).get('Awareness', 0),
            }
            for phrase, vol in phrase_map.items()
        ], key=lambda x: x['volume'], reverse=True)[:30]

        # --- Misaligned evidence (deduplicated) ---
        seen_urls = set()
        deduped_evidence = []
        for r in evidence_rows:
            url = r.get('Asset_URL', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                r['cta_bucket'] = classify_cta(
                    r.get('CTA_Flag', 'No'),
                    r.get('CTA_Text', '')
                )
                deduped_evidence.append(r)

        return Response({
            'total_creatives':        total,
            'aligned_count':          aligned_count,
            'misaligned_count':       misaligned_count,
            'kpi_tiles':              kpi_tiles,
            'retailer_cta_breakdown': retailer_cta_breakdown,
            'top_cta_phrases':        top_cta_phrases,
            'misaligned_evidence':    deduped_evidence[:50],
            'filter_options': {
                'quarters':  ['All Quarters'] + all_quarters,
                'countries': ['All Countries'] + all_countries,
                'retailers': ['All Retailers'] + all_retailers,
            }
        })
