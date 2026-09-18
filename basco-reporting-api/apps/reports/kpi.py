"""
Shared KPI calculations for reporting endpoints.

All business aggregations belong here so Overview, Retailer Performance,
and other consumers share one formula set. Views fetch rows; this module
turns rows into KPI payloads. The frontend should only format/display.
"""

import re

BASCO_TARGET = 90
BASCO_STRONG = 85
BASCO_WATCH_SCORE = 85
BASCO_WATCH = 80
BASCO_ACTION_SCORE = 76

COMPLIANCE_ISSUES = (
    ("text_mention", "MISSING TEXT MENTION"),
    ("logo", "MISSING LOGO"),
    ("badge", "MISSING BADGE"),
    ("key_visuals", "MISSING KEY VISUALS"),
)


def to_basco_pct(raw) -> float:
    try:
        n = float(raw)
    except (TypeError, ValueError):
        return 0.0
    if n <= 0:
        return 0.0
    if n <= 1.5:
        return n * 100.0
    if n > 150:
        return n / 100.0
    return n


def artwork_weight(row: dict) -> float:
    try:
        return float(row.get("queries") or row.get("artwork") or 0)
    except (TypeError, ValueError):
        return 0.0


def is_top_account(row: dict) -> bool:
    return str(row.get("topAccount") or row.get("top_account") or "").strip().upper() in (
        "YES",
        "TRUE",
        "1",
    )


_SKIP_ACCOUNTS = frozenset({"", "Unknown", "Unmapped", "None", "NA", "Intel Creative", "Red Baron"})


def _account_name(row: dict) -> str:
    return str(row.get("retailer") or row.get("retailer_name") or "").strip()


def unique_retailer_count(rows: list[dict]) -> int:
    return len({name for row in rows if (name := _account_name(row)) and name not in _SKIP_ACCOUNTS})


def _parent_name(row: dict) -> str:
    name = str(row.get("parent_account") or row.get("retailer") or row.get("retailer_name") or "").strip()
    if name in ("", "Unknown", "Unmapped", "None"):
        return ""
    return name


def median_attr_loss(values) -> float:
    vals = sorted(float(v) for v in values if v is not None)
    if not vals:
        return 0.0
    mid = len(vals) // 2
    if len(vals) % 2:
        return vals[mid]
    return (vals[mid - 1] + vals[mid]) / 2.0


def parent_quadrant(avg_score: float, attr_loss: float, benchmark: float = 0.0) -> str:
    """
    Strong: score >= 90 and loss < benchmark
    Watch: score >= 85 and loss >= benchmark
    Lower Priority: score > 76 and loss < benchmark
    Action Needed: score < 76 and loss >= benchmark
    Remaining cells: low loss -> Lower Priority; high loss -> Action Needed.
    """
    high_loss = float(attr_loss or 0) >= float(benchmark or 0)
    if not high_loss:
        if avg_score >= BASCO_TARGET:
            return "Strong Performance"
        return "Build Momentum"
    if avg_score >= BASCO_WATCH_SCORE:
        return "High-Value Opportunity"
    return "Priority Action"


