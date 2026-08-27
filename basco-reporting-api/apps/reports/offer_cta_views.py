from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import get_warehouse_connection
from .views import sort_quarters_desc, apply_user_scope
from .offer_cta_queries import (
    OFFER_CTA_QUERY,
    OFFER_EVIDENCE_QUERY
)


def classify_product_family(content_str):
    """
    Split semicolon-separated Content and return
    the top-level product family for each token.
    Returns list of unique families for this creative.
    """
    if not content_str or content_str in ('None', '', 'NA', 'Unknown'):
        return ['Unknown']

    tokens = [
        t.strip() for t in
        content_str.replace(';', '|').split('|')
        if t.strip()
    ]
    families = set()
    for t in tokens:
        if 'Gaming Core Ultra' in t:
            families.add('Gaming Core Ultra')
        elif 'Gaming' in t:
            families.add('Gaming')
        elif 'Intel Core Ultra' in t:
            families.add('Intel Core Ultra')
        elif 'Intel Core Processors' in t:
            families.add('Intel Core Processors')
        elif 'Intel Processors' in t:
            families.add('Intel Processors')
        elif 'Intel Evo Edition' in t:
            families.add('Intel Evo Edition')
        elif 'Intel Evo' in t:
            families.add('Intel Evo')
        elif 'Intel Arc' in t:
            families.add('Intel Arc Graphics')
        elif 'Intel Iris' in t:
            families.add('Intel Iris Graphics')
        else:
            families.add('Other')
    return list(families) if families else ['Unknown']


# Canonical offer type order for the bar chart
OFFER_TYPE_ORDER = [
    'Affordability', 'Multiple Offer', 'Discount',
    'Bundle Offer', 'Cashback Offer', 'Price',
    'Limited-Time', 'No Offer'
]


