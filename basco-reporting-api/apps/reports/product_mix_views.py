from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.db import get_warehouse_connection
from .product_mix_queries import HELPDESK_FEEDBACK_MERGE_QUERY, PRODUCT_MIX_QUERY
from .queries import HELPDESK_MASTER_MERGE_PARENT_USAGE_QUERY, LEAGUE_TABLE_QUERY
from .kpi import is_skipped_account, is_top_account, normalize_parent
from .permissions import IsAnyReportingRole
from .views import apply_user_scope, sort_quarters_desc, build_cascading_filter_options, is_all_filter


VISIBILITY_FAMILY_ORDER = [
    'Core Processor',
    'Core Ultra',
    'Gaming',
    'Gaming Core Ultra',
    'Evo Edition',
    'Other',
]

BRAND_ELEMENT_BUTTONS = ('Text', 'Visual', 'Badge', 'Logo')
_SKIP_NAMES = ('Unknown', 'None', '', 'Unmapped', 'NA', 'Intel Creative', 'Red Baron', 'Multiple Products')


def visibility_family(family: str) -> str:
    """Collapse Helpdesk families into the Product Visibility chart buckets."""
    if family == 'Gaming Core Ultra':
        return 'Gaming Core Ultra'
    if family == 'Gaming':
        return 'Gaming'
    if family == 'Intel Core Ultra':
        return 'Core Ultra'
    if family in ('Intel Core Processors', 'Intel Processors', 'Intel Core Processor'):
        return 'Core Processor'
    if family in ('Intel Evo Edition', 'Intel Evo'):
        return 'Evo Edition'
    return 'Other'


def classify_token(token):
    """
    Takes a raw Content token like 'Intel Core Ultra-Series 3'
    and returns (family, series_or_gen).
    """
    t = token.strip()

    if 'Gaming Core Ultra' in t:
        family = 'Gaming Core Ultra'
    elif 'Gaming' in t:
        family = 'Gaming'
    elif 'Intel Core Ultra' in t:
        family = 'Intel Core Ultra'
    elif 'Intel Core Processors' in t or 'Intel Core Processor' in t:
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

    suffix = ''
    if '-' in t:
        suffix = t.split('-', 1)[1].strip()
        suffix = suffix.replace('Series 2|3', 'Series 2 / Series 3')
        suffix = suffix.replace('Series 1|Series 2|Series 3', 'Series 1 / 2 / 3')
        suffix = suffix.replace('Series 1|Series 2', 'Series 1 / Series 2')
        suffix = suffix.replace('12th Gen|13th Gen|14th Gen', '12th / 13th / 14th Gen')
        suffix = suffix.replace('14th Gen|13th Gen', '13th Gen / 14th Gen')
        suffix = suffix.replace('13th Gen|14th Gen', '13th Gen / 14th Gen')
        suffix = suffix.replace('14th Gen|12th Gen', '12th Gen / 14th Gen')
        suffix = suffix.replace('12th Gen|14th Gen', '12th Gen / 14th Gen')
        suffix = suffix.replace('|', ' / ')

    if 'Series' in suffix:
        gen_label = suffix
    elif 'Gen' in suffix:
        gen_label = suffix
    elif suffix:
        gen_label = suffix
    else:
        if 'Ultra' in family:
            gen_label = 'Series/Gen not specified'
        elif 'Processor' in family or 'Gaming' in family:
            gen_label = 'Series/Gen not specified'
        elif 'Evo' in family or 'Graphics' in family:
            gen_label = 'Standard'
        else:
            gen_label = 'Series/Gen not specified'

    return family, gen_label


def _split_multi(value) -> list[str]:
    return [part.strip() for part in str(value or '').replace(';', '|').split('|') if part.strip()]