def group_parent_accounts(rows: list[dict]) -> list[dict]:
    grouped: dict[str, dict] = {}
    for row in rows:
        name = _parent_name(row)
        if not name:
            continue
        score = to_basco_pct(row.get("basco", row.get("basco_score")))
        jobs = artwork_weight(row) or 1.0
        top = is_top_account(row)
        try:
            fmv = float(row.get("fmv") or 0)
        except (TypeError, ValueError):
            fmv = 0.0
        try:
            loss = float(row.get("attr_loss") or 0)
        except (TypeError, ValueError):
            loss = 0.0
        country = str(row.get("country") or "Global")
        region = str(row.get("region") or "")
        if name not in grouped:
            grouped[name] = {
                "parent_account": name,
                "country": country,
                "region": region,
                "weighted_score": score * jobs,
                "total_jobs": jobs,
                "fmv": fmv,
                "attr_loss": loss,
                "topAccount": top,
            }
        else:
            grouped[name]["weighted_score"] += score * jobs
            grouped[name]["total_jobs"] += jobs
            grouped[name]["fmv"] += fmv
            grouped[name]["attr_loss"] += loss
            if top:
                grouped[name]["topAccount"] = True

    result = []
    benchmark = median_attr_loss(item["attr_loss"] for item in grouped.values())
    for item in grouped.values():
        jobs = item["total_jobs"]
        avg = round(item["weighted_score"] / jobs, 1) if jobs else 0.0
        loss = int(item["attr_loss"])
        result.append({
            "parent_account": item["parent_account"],
            "country": item["country"],
            "region": item["region"],
            "basco_score": avg,
            "total_jobs": int(jobs),
            "fmv": int(item["fmv"]),
            "attr_loss": loss,
            "topAccount": item["topAccount"],
            "quadrant": parent_quadrant(avg, loss, benchmark),
        })
    return result


def attach_helpdesk_usage(parents: list[dict], helpdesk_rows: list[dict]) -> list[dict]:
    """Join BASCO_HELPDESK_MASTER_MERGE query/artwork counts onto parent-account rows."""
    totals: dict[str, dict] = {}
    for row in helpdesk_rows:
        name = str(row.get("parent_account") or row.get("Retailer") or "").strip()
        if not name or name in _SKIP_ACCOUNTS:
            continue
        key = normalize_parent(name)
        if not key:
            continue
        item = totals.setdefault(key, {"queries": 0, "artworks": 0})
        item["queries"] += int(row.get("helpdesk_queries") or 0)
        item["artworks"] += int(row.get("helpdesk_artworks") or 0)

    for parent in parents:
        key = normalize_parent(parent.get("parent_account") or "")
        hd = totals.get(key, {"queries": 0, "artworks": 0})
        parent["helpdesk_queries"] = hd["queries"]
        parent["helpdesk_artworks"] = hd["artworks"]
        parent["helpdesk_usage"] = "Yes" if (hd["queries"] or hd["artworks"]) else "No"
    return parents


def normalize_parent(name) -> str:
    text = str(name or "").lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def normalize_country(name) -> str:
    """Canonical country key so POP and Helpdesk labels land on the same bubble."""
    text = str(name or "").strip().lower()
    text = text.replace("&", " and ").replace("+", " plus ").replace(".", " ")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    text = " ".join(text.split())
    aliases = {
        "uae": "uae",
        "ae": "uae",
        "united arab emirates": "uae",
        "uk": "uk",
        "gb": "uk",
        "united kingdom": "uk",
        "great britain": "uk",
        "us": "us",
        "usa": "us",
        "united states": "us",
        "united states of america": "us",
        "canada": "canada",
        "ca": "canada",
        "can": "canada",
        "saudi arabia": "saudi arabia",
        "saudi": "saudi arabia",
        "ksa": "saudi arabia",
        "kingdom of saudi arabia": "saudi arabia",
        "eu plus": "eu+",
        "eu": "eu+",
        "europe": "eu+",
        "european union": "eu+",
        "nordics": "nordics",
        "nordic": "nordics",
        "scandinavia": "nordics",
        "south korea": "south korea",
        "korea": "south korea",
        "republic of korea": "south korea",
        "kr": "south korea",
        "czech republic": "czech republic",
        "czechia": "czech republic",
        "czech": "czech republic",
        "cz": "czech republic",
        "netherlands": "netherlands",
        "holland": "netherlands",
        "nl": "netherlands",
        "germany": "germany",
        "deutschland": "germany",
        "de": "germany",
        "france": "france",
        "fr": "france",
        "spain": "spain",
        "espana": "spain",
        "es": "spain",
        "italy": "italy",
        "italia": "italy",
        "it": "italy",
        "belgium": "belgium",
        "be": "belgium",
        "egypt": "egypt",
        "eg": "egypt",
        "mexico": "mexico",
        "mx": "mexico",
        "brazil": "brazil",
        "brasil": "brazil",
        "br": "brazil",
        "japan": "japan",
        "jp": "japan",
        "australia": "australia",
        "indonesia": "indonesia",
        "thailand": "thailand",
        "th": "thailand",
        "india": "india",
        "in": "india",
        "prc": "prc",
        "china": "prc",
        "cn": "prc",
        "taiwan": "taiwan",
        "tw": "taiwan",
        "new zealand": "new zealand",
        "nz": "new zealand",
        "south africa": "south africa",
        "za": "south africa",
    }
    return aliases.get(text, text)


