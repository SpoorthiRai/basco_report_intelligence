from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import get_warehouse_connection
from .views import sort_quarters_desc, apply_user_scope
from .cta_campaign_queries import CTA_CAMPAIGN_QUERY
from .evidence_views import PRODUCT_FAMILIES, extract_product_families


def classify_cta(cta_flag, cta_text):
    """
    Classify a CTA into one of 5 buckets.
    Order matters — check No CTA first.
    """
    if cta_flag == 'No' or not cta_text or cta_text in ('None', '', 'NA'):
        return 'Missing CTA'

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
        drive_objective = request.query_params.get('drive_objective', None)
        cta_product = request.query_params.get('cta_product', None)

        try:
            conn = get_warehouse_connection()
            cursor = conn.cursor()

            cursor.execute(CTA_CAMPAIGN_QUERY)
            cols = [c[0] for c in cursor.description]
            rows = [dict(zip(cols, r)) for r in cursor.fetchall()]
            conn.close()

        except Exception as e:
            return Response({'error': str(e)}, status=500)

        # ── Apply role-based & regional scoping ──
        rows = apply_user_scope(rows, request.user, country_key='Country', region_key='Region', retailer_key='Retailer')

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

        # Apply country / retailer first so QoQ can compare adjacent quarters
        if country_filter and country_filter not in ('All', 'All Countries'):
            rows = [r for r in rows if r.get('Country') == country_filter]
        if retailer_filter and retailer_filter not in ('All', 'All Retailers'):
            rows = [r for r in rows if r.get('Retailer') == retailer_filter]

        for r in rows:
            r['cta_bucket'] = classify_cta(
                r.get('CTA_Flag', 'No'),
                r.get('CTA_Text', '')
            )
            r['aligned'] = is_aligned(
                r.get('Objective', ''),
                r['cta_bucket']
            )

        # QoQ alignment from classified rows before the quarter slice
        qoq_map = {}
        for r in rows:
            q = r.get('quarter_label')
            if not q:
                continue
            item = qoq_map.setdefault(q, {'aligned': 0, 'total': 0})
            item['total'] += 1
            if r.get('aligned'):
                item['aligned'] += 1
        qoq_pct = {
            q: round(v['aligned'] / v['total'] * 100, 1) if v['total'] else 0
            for q, v in qoq_map.items()
        }
        qoq_quarters = sort_quarters_desc(list(qoq_pct.keys()))
        current_q = None
        prev_q = None
        if quarter_filter and quarter_filter not in ('All', 'All Quarters'):
            current_q = quarter_filter if quarter_filter in qoq_pct else None
        elif qoq_quarters:
            current_q = qoq_quarters[0]
        if current_q and current_q in qoq_quarters:
            idx = qoq_quarters.index(current_q)
            prev_q = qoq_quarters[idx + 1] if idx + 1 < len(qoq_quarters) else None
        aligned_qoq_delta = None
        if current_q and prev_q and current_q in qoq_pct and prev_q in qoq_pct:
            aligned_qoq_delta = round(qoq_pct[current_q] - qoq_pct[prev_q], 1)
        aligned_qoq_label = f'vs {prev_q}' if prev_q else 'vs prior quarter'
        misaligned_qoq_delta = round(-aligned_qoq_delta, 1) if aligned_qoq_delta is not None else None

        if quarter_filter and quarter_filter not in ('All', 'All Quarters'):
            rows = [r for r in rows if r.get('quarter_label') == quarter_filter]

        total = len(rows)
        bucket_counts = {}
        for r in rows:
            b = r['cta_bucket']
            bucket_counts[b] = bucket_counts.get(b, 0) + 1

        def _tile(label, color):
            count = bucket_counts.get(label, 0)
            return {
                'label': label,
                'count': count,
                'pct': round(count / total * 100, 1) if total > 0 else 0,
                'color': color,
            }

        kpi_tiles = [
            _tile('Missing CTA', '#64748B'),
            _tile('Buy/Shop CTA', '#1E429F'),
            _tile('Learn CTA', '#0EA5E9'),
            _tile('Urgency CTA', '#1E429F'),
            _tile('Other CTA', '#CBD5E1'),
        ]

        aligned_count = sum(1 for r in rows if r['aligned'])
        misaligned_count = total - aligned_count

        # --- Retailer-wise CTA breakdown (optional objective for Drive Action) ---
        drive_rows = rows
        if drive_objective in ('Conversion/Sales', 'Awareness'):
            drive_rows = [r for r in rows if r.get('Objective') == drive_objective]

        retailer_map = {}
        for r in drive_rows:
            ret = r.get('Retailer', 'Unknown')
            if ret not in retailer_map:
                retailer_map[ret] = {
                    'retailer': ret,
                    'total': 0,
                    'Buy/Shop CTA': 0,
                    'Learn CTA': 0,
                    'Missing CTA': 0,
                    'Urgency CTA': 0,
                    'Other CTA': 0,
                }
            retailer_map[ret]['total'] += 1
            bucket = r.get('cta_bucket') or 'Missing CTA'
            retailer_map[ret][bucket] = retailer_map[ret].get(bucket, 0) + 1

        retailer_cta_breakdown = sorted(
            retailer_map.values(),
            key=lambda x: x['total'],
            reverse=True
        )[:20]

        # --- Clean CTA buckets for Most-Used Calls to Action ---
        phrase_rows = rows
        if cta_product and cta_product not in ('All', 'All Products'):
            phrase_rows = [
                r for r in rows
                if cta_product in extract_product_families(r.get('Content') or r.get('Product') or '')
            ]

        bucket_phrase_map = {}
        bucket_obj_map = {}
        for r in phrase_rows:
            bucket = r.get('cta_bucket') or 'Missing CTA'
            obj = r.get('Objective', 'Unknown')
            bucket_phrase_map[bucket] = bucket_phrase_map.get(bucket, 0) + 1
            if bucket not in bucket_obj_map:
                bucket_obj_map[bucket] = {'Conversion/Sales': 0, 'Awareness': 0, 'Other': 0}
            if obj in bucket_obj_map[bucket]:
                bucket_obj_map[bucket][obj] += 1
            else:
                bucket_obj_map[bucket]['Other'] += 1

        bucket_order = ['Missing CTA', 'Buy/Shop CTA', 'Urgency CTA', 'Learn CTA', 'Other CTA']
        top_cta_phrases = [
            {
                'phrase': bucket,
                'volume': bucket_phrase_map.get(bucket, 0),
                'objective_breakdown': bucket_obj_map.get(bucket, {}),
                'conversion_count': bucket_obj_map.get(bucket, {}).get('Conversion/Sales', 0),
                'awareness_count': bucket_obj_map.get(bucket, {}).get('Awareness', 0),
            }
            for bucket in bucket_order
            if bucket_phrase_map.get(bucket, 0) > 0
        ]

        seen_urls = set()
        deduped_evidence = []
        ordered = sorted(rows, key=lambda r: r.get('Send_Date') or '', reverse=True)
        for r in ordered:
            url = r.get('Asset_URL') or ''
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            voice = str(r.get('Voice_Of_Attribute') or '').strip()
            if voice in ('', 'None', 'NA', 'Unknown'):
                voice = '—'
            aligned = bool(r.get('aligned'))
            deduped_evidence.append({
                'Asset_URL': url,
                'Objective': r.get('Objective'),
                'CTA_Text': r.get('CTA_Text'),
                'CTA_Flag': r.get('CTA_Flag'),
                'Narrative_Style': r.get('Narrative_Style'),
                'Voice_Of_Attribute': voice,
                'Retailer': r.get('Retailer'),
                'Region': r.get('Region'),
                'Country': r.get('Country'),
                'quarter_label': r.get('quarter_label'),
                'cta_bucket': r.get('cta_bucket') or 'Missing CTA',
                'aligned': aligned,
                'alignment': 'Aligned' if aligned else 'Misaligned',
            })

        total = aligned_count + misaligned_count
        alignment_pct = round(aligned_count / total * 100) if total else 0
        missing_tile = next((t for t in kpi_tiles if t.get('label') == 'Missing CTA'), None)
        no_cta_pct = missing_tile.get('pct', 0) if missing_tile else 0

        return Response({
            'total_creatives':        total,
            'aligned_count':          aligned_count,
            'misaligned_count':       misaligned_count,
            'alignment_pct':          alignment_pct,
            'need_alignment_pct':     max(0, 100 - alignment_pct),
            'no_cta_pct':             no_cta_pct,
            'aligned_qoq_delta_pts':  aligned_qoq_delta,
            'misaligned_qoq_delta_pts': misaligned_qoq_delta,
            'qoq_label':              aligned_qoq_label,
            'kpi_tiles':              kpi_tiles,
            'retailer_cta_breakdown': retailer_cta_breakdown,
            'top_cta_phrases':        top_cta_phrases,
            'misaligned_evidence':    deduped_evidence[:100],
            'filter_options': {
                'quarters':  ['All Quarters'] + all_quarters,
                'countries': ['All Countries'] + all_countries,
                'retailers': ['All Retailers'] + all_retailers,
                'products':  PRODUCT_FAMILIES,
            }
        })