def _expand_suffix_parts(family_prefix: str, suffix: str) -> list[str]:
    """Turn '13th Gen|14th Gen' or 'Series 2|3' into one token per series/gen."""
    parts = [part.strip() for part in suffix.replace(';', '|').split('|') if part.strip()]
    if not parts:
        return [family_prefix]
    if len(parts) == 1:
        return [f"{family_prefix}-{parts[0]}"]

    out = []
    prev_kind = None
    for part in parts:
        lower = part.lower()
        if 'series' in lower:
            prev_kind = 'series'
            out.append(f"{family_prefix}-{part}")
        elif 'gen' in lower:
            prev_kind = 'gen'
            out.append(f"{family_prefix}-{part}")
        elif prev_kind == 'series' or (out and 'Series' in out[-1]):
            out.append(f"{family_prefix}-Series {part}")
            prev_kind = 'series'
        elif prev_kind == 'gen':
            label = part if 'gen' in lower else f"{part} Gen"
            out.append(f"{family_prefix}-{label}")
            prev_kind = 'gen'
        else:
            out.append(f"{family_prefix}-{part}")
    return out


def expand_content_tokens(content) -> list[str]:
    """Split CONTENT on ';' then expand pipe-separated gens after the family hyphen.

    Example: 'Gaming-13th Gen|14th Gen' → ['Gaming-13th Gen', 'Gaming-14th Gen']
    Example: 'Intel Core Ultra-Series 3 ; Gaming Core Ultra-Series 3' → two family tokens
    """
    if not content:
        return []
    tokens = []
    for segment in [seg.strip() for seg in str(content).split(';') if seg.strip()]:
        if '-' in segment:
            family_prefix, suffix = segment.split('-', 1)
            tokens.extend(_expand_suffix_parts(family_prefix.strip(), suffix.strip()))
        else:
            tokens.extend(_split_multi(segment))
    return tokens


def expand_gen_labels(gen_value) -> list[str]:
    """Split GEN '13th Gen|14th Gen' or 'Series 2|3' into separate labels."""
    parts = [part.strip() for part in str(gen_value or '').replace(';', '|').split('|') if part.strip()]
    if not parts:
        return []
    out = []
    prev_kind = None
    for part in parts:
        lower = part.lower()
        if 'series' in lower:
            prev_kind = 'series'
            out.append(part)
        elif 'gen' in lower:
            prev_kind = 'gen'
            out.append(part)
        elif prev_kind == 'series':
            out.append(f"Series {part}")
            prev_kind = 'series'
        elif prev_kind == 'gen':
            out.append(part if 'gen' in lower else f"{part} Gen")
            prev_kind = 'gen'
        else:
            out.append(part)
    return out


def _pretty_feedback_label(text: str) -> str:
    raw = " ".join(str(text or "").split())
    if not raw:
        return "—"
    parts = []
    for word in raw.replace("_", " ").split(" "):
        if "/" in word:
            parts.append("/".join(p.capitalize() if p else p for p in word.split("/")))
        elif word.lower() in {"of", "and", "or", "to", "a", "an"}:
            parts.append(word.lower())
        else:
            parts.append(word.capitalize())
    if parts:
        parts[0] = parts[0][:1].upper() + parts[0][1:]
    return " ".join(parts)


def _is_blank_product(value) -> bool:
    return str(value or "").strip() in _SKIP_NAMES


def product_families_for_row(row) -> list[str]:
    """Family comes only from PRODUCT. Null / blank product rows are ignored."""
    product = str(row.get("Product") or "").strip()
    if not product or _is_blank_product(product):
        return []
    family, _ = classify_token(product)
    return [family]