def _row_country(row: dict) -> str:
    return str(row.get("country") or row.get("Country") or row.get("COUNTRY") or "").strip()


def _row_parent(row: dict) -> str:
    return str(
        row.get("parent_account")
        or row.get("PARENT_ACCOUNT")
        or row.get("Retailer")
        or row.get("retailer")
        or ""
    ).strip()


def attach_country_helpdesk(
    country_rows: list[dict],
    helpdesk_rows: list[dict],
    pop_parent_rows: list[dict],
) -> list[dict]:
    """
    Attach Helpdesk KPIs to each POP country bubble.

    Matches warehouse SSMS: POP parents in that country LEFT JOIN
    BASCO_HELPDESK_MASTER_MERGE on parent name (not Helpdesk country).
    Parents that appear in multiple POP markets therefore carry the same
    MATCHED Helpdesk counts onto each of those bubbles even when the merge
    table COUNTRY is blank or a different market. When a bubble has no
    parent match, COUNTRY on the merge table is used as a fallback.
    """
    hd_by_parent: dict[str, dict] = {}
    hd_by_country: dict[str, dict] = {}
    for row in helpdesk_rows:
        parent = _row_parent(row)
        if parent and parent not in _SKIP_ACCOUNTS:
            key = normalize_parent(parent)
            if key:
                item = hd_by_parent.setdefault(key, {"queries": 0, "artworks": 0})
                item["queries"] += int(row.get("helpdesk_queries") or row.get("HELPDESK_QUERIES") or 0)
                item["artworks"] += int(row.get("helpdesk_artworks") or row.get("HELPDESK_ARTWORKS") or 0)
        country_key = normalize_country(_row_country(row))
        if country_key:
            citem = hd_by_country.setdefault(country_key, {"queries": 0, "artworks": 0})
            citem["queries"] += int(row.get("helpdesk_queries") or row.get("HELPDESK_QUERIES") or 0)
            citem["artworks"] += int(row.get("helpdesk_artworks") or row.get("HELPDESK_ARTWORKS") or 0)

    totals: dict[str, dict] = {}
    for row in country_rows:
        key = normalize_country(_row_country(row))
        if key:
            totals[key] = {"queries": 0, "artworks": 0}

    seen_pairs: set[tuple[str, str]] = set()
    for row in pop_parent_rows:
        parent = _row_parent(row)
        if not parent or parent in _SKIP_ACCOUNTS:
            continue
        parent_key = normalize_parent(parent)
        country_key = normalize_country(_row_country(row))
        if not parent_key or not country_key or country_key not in totals:
            continue
        pair = (parent_key, country_key)
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        hd = hd_by_parent.get(parent_key)
        if not hd:
            continue
        totals[country_key]["queries"] += hd["queries"]
        totals[country_key]["artworks"] += hd["artworks"]

    for row in country_rows:
        country_key = normalize_country(_row_country(row))
        parent_stats = totals.get(country_key, {"queries": 0, "artworks": 0})
        country_stats = hd_by_country.get(country_key, {"queries": 0, "artworks": 0})
        stats = parent_stats if (parent_stats["queries"] or parent_stats["artworks"]) else country_stats
        row["helpdesk_queries"] = int(stats["queries"])
        row["helpdesk_artworks"] = int(stats["artworks"])
    return country_rows