class OfferCTAView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        quarter_filter = request.query_params.get('quarter', None)
        country_filter = request.query_params.get('country', None)
        retailer_filter = request.query_params.get('retailer', None)

        try:
            conn = get_warehouse_connection()
            cursor = conn.cursor()

            cursor.execute(OFFER_CTA_QUERY)
            cols = [c[0] for c in cursor.description]
            rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

            cursor.execute(OFFER_EVIDENCE_QUERY)
            ev_cols = [c[0] for c in cursor.description]
            ev_rows = [dict(zip(ev_cols, r))
                       for r in cursor.fetchall()]
            conn.close()

        except Exception as e:
            return Response({'error': str(e)}, status=500)

        # ── Apply role-based & regional scoping ──
        rows = apply_user_scope(rows, request.user, country_key='Country', region_key='Region', retailer_key='Retailer')
        ev_rows = apply_user_scope(ev_rows, request.user, country_key='Country', region_key='Region', retailer_key='Retailer')

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

        # Apply filters
        for dataset in [rows, ev_rows]:
            if quarter_filter and quarter_filter not in ('All', 'All Quarters'):
                dataset[:] = [
                    r for r in dataset
                    if r.get('quarter_label') == quarter_filter
                ]
            if country_filter and country_filter not in ('All', 'All Countries'):
                dataset[:] = [
                    r for r in dataset
                    if r.get('Country') == country_filter
                ]
            if retailer_filter and retailer_filter not in ('All', 'All Retailers'):
                dataset[:] = [
                    r for r in dataset
                    if r.get('Retailer') == retailer_filter
                ]

        # --- KPI counts ---
        offer_rows = [r for r in rows
                      if r.get('Offer_Flag') == 'Yes']
        no_offer_rows = [r for r in rows
                         if r.get('Offer_Flag') != 'Yes']
        conv_ready = [r for r in offer_rows
                      if r.get('CTA_Flag') == 'Yes']
        missing_cta = [r for r in offer_rows
                       if r.get('CTA_Flag') == 'No']

        # --- Offer Type × CTA stacked bar ---
        offer_type_map = {}
        for r in offer_rows:
            ot = r.get('Offer_Type', 'No Offer')
            if ot in ('None', '', 'NA'):
                ot = 'No Offer'
            if ot not in offer_type_map:
                offer_type_map[ot] = {'has_cta': 0, 'no_cta': 0}
            if r.get('CTA_Flag') == 'Yes':
                offer_type_map[ot]['has_cta'] += 1
            else:
                offer_type_map[ot]['no_cta'] += 1

        offer_cta_bars = []
        for ot in OFFER_TYPE_ORDER:
            if ot in offer_type_map:
                d = offer_type_map[ot]
                total = d['has_cta'] + d['no_cta']
                offer_cta_bars.append({
                    'offer_type': ot,
                    'has_cta': d['has_cta'],
                    'no_cta': d['no_cta'],
                    'total': total,
                    'cta_pct': round(
                        d['has_cta'] / total * 100, 1
                    ) if total > 0 else 0
                })

        # --- Product × Offer Type heatmap ---
        # Map: family → offer_type → count
        product_offer_map = {}
        all_offer_types = set()

        for r in offer_rows:
            ot = r.get('Offer_Type', 'No Offer')
            if ot in ('None', '', 'NA'):
                ot = 'No Offer'
            all_offer_types.add(ot)
            families = classify_product_family(
                r.get('Content', '')
            )
            for fam in families:
                if fam not in product_offer_map:
                    product_offer_map[fam] = {}
                product_offer_map[fam][ot] = (
                    product_offer_map[fam].get(ot, 0) + 1
                )

        # Convert to heatmap rows with % per family
        heatmap_offer_types = [
            ot for ot in OFFER_TYPE_ORDER
            if ot in all_offer_types
        ]
        product_heatmap = []
        priority_families = [
            'Gaming', 'Gaming Core Ultra', 'Intel Core Ultra',
            'Intel Core Processors', 'Intel Evo Edition',
            'Intel Processors', 'Intel Evo',
            'Intel Arc Graphics', 'Intel Iris Graphics'
        ]
        for fam in priority_families:
            if fam in product_offer_map:
                fam_data = product_offer_map[fam]
                fam_total = sum(fam_data.values())
                row_data = {'product': fam, 'total': fam_total}
                for ot in heatmap_offer_types:
                    cnt = fam_data.get(ot, 0)
                    row_data[ot] = cnt
                    row_data[f'{ot}_pct'] = round(
                        cnt / fam_total * 100, 1
                    ) if fam_total > 0 else 0
                product_heatmap.append(row_data)

        # --- Evidence tables (deduplicated) ---
        # Table 1: Offer but missing CTA
        seen1 = set()
        promo_missing_cta = []
        for r in ev_rows:
            url = r.get('Asset_URL', '')
            if (url and url not in seen1
                    and r.get('Offer_Type') not in
                    ('No Offer', 'None', '', 'NA')
                    and r.get('CTA_Flag') == 'No'):
                seen1.add(url)
                families = classify_product_family(
                    r.get('Content', '')
                )
                promo_missing_cta.append({
                    **r,
                    'product': ', '.join(families[:2]),
                    'cta_status': 'No CTA'
                })

        # Table 2: All offer types including no offer
        seen2 = set()
        all_offer_evidence = []
        for r in ev_rows:
            url = r.get('Asset_URL', '')
            if url and url not in seen2:
                seen2.add(url)
                families = classify_product_family(
                    r.get('Content', '')
                )
                all_offer_evidence.append({
                    **r,
                    'product': ', '.join(families[:2]),
                    'cta_status': (
                        'Has CTA' if r.get('CTA_Flag') == 'Yes'
                        else 'No CTA'
                    )
                })

        return Response({
            'kpis': {
                'total_offer_creatives': len(offer_rows),
                'conversion_ready': len(conv_ready),
                'offer_missing_cta': len(missing_cta),
                'no_offer_creatives': len(no_offer_rows),
            },
            'offer_cta_bars': offer_cta_bars,
            'heatmap_offer_types': heatmap_offer_types,
            'product_heatmap': product_heatmap,
            'promo_missing_cta': promo_missing_cta[:50],
            'all_offer_evidence': all_offer_evidence[:50],
            'filter_options': {
                'quarters': ['All Quarters'] + all_quarters,
                'countries': ['All Countries'] + all_countries,
                'retailers': ['All Retailers'] + all_retailers,
            }
        })