class ProductMixView(APIView):
    permission_classes = [IsAuthenticated, IsAnyReportingRole]

    def get(self, request):
        quarter_filter = request.query_params.get('quarter', 'All') or 'All'
        region_filter  = request.query_params.get('region', 'All') or 'All'
        country_filter = request.query_params.get('country', 'All') or 'All'
        retailer_filter = request.query_params.get('retailer', 'All') or 'All'
        year_filter = request.query_params.get('year', 'All') or 'All'
        top_account_filter = (request.query_params.get('top_account', 'All') or 'All').strip().lower()
        family_filter  = request.query_params.get('family', 'Intel Core Ultra') or 'Intel Core Ultra'
        series_filter  = request.query_params.get('target_series', 'Series 3') or 'Series 3'

        try:
            conn   = get_warehouse_connection()
            cursor = conn.cursor()

            cursor.execute(PRODUCT_MIX_QUERY)
            cols = [c[0] for c in cursor.description]
            all_raw_rows = [dict(zip(cols, r)) for r in cursor.fetchall()]

            cursor.execute(LEAGUE_TABLE_QUERY)
            pop_rows = [dict(zip([c[0] for c in cursor.description], r)) for r in cursor.fetchall()]

            cursor.execute(HELPDESK_MASTER_MERGE_PARENT_USAGE_QUERY)
            hd_rows = [dict(zip([c[0] for c in cursor.description], r)) for r in cursor.fetchall()]

            cursor.execute(HELPDESK_FEEDBACK_MERGE_QUERY)
            feedback_rows = [dict(zip([c[0] for c in cursor.description], r)) for r in cursor.fetchall()]

            conn.close()
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        # ── Apply role-based & regional scoping ──
        all_raw_rows = apply_user_scope(all_raw_rows, request.user, country_key='Country', region_key='Region', retailer_key='Retailer')
        pop_rows = apply_user_scope(pop_rows, request.user, country_key='country', region_key='region', retailer_key='child_account')
        hd_rows = apply_user_scope(hd_rows, request.user, country_key='country', region_key='region', retailer_key='child_account')
        feedback_rows = apply_user_scope(
            feedback_rows,
            request.user,
            country_key='Country',
            region_key='Region',
            retailer_key='Retailer',
        )

        top_parents = {
            normalize_parent(r.get('child_account') or r.get('retailer'))
            for r in pop_rows
            if is_top_account(r) and normalize_parent(r.get('child_account') or r.get('retailer'))
        }

        # ── Cascading Quarter → Region → Country → Retailer options ──
        filter_options = build_cascading_filter_options(
            all_raw_rows,
            selected_quarter=quarter_filter,
            selected_region=region_filter,
            selected_country=country_filter,
            quarter_keys=("quarter_label",),
            region_keys=("Region",),
            country_keys=("Country",),
            retailer_keys=("Retailer", "child_account", "retailer"),
        )
        # Merge POP retailers into the cascading retailer list for the selected scope.
        scoped_for_retailers = all_raw_rows
        if not is_all_filter(quarter_filter, 'All', 'All Quarters'):
            scoped_for_retailers = [r for r in scoped_for_retailers if r.get('quarter_label') == quarter_filter]
        if not is_all_filter(region_filter, 'All', 'All Regions'):
            wanted_region = region_filter.strip().upper()
            scoped_for_retailers = [
                r for r in scoped_for_retailers
                if str(r.get('Region') or '').strip().upper() == wanted_region
            ]
        if not is_all_filter(country_filter, 'All', 'All Countries'):
            scoped_for_retailers = [r for r in scoped_for_retailers if r.get('Country') == country_filter]
        pop_retailer_scope = pop_rows
        if not is_all_filter(quarter_filter, 'All', 'All Quarters'):
            pop_retailer_scope = [r for r in pop_retailer_scope if str(r.get('quarter') or '') == quarter_filter]
        if not is_all_filter(region_filter, 'All', 'All Regions'):
            wanted_region = region_filter.strip().upper()
            pop_retailer_scope = [
                r for r in pop_retailer_scope
                if str(r.get('region') or '').strip().upper() == wanted_region
            ]
        if not is_all_filter(country_filter, 'All', 'All Countries'):
            pop_retailer_scope = [r for r in pop_retailer_scope if r.get('country') == country_filter]
        retailer_set = set(filter_options.get('retailers') or [])
        for r in pop_retailer_scope:
            name = r.get('child_account') or r.get('retailer')
            if name and not is_skipped_account(name):
                retailer_set.add(name)
        filter_options['retailers'] = ['All Retailers'] + sorted(
            n for n in retailer_set if n and n != 'All Retailers'
        )

        raw_years = set()
        for r in all_raw_rows:
            y = r.get('year_label')
            if y not in (None, '', 'Unknown'):
                raw_years.add(str(int(y)) if str(y).isdigit() or isinstance(y, (int, float)) else str(y))
        for r in pop_rows:
            q = str(r.get('quarter') or '')
            parts = q.split()
            if parts:
                raw_years.add(parts[-1])
        master_years = sorted(raw_years, reverse=True)

        # Apply filters
        rows = all_raw_rows
        if not is_all_filter(quarter_filter, 'All', 'All Quarters'):
            rows = [r for r in rows if r.get('quarter_label') == quarter_filter]
        if not is_all_filter(region_filter, 'All', 'All Regions'):
            wanted_region = region_filter.strip().upper()
            rows = [r for r in rows if str(r.get('Region') or '').strip().upper() == wanted_region]
        if not is_all_filter(country_filter, 'All', 'All Countries'):
            rows = [r for r in rows if r.get('Country') == country_filter]
        if not is_all_filter(year_filter, 'All', 'All Years'):
            rows = [
                r for r in rows
                if str(r.get('year_label') or '') == str(year_filter)
                or str(r.get('quarter_label') or '').endswith(str(year_filter))
            ]
        if not is_all_filter(retailer_filter, 'All', 'All Retailers'):
            wanted_ret = normalize_parent(retailer_filter)
            rows = [r for r in rows if normalize_parent(r.get('Retailer')) == wanted_ret]
        if top_account_filter in ('yes', 'true', '1', 'top'):
            rows = [r for r in rows if normalize_parent(r.get('Retailer')) in top_parents]
        elif top_account_filter in ('no', 'false', '0'):
            rows = [r for r in rows if normalize_parent(r.get('Retailer')) not in top_parents]
        rows = [r for r in rows if not is_skipped_account(r.get('Retailer'))]
        rows = [
            r for r in rows
            if str(r.get('Product') or '').strip() and not _is_blank_product(r.get('Product'))
        ]

        # --- Expand rows ---
        # PRODUCT is the family source. GEN supplies series/gen when present;
        # otherwise series/gen is read from the PRODUCT value itself.
        expanded = []
        all_series_set = set()
        for row in rows:
            families = product_families_for_row(row)
            if not families:
                continue
            product_name = str(row.get('Product') or '').strip()
            gen_from_col = expand_gen_labels(row.get('Gen'))

            if gen_from_col:
                for family in families:
                    for label in gen_from_col:
                        if label not in ('Standard', 'Series/Gen not specified') and not str(label).startswith('Unspecified'):
                            all_series_set.add(label)
                        expanded.append({
                            'thread_id': row['Email_Thread_ID'],
                            'retailer': row['Retailer'],
                            'region': row['Region'],
                            'country': row['Country'],
                            'quarter': row['quarter_label'],
                            'raw_token': product_name,
                            'family': family,
                            'gen_label': label,
                            'product': row.get('Product'),
                        })
            else:
                family, gen_label = classify_token(product_name)
                if gen_label and not str(gen_label).startswith('Unspecified') and gen_label not in ('Standard', 'Series/Gen not specified'):
                    all_series_set.add(gen_label)
                expanded.append({
                    'thread_id': row['Email_Thread_ID'],
                    'retailer': row['Retailer'],
                    'region': row['Region'],
                    'country': row['Country'],
                    'quarter': row['quarter_label'],
                    'raw_token': product_name,
                    'family': family,
                    'gen_label': gen_label,
                    'product': row.get('Product'),
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
            haystacks = [r.get('Product', '') or '']
            haystacks.extend(expand_gen_labels(r.get('Gen')))
            if any(search_token.lower() in str(h).lower() for h in haystacks if h):
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
        for row in rows:
            ret = row.get('Retailer')
            if not ret or is_skipped_account(ret):
                continue
            for family in product_families_for_row(row):
                fam = visibility_family(family)
                if ret not in retailer_family_map:
                    retailer_family_map[ret] = {}
                retailer_family_map[ret][fam] = retailer_family_map[ret].get(fam, 0) + 1

        all_families = list(VISIBILITY_FAMILY_ORDER)

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
            if formatted not in series_options and not s.startswith('Unspecified') and s not in ('Standard', 'Series/Gen not specified'):
                series_options.append(formatted)

        if not series_options:
            series_options = [
                'Core Ultra Series 3', 'Core Ultra Series 2', 'Core Ultra Series 1',
                'Core 14th Gen', 'Core 13th Gen', 'Core 12th Gen', 'Core 11th Gen', 'Core 10th Gen'
            ]

        # Formatted target series for display
        display_target = format_series_option(search_token)

        def _year_of_quarter(label) -> str:
            parts = str(label or '').split()
            return parts[-1] if parts else ''

        def _match_geo_quarter_year(row, country_key, region_key, quarter_key):
            if quarter_filter and quarter_filter not in ('All', 'All Quarters'):
                if str(row.get(quarter_key) or '') != quarter_filter:
                    return False
            if year_filter and year_filter not in ('All', 'All Years'):
                if _year_of_quarter(row.get(quarter_key)) != str(year_filter) and str(row.get('year_label') or '') != str(year_filter):
                    return False
            if region_filter and region_filter not in ('All', 'All Regions'):
                if str(row.get(region_key) or '').strip().upper() != region_filter.strip().upper():
                    return False
            if country_filter and country_filter not in ('All', 'All Countries'):
                if row.get(country_key) != country_filter:
                    return False
            return True

        hd_filtered = [r for r in hd_rows if _match_geo_quarter_year(r, 'country', 'region', 'quarter_label')]
        if retailer_filter and retailer_filter not in ('All', 'All Retailers'):
            wanted_ret = normalize_parent(retailer_filter)
            hd_filtered = [r for r in hd_filtered if normalize_parent(r.get('child_account')) == wanted_ret]
        if top_account_filter in ('yes', 'true', '1', 'top'):
            hd_filtered = [r for r in hd_filtered if normalize_parent(r.get('child_account')) in top_parents]
        elif top_account_filter in ('no', 'false', '0'):
            hd_filtered = [r for r in hd_filtered if normalize_parent(r.get('child_account')) not in top_parents]

        query_map = {}
        for r in hd_filtered:
            name = r.get('child_account') or 'Unknown'
            if not name or is_skipped_account(name):
                continue
            item = query_map.setdefault(name, {'retailer': name, 'queries': 0})
            item['queries'] += int(r.get('helpdesk_queries') or 0)
        retailer_queries = sorted(query_map.values(), key=lambda x: x['queries'], reverse=True)[:20]

        fb_filtered = [r for r in feedback_rows if _match_geo_quarter_year(r, 'Country', 'Region', 'quarter_label')]
        if retailer_filter and retailer_filter not in ('All', 'All Retailers'):
            wanted_ret = normalize_parent(retailer_filter)
            fb_filtered = [
                r for r in fb_filtered
                if normalize_parent(r.get('Retailer') or r.get('Child_Account')) == wanted_ret
            ]
        if top_account_filter in ('yes', 'true', '1', 'top'):
            fb_filtered = [r for r in fb_filtered if is_top_account({**r, 'topAccount': r.get('Top_Account')})]
        elif top_account_filter in ('no', 'false', '0'):
            fb_filtered = [r for r in fb_filtered if not is_top_account({**r, 'topAccount': r.get('Top_Account')})]

        by_element = {key: {} for key in BRAND_ELEMENT_BUTTONS}
        for row in fb_filtered:
            element = str(row.get('BRAND_ELEMENT') or '').strip()
            category = str(row.get('ELEMENT_FEEDBACK_CATEGORY') or '').strip()
            if element not in by_element or not category:
                continue
            by_element[element][category] = by_element[element].get(category, 0) + 1

        compliance_guidance_by_element = {}
        for element in BRAND_ELEMENT_BUTTONS:
            counts = by_element[element]
            total = sum(counts.values())
            compliance_guidance_by_element[element] = sorted(
                [
                    {
                        'label': _pretty_feedback_label(category),
                        'count': n,
                        'pct': round(n / total * 100, 1) if total else 0,
                    }
                    for category, n in counts.items()
                ],
                key=lambda item: item['count'],
                reverse=True,
            )

        return Response({
            'series3_by_region':      series_by_region,
            'retailer_product_mix':   retailer_product_mix,
            'all_families':           all_families,
            'gen_series_breakdown':   gen_series_breakdown,
            'active_family':          active_family,
            'family_options':         all_family_options,
            'target_series':          display_target,
            'series_options':         series_options,
            'retailer_queries':       retailer_queries,
            'compliance_guidance':    [],
            'compliance_guidance_by_element': compliance_guidance_by_element,
            'brand_elements':         list(BRAND_ELEMENT_BUTTONS),
            'filter_options': {
                **filter_options,
                'years':     ['All Years'] + master_years,
                'top_accounts': ['All', 'Yes', 'No'],
            }
        })