def _weighted_avg_basco(rows: list[dict]) -> float:
    weight = 0.0
    total = 0.0
    for row in rows:
        w = artwork_weight(row) or 1.0
        total += to_basco_pct(row.get("basco", row.get("basco_score"))) * w
        weight += w
    if weight <= 0:
        return 0.0
    return round(total / weight, 1)


def _basco_delta_pts(rows: list[dict], current_avg: float):
    weight = 0.0
    total = 0.0
    for row in rows:
        prev = row.get("prev_basco")
        if prev is None or prev == "":
            continue
        w = artwork_weight(row) or 1.0
        total += to_basco_pct(prev) * w
        weight += w
    if weight <= 0:
        return None
    return round(current_avg - (total / weight), 1)


def _top_compliance_issue(rows: list[dict]) -> dict:
    best = {
        "key": COMPLIANCE_ISSUES[0][0],
        "label": COMPLIANCE_ISSUES[0][1],
        "rate": 100.0,
        "creatives": 0,
        "retailer_count": 0,
    }
    lowest_rate = float("inf")

    for key, label in COMPLIANCE_ISSUES:
        weighted = 0.0
        weight = 0.0
        missing = 0.0
        for row in rows:
            raw = row.get(key)
            if raw is None or raw == "":
                continue
            rate = to_basco_pct(raw)
            w = artwork_weight(row)
            if w <= 0:
                continue
            weighted += rate * w
            weight += w
            missing += w * max(0.0, 1.0 - rate / 100.0)
        rate = (weighted / weight) if weight > 0 else 100.0
        if rate < lowest_rate:
            lowest_rate = rate
            best = {
                "key": key,
                "label": label,
                "rate": round(rate, 1),
                "creatives": int(round(missing)),
                "retailer_count": unique_retailer_count(
                    [row for row in rows if row.get(key) not in (None, "")]
                ),
            }
    return best


def _account_health_buckets(rows: list[dict]) -> dict:
    """Proportion of distinct retailers by BASCO band (Healthy / Watch / Critical)."""
    grouped: dict[str, dict] = {}
    for row in rows:
        name = _account_name(row)
        if not name or name in _SKIP_ACCOUNTS:
            continue
        score = to_basco_pct(row.get("basco", row.get("basco_score")))
        weight = artwork_weight(row) or 1.0
        if name not in grouped:
            grouped[name] = {"weighted": 0.0, "weight": 0.0}
        grouped[name]["weighted"] += score * weight
        grouped[name]["weight"] += weight

    healthy = 0
    watch = 0
    critical = 0
    for item in grouped.values():
        avg = item["weighted"] / item["weight"] if item["weight"] else 0.0
        if avg >= BASCO_STRONG:
            healthy += 1
        elif avg >= BASCO_WATCH:
            watch += 1
        else:
            critical += 1

    total = healthy + watch + critical or 1
    healthy_pct = round(healthy / total * 100)
    watch_pct = round(watch / total * 100)
    return {
        "healthy": healthy,
        "strong": healthy,
        "watch": watch,
        "critical": critical,
        "need_attention": critical,
        "healthy_pct": healthy_pct,
        "strong_pct": healthy_pct,
        "watch_pct": watch_pct,
        "critical_pct": max(0, 100 - healthy_pct - watch_pct),
        "need_attention_pct": max(0, 100 - healthy_pct - watch_pct),
    }


def _missing_volume(rows: list[dict], key: str) -> float:
    missing = 0.0
    for row in rows:
        raw = row.get(key)
        if raw is None or raw == "":
            continue
        rate = to_basco_pct(raw)
        weight = artwork_weight(row)
        if weight <= 0:
            continue
        missing += weight * max(0.0, 1.0 - rate / 100.0)
    return missing


def compute_execution_gaps(rows: list[dict]) -> dict:
    """POP execution-gap KPIs for Overview Retailer Execution Gaps."""
    size = _missing_volume(rows, "key_visuals")
    placement = _missing_volume(rows, "logo") + _missing_volume(rows, "badge")
    missing = _missing_volume(rows, "text_mention")
    gap_total = size + placement + missing

    size_pct = round(size / gap_total * 100) if gap_total else 0
    placement_pct = round(placement / gap_total * 100) if gap_total else 0
    missing_pct = max(0, 100 - size_pct - placement_pct) if gap_total else 0

    largest_key = "Missing"
    largest_val = missing
    if size >= largest_val and size >= placement:
        largest_key = "Size"
        largest_val = size
    elif placement >= largest_val:
        largest_key = "Placement"

    insights = {
        "Size": "Most execution gaps come from key visual size and presence",
        "Placement": "Most execution gaps come from logo and badge placement",
        "Missing": "Most execution gaps come from missing required elements",
    }

    artwork = sum(artwork_weight(r) or 0.0 for r in rows)
    at_risk_art = 0.0
    for row in rows:
        if to_basco_pct(row.get("basco", row.get("basco_score"))) < BASCO_TARGET:
            at_risk_art += artwork_weight(row) or 0.0

    missing_brand = int(round(
        _missing_volume(rows, "logo")
        + _missing_volume(rows, "badge")
        + _missing_volume(rows, "text_mention")
        + _missing_volume(rows, "key_visuals")
    ))

    return {
        "creatives_at_risk_pct": round(at_risk_art / artwork * 100, 1) if artwork else 0.0,
        "missing_brand_elements": missing_brand,
        "largest_gap": {
            "size_pct": size_pct,
            "placement_pct": placement_pct,
            "missing_pct": missing_pct,
            "dominant": largest_key,
            "insight": insights[largest_key],
        },
    }


def compute_league_kpis(rows: list[dict]) -> dict:
    """KPI payload for a filtered retailer-performance row set."""
    parents = group_parent_accounts(rows)
    below = [p for p in parents if p["basco_score"] < BASCO_TARGET]
    avg = _weighted_avg_basco(rows)
    health = _account_health_buckets(rows)

    queries = int(sum(artwork_weight(r) for r in rows))
    fmv_loss = int(sum(float(r.get("attr_loss") or 0) for r in rows))
    fmv_protected = int(sum(float(r.get("attr_gain") or 0) for r in rows))

    return {
        "total_retailers": unique_retailer_count(rows),
        "row_count": len(rows),
        "parent_account_count": len(parents),
        "avg_basco": avg,
        "basco_delta_pts": _basco_delta_pts(rows, avg),
        "total_queries": queries,
        "creatives_evaluated": queries,
        "fmv_loss": fmv_loss,
        "fmv_protected": fmv_protected,
        "retailers_below_target": len(below),
        "below_target_top_accounts": sum(1 for p in below if p["topAccount"]),
        "top_compliance_issue": _top_compliance_issue(rows),
        "retailer_health": health,
    }


def compute_market_kpis(country_rows: list[dict]) -> dict:
    if not country_rows:
        return {
            "markets_count": 0,
            "avg_score": 0.0,
            "markets_at_risk": 0,
            "markets_on_track": 0,
        }
    total_jobs = 0.0
    weighted = 0.0
    at_risk = 0
    for row in country_rows:
        jobs = float(row.get("total_jobs") or 1)
        score = float(row.get("avg_basco_score") or 0)
        total_jobs += jobs
        weighted += score * jobs
        if score < BASCO_ACTION_SCORE:
            at_risk += 1
    avg = round(weighted / total_jobs, 1) if total_jobs else 0.0
    count = len(country_rows)
    return {
        "markets_count": count,
        "avg_score": avg,
        "markets_at_risk": at_risk,
        "markets_on_track": max(0, count - at_risk),
    }


def compute_visual_kpis(total_creatives: int, intel_layouts: int, custom_layouts: int, intel_plus_custom: int) -> dict:
    total = int(total_creatives or 0)
    intel_any = int(intel_plus_custom or 0)
    adoption = round(intel_any / total * 100, 1) if total > 0 else 0.0
    at_risk = max(0, total - intel_any)
    return {
        "total_creatives": total,
        "used_intel_visuals": int(intel_layouts or 0),
        "intel_layouts_count": int(intel_layouts or 0),
        "custom_intel_layouts_count": int(custom_layouts or 0),
        "intel_plus_custom_layouts": intel_any,
        "master_visual_adoption_pct": adoption,
        "creatives_at_risk": at_risk,
    }


def classify_campaign_bucket(campaign_type) -> str:
    text = str(campaign_type or "").strip().lower()
    compact = text.replace(" ", "").replace("-", "").replace("_", "")
    if "igd" in compact:
        return "IGD"
    if "intelday" in compact:
        return "Intel Days"
    return "Other"


def compute_helpdesk_kpis(league_rows: list[dict], visual_rows: list[dict]) -> dict:
    """Helpdesk usage vs live creatives (POP queries + AIHD campaign mix)."""
    artwork = 0.0
    approved = 0.0
    for row in league_rows:
        weight = artwork_weight(row) or 0.0
        artwork += weight
        if to_basco_pct(row.get("basco", row.get("basco_score"))) >= BASCO_TARGET:
            approved += weight

    igd = 0
    intel_days = 0
    other = 0
    visual_names = set()
    for row in visual_rows:
        count = int(row.get("creative_count") or 1)
        bucket = classify_campaign_bucket(row.get("Campaign_Type") or row.get("campaign_type"))
        if bucket == "IGD":
            igd += count
        elif bucket == "Intel Days":
            intel_days += count
        else:
            other += count
        name = str(row.get("Retailer") or row.get("retailer") or "").strip()
        if name and name not in _SKIP_ACCOUNTS:
            visual_names.add(name)

    pop_names = set()
    for row in league_rows:
        name = _account_name(row)
        if name and name not in _SKIP_ACCOUNTS:
            pop_names.add(name)

    mix_total = igd + intel_days + other or 1
    igd_pct = round(igd / mix_total * 100)
    intel_days_pct = round(intel_days / mix_total * 100)
    outside = len(visual_names - pop_names)

    return {
        "queries_received": int(artwork),
        "final_approval_pct": round(approved / artwork * 100, 1) if artwork else 0.0,
        "intel_specific_creatives": igd + intel_days,
        "campaign_mix": {
            "igd": igd,
            "igd_pct": igd_pct,
            "intel_days": intel_days,
            "intel_days_pct": intel_days_pct,
            "other": other,
            "other_pct": max(0, 100 - igd_pct - intel_days_pct),
        },
        "retailers_outside_loop": outside,
        "insight": (
            f"Helpdesk adoption is growing, but {outside} retailers are still outside the support loop"
        ),
    }


def is_low_intel_voice(narrative) -> bool:
    text = str(narrative or "").strip().lower()
    if not text or text in ("unknown", "none", "na", ""):
        return True
    return "intel" not in text


def product_gap_bucket(content_str) -> str:
    text = str(content_str or "").lower()
    if "gaming" in text:
        return "Gaming"
    if "core ultra" in text or "ultra" in text:
        return "Core Ultra"
    return "Core Processor"


def compute_creative_effectiveness(cta_rows: list[dict]) -> dict:
    """Objective vs CTA alignment and Intel-voice gaps for Overview."""
    from .cta_campaign_views import classify_cta, is_aligned

    total = 0
    low_voice = 0
    aligned = 0
    missing_cta = 0
    misaligned_gaming = 0
    mix = {"Gaming": 0, "Core Ultra": 0, "Core Processor": 0}

    for row in cta_rows:
        total += 1
        bucket = classify_cta(row.get("CTA_Flag", "No"), row.get("CTA_Text", ""))
        objective = row.get("Objective", "")
        row_aligned = is_aligned(objective, bucket)
        if is_low_intel_voice(row.get("Narrative_Style")):
            low_voice += 1
        if row_aligned:
            aligned += 1
        if bucket == "No CTA":
            missing_cta += 1
        if not row_aligned:
            gap = product_gap_bucket(row.get("Content"))
            mix[gap] = mix.get(gap, 0) + 1
            if gap == "Gaming":
                misaligned_gaming += 1

    mix_total = mix["Gaming"] + mix["Core Ultra"] + mix["Core Processor"] or 1
    gaming_pct = round(mix["Gaming"] / mix_total * 100)
    ultra_pct = round(mix["Core Ultra"] / mix_total * 100)

    return {
        "low_intel_voice_pct": round(low_voice / total * 100, 1) if total else 0.0,
        "objective_aligned_pct": round(aligned / total * 100, 1) if total else 0.0,
        "missing_cta": missing_cta,
        "missing_cta_total": total,
        "product_mix": {
            "gaming": mix["Gaming"],
            "gaming_pct": gaming_pct,
            "core_ultra": mix["Core Ultra"],
            "core_ultra_pct": ultra_pct,
            "core_processor": mix["Core Processor"],
            "core_processor_pct": max(0, 100 - gaming_pct - ultra_pct),
        },
        "misaligned_gaming": misaligned_gaming,
        "insight": (
            f"Intel voice of attribute is critical, and {misaligned_gaming} gaming creatives are misaligned"
        ),
    }


_PRICE_DISCOUNT_TYPES = frozenset({
    "discount", "price", "affordability", "cashback offer", "cashback",
})


def is_price_discount_offer(offer_type) -> bool:
    text = str(offer_type or "").strip().lower()
    return any(token in text for token in _PRICE_DISCOUNT_TYPES)


def compute_promotion_led(offer_rows: list[dict]) -> dict:
    """Promotion-led creative mix for Overview."""
    from .cta_campaign_views import classify_cta

    total = len(offer_rows)
    promo_rows = [r for r in offer_rows if r.get("Offer_Flag") == "Yes"]
    no_offer = total - len(promo_rows)
    promo_total = len(promo_rows)

    without_cta = 0
    price_discount = 0
    buckets = {"Buy/Shop CTA": 0, "Urgency CTA": 0, "No CTA": 0, "Learn CTA": 0}
    weak_retailers = set()
    weak_count = 0

    for row in promo_rows:
        bucket = classify_cta(row.get("CTA_Flag", "No"), row.get("CTA_Text", ""))
        if bucket == "Other CTA":
            bucket = "Learn CTA"
        if bucket not in buckets:
            buckets["Learn CTA"] += 1
        else:
            buckets[bucket] += 1
        if row.get("CTA_Flag") == "No" or bucket == "No CTA":
            without_cta += 1
            weak_count += 1
            name = str(row.get("Retailer") or "").strip()
            if name and name not in _SKIP_ACCOUNTS:
                weak_retailers.add(name)
        if is_price_discount_offer(row.get("Offer_Type")):
            price_discount += 1

    mix_total = promo_total or 1
    buy_pct = round(buckets["Buy/Shop CTA"] / mix_total * 100)
    urgency_pct = round(buckets["Urgency CTA"] / mix_total * 100)
    no_cta_pct = round(buckets["No CTA"] / mix_total * 100)

    return {
        "promo_without_cta_pct": round(without_cta / promo_total * 100, 1) if promo_total else 0.0,
        "price_discount": price_discount,
        "price_discount_total": promo_total,
        "without_offer": no_offer,
        "without_offer_total": total,
        "cta_mix": {
            "buy_shop": buckets["Buy/Shop CTA"],
            "buy_shop_pct": buy_pct,
            "urgency": buckets["Urgency CTA"],
            "urgency_pct": urgency_pct,
            "no_cta": buckets["No CTA"],
            "no_cta_pct": no_cta_pct,
            "learn": buckets["Learn CTA"],
            "learn_pct": max(0, 100 - buy_pct - urgency_pct - no_cta_pct),
        },
        "weak_promo_count": weak_count,
        "weak_retailer_count": len(weak_retailers),
        "insight": (
            f"{weak_count} of promotion-led creatives of {len(weak_retailers)} retailers "
            "are not fully equipped to convert shopper interest into action"
        ),
    }


def compute_pop_pms_adoption(league_rows: list[dict]) -> float:
    """Artwork-weighted Key Visuals compliance on POP submissions."""
    total_w = 0.0
    weighted = 0.0
    for row in league_rows:
        weight = artwork_weight(row) or 0.0
        if weight <= 0:
            continue
        total_w += weight
        weighted += to_basco_pct(row.get("key_visuals")) * weight
    return round(weighted / total_w, 1) if total_w else 0.0


def is_cobranded_asset(visual_style, layout_category) -> bool:
    text = str(visual_style or "").strip().lower()
    compact = text.replace(" ", "").replace("-", "").replace("_", "")
    if "cobrand" in compact or "cobranded" in compact:
        return True
    from .visual_adoption_views import is_intel_layout_only
    return is_intel_layout_only(layout_category)


def classify_pms_usage(usage, layout_category=None) -> str:
    text = str(usage or "").strip().lower()
    compact = text.replace(" ", "").replace("-", "").replace("_", "")
    if "complete" in compact or compact in ("full", "fullyused"):
        return "Completely Used"
    if "partial" in compact:
        return "Partially Used"
    from .visual_adoption_views import is_custom_intel_layout, is_intel_layout_only
    if is_intel_layout_only(layout_category):
        return "Completely Used"
    if is_custom_intel_layout(layout_category):
        return "Partially Used"
    return "Unused"


def has_pms_asset(row: dict) -> bool:
    name = str(row.get("Visual_Content_Name") or row.get("visual_content_name") or "").strip()
    return name.lower() not in ("", "none", "na", "unknown", "null")


def compute_intel_visual_adoption(visual_rows: list[dict], pop_adoption_pct: float) -> dict:
    """Helpdesk Intel visual / PMS usage for Overview Intel Visual Adoption."""
    from .visual_adoption_views import (
        is_any_intel_layout,
        is_custom_intel_layout,
        is_intel_layout_only,
    )

    total = 0
    intel_any = 0
    cobranded = 0
    retail_custom = 0
    partial = 0
    complete = 0

    for row in visual_rows:
        count = int(row.get("creative_count") or 1)
        total += count
        layout = row.get("Layout_Category")
        if is_any_intel_layout(layout, row.get("Intel_Visual_Flag")):
            intel_any += count
        if is_cobranded_asset(row.get("Visual_Style"), layout):
            cobranded += count
        if is_custom_intel_layout(layout):
            retail_custom += count
        if has_pms_asset(row) or is_any_intel_layout(layout, row.get("Intel_Visual_Flag")):
            bucket = classify_pms_usage(row.get("Intel_Visual_Usage"), layout)
            if bucket == "Completely Used":
                complete += count
            elif bucket == "Partially Used":
                partial += count

    pms_total = partial + complete or 1
    partial_pct = round(partial / pms_total * 100) if (partial + complete) else 0
    complete_pct = max(0, 100 - partial_pct) if (partial + complete) else 0
    adoption = round(intel_any / total * 100, 1) if total else 0.0
    cobranded_pct = round(cobranded / total * 100, 1) if total else 0.0
    gap = round(pop_adoption_pct - adoption, 1)
    gap_abs = abs(int(round(gap)))
    direction = "lower" if gap < 0 else "higher"

    return {
        "total_creatives": total,
        "used_intel": intel_any,
        "adoption_pct": adoption,
        "creatives_at_risk": max(0, total - intel_any),
        "cobranded_pct": cobranded_pct,
        "retail_custom": retail_custom,
        "retail_custom_total": total,
        "pms_mix": {
            "partial": partial,
            "partial_pct": partial_pct,
            "complete": complete,
            "complete_pct": complete_pct,
        },
        "pop_adoption_pct": pop_adoption_pct,
        "helpdesk_adoption_pct": adoption,
        "pop_gap_pts": gap,
        "insight": (
            f"PMS asset adoption during POP-submission is {gap_abs}% {direction} "
            "than Helpdesk submitted creatives"
        ),
    }
