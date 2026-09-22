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
    return str(
        row.get("child_account") or row.get("retailer") or row.get("retailer_name") or ""
    ).strip()


def unique_retailer_count(rows: list[dict]) -> int:
    return len({name for row in rows if (name := _account_name(row)) and name not in _SKIP_ACCOUNTS})


def _parent_name(row: dict) -> str:
    name = str(
        row.get("child_account")
        or row.get("Child_Account")
        or row.get("retailer")
        or row.get("Retailer")
        or ""
    ).strip()
    if name in ("", "Unknown", "Unmapped", "None"):
        return ""
    return name


def _row_quarter_label(row: dict) -> str:
    return str(row.get("quarter") or row.get("quarter_label") or row.get("period") or "").strip()


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
    grouped: dict[tuple, dict] = {}
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
        quarter = _row_quarter_label(row)
        key = (name, quarter, country)
        if key not in grouped:
            grouped[key] = {
                "parent_account": name,
                "child_account": name,
                "quarter": quarter,
                "country": country,
                "region": region,
                "score_sum": score,
                "score_n": 1,
                "total_jobs": jobs,
                "fmv": fmv,
                "attr_loss": loss,
                "topAccount": top,
            }
        else:
            grouped[key]["score_sum"] += score
            grouped[key]["score_n"] += 1
            grouped[key]["total_jobs"] += jobs
            grouped[key]["fmv"] += fmv
            grouped[key]["attr_loss"] += loss
            if top:
                grouped[key]["topAccount"] = True

    result = []
    benchmark = median_attr_loss(item["attr_loss"] for item in grouped.values())
    for item in grouped.values():
        n = item["score_n"]
        avg = round(item["score_sum"] / n, 1) if n else 0.0
        loss = int(item["attr_loss"])
        result.append({
            "parent_account": item["parent_account"],
            "child_account": item["child_account"],
            "quarter": item["quarter"],
            "country": item["country"],
            "region": item["region"],
            "basco_score": avg,
            "total_jobs": int(item["total_jobs"]),
            "fmv": int(item["fmv"]),
            "attr_loss": loss,
            "topAccount": item["topAccount"],
            "quadrant": parent_quadrant(avg, loss, benchmark),
        })
    return result


def attach_helpdesk_usage(parents: list[dict], helpdesk_rows: list[dict]) -> list[dict]:
    """Join BASCO_HELPDESK_MASTER_MERGE query/artwork counts onto child-account rows."""
    by_child_quarter: dict[tuple, dict] = {}
    by_child: dict[str, dict] = {}
    for row in helpdesk_rows:
        name = str(row.get("child_account") or row.get("Retailer") or "").strip()
        if not name or name in _SKIP_ACCOUNTS:
            continue
        key = normalize_parent(name)
        if not key:
            continue
        quarter = str(row.get("quarter_label") or row.get("quarter") or "").strip().upper()
        pair = by_child_quarter.setdefault((key, quarter), {"queries": 0, "artworks": 0})
        rolled = by_child.setdefault(key, {"queries": 0, "artworks": 0})
        queries = int(row.get("helpdesk_queries") or 0)
        artworks = int(row.get("helpdesk_artworks") or 0)
        pair["queries"] += queries
        pair["artworks"] += artworks
        rolled["queries"] += queries
        rolled["artworks"] += artworks

    for parent in parents:
        key = normalize_parent(parent.get("child_account") or "")
        quarter = str(parent.get("quarter") or "").strip().upper()
        hd = by_child_quarter.get((key, quarter)) or by_child.get(key, {"queries": 0, "artworks": 0})
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
        row.get("child_account")
        or row.get("CHILD_ACCOUNT")
        or row.get("Child_Account")
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

    Matches warehouse SSMS: POP child accounts in that country LEFT JOIN
    BASCO_HELPDESK_MASTER_MERGE on child_account (not Helpdesk country).
    Children that appear in multiple POP markets therefore carry the same
    MATCHED Helpdesk counts onto each of those bubbles even when the merge
    table COUNTRY is blank or a different market. When a bubble has no
    child match, COUNTRY on the merge table is used as a fallback.
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


def _simple_avg_basco(rows: list[dict]) -> float:
    """Unweighted mean of Score on the already-filtered row set, rounded to 1 decimal."""
    scores = []
    for row in rows:
        raw = row.get("basco", row.get("basco_score"))
        if raw is None or raw == "":
            continue
        scores.append(to_basco_pct(raw))
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 1)


def _basco_delta_pts(rows: list[dict], current_avg: float):
    prevs = []
    for row in rows:
        prev = row.get("prev_basco")
        if prev is None or prev == "":
            continue
        prevs.append(to_basco_pct(prev))
    if not prevs:
        return None
    return round(current_avg - (sum(prevs) / len(prevs)), 1)


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
    """Distinct child-account health: Good performer (Score > 90) vs Bad performer (Score <= 90)."""
    grouped: dict[str, dict] = {}
    for row in rows:
        name = _account_name(row)
        if not name or name in _SKIP_ACCOUNTS:
            continue
        score = to_basco_pct(row.get("basco", row.get("basco_score")))
        if name not in grouped:
            grouped[name] = {"score_sum": 0.0, "n": 0}
        grouped[name]["score_sum"] += score
        grouped[name]["n"] += 1

    good = 0
    bad = 0
    for item in grouped.values():
        avg = item["score_sum"] / item["n"] if item["n"] else 0.0
        if avg > BASCO_TARGET:
            good += 1
        else:
            bad += 1

    total = good + bad or 1
    good_pct = round(good / total * 100)
    bad_pct = max(0, 100 - good_pct)
    return {
        "good_performer": good,
        "bad_performer": bad,
        "good_performer_pct": good_pct,
        "bad_performer_pct": bad_pct,
        "healthy": good,
        "strong": good,
        "watch": 0,
        "critical": bad,
        "need_attention": bad,
        "healthy_pct": good_pct,
        "strong_pct": good_pct,
        "watch_pct": 0,
        "critical_pct": bad_pct,
        "need_attention_pct": bad_pct,
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


def _pretty_cat_label(text: str) -> str:
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


def compute_top_compliance_issue_element_cat(feedback_rows: list[dict]) -> dict:
    """Top compliance issue is the most frequent ELEMENT_CAT across POP feedback."""
    grouped: dict[str, dict] = {}
    for row in feedback_rows:
        cat = str(row.get("ELEMENT_CAT") or "").strip()
        if not cat:
            continue
        item = grouped.setdefault(cat, {"creatives": set(), "retailers": set()})
        creative = str(row.get("Creative") or "").strip()
        if creative:
            item["creatives"].add(creative.lower())
        retailer = str(row.get("Child_Account") or row.get("Retailer") or "").strip()
        if retailer:
            item["retailers"].add(retailer.lower())
    if not grouped:
        return {"label": "—", "creatives": 0, "rate": 0, "retailer_count": 0, "key": ""}
    key, item = max(
        grouped.items(),
        key=lambda kv: (len(kv[1]["creatives"]), len(kv[1]["retailers"])),
    )
    return {
        "key": key,
        "label": _pretty_cat_label(key),
        "creatives": len(item["creatives"]),
        "retailer_count": len(item["retailers"]),
        "rate": 0,
    }


def compute_creatives_at_risk_hist(hist_rows: list[dict]) -> dict:
    """Creatives whose child-account BASCO score is below 90%."""
    by_child: dict[str, list[float]] = {}
    child_of_row: list[str] = []
    for row in hist_rows:
        child = str(row.get("Child_Account") or row.get("CHILD_ACCOUNT") or "").strip()
        if not child:
            child = str(row.get("MD_Tag") or row.get("MD_TAG") or "")
        child_of_row.append(child)
        by_child.setdefault(child, []).append(to_basco_pct(row.get("BASCO_SCORE")))

    at_risk_children = {
        name
        for name, scores in by_child.items()
        if scores and (sum(scores) / len(scores)) < BASCO_TARGET
    }
    count = sum(1 for child in child_of_row if child in at_risk_children)
    return {"count": count, "total": len(hist_rows)}


GAP_KEYS = ("size", "placement", "missing", "usage", "outdated", "recommended")
GAP_LABELS = {
    "size": "Size",
    "placement": "Placement",
    "missing": "Missing",
    "usage": "Usage",
    "outdated": "Outdated",
    "recommended": "Recommended",
}


def classify_feedback_gap(cat, element_cat):
    c = str(cat or "").upper()
    e = str(element_cat or "").upper()
    if "MISSING ELEMENTS" in c:
        return ("missing",)
    if "OUTDATED" in c:
        return ("outdated",)
    if "RECOMMENDED" in c:
        return ("recommended",)
    if "USAGE" in c:
        return ("usage",)
    if "SIZE/PLACEMENT" in c or "SIZE/PLACEMENT" in e:
        if "N-SPACE" in e:
            return ("placement",)
        return ("size", "placement")
    if "SIZE" in c or "SIZE" in e:
        return ("size",)
    if "PLACEMENT" in c or "PLACEMENT" in e or "N-SPACE" in e:
        return ("placement",)
    if "MISSING" in e:
        return ("missing",)
    if "OUTDATED" in e:
        return ("outdated",)
    if "RECOMMENDED" in e:
        return ("recommended",)
    if "USAGE" in e or "INCORRECT" in e:
        return ("usage",)
    return tuple()


def compute_pop_execution_gaps(
    hist_rows: list[dict],
    hosted_rows: list[dict],
    feedback_rows: list[dict],
) -> dict:
    at_risk = compute_creatives_at_risk_hist(hist_rows)
    at_risk_pct = (
        round(at_risk["count"] / at_risk["total"] * 100, 1) if at_risk["total"] else 0.0
    )

    missing_creatives = {
        str(row.get("Creative") or "").strip().lower()
        for row in feedback_rows
        if str(row.get("CAT") or "").strip().upper() == "MISSING ELEMENTS"
        and str(row.get("Creative") or "").strip()
    }

    promo_without_cta = sum(
        1
        for row in hosted_rows
        if str(row.get("Offer_Flag") or "").strip().lower() == "yes"
        and str(row.get("CTA_Flag") or "").strip().lower() == "no"
    )

    counts = {key: 0.0 for key in GAP_KEYS}
    for row in feedback_rows:
        buckets = classify_feedback_gap(row.get("CAT"), row.get("ELEMENT_CAT"))
        if not buckets:
            continue
        weight = 1.0 / len(buckets)
        for bucket in buckets:
            counts[bucket] += weight
    total_gaps = sum(counts.values())
    raw = {key: (counts[key] / total_gaps * 100 if total_gaps else 0.0) for key in GAP_KEYS}
    rounded = {key: int(round(val)) for key, val in raw.items()}
    if total_gaps:
        drift = sum(rounded.values()) - 100
        if drift:
            top = max(GAP_KEYS, key=lambda key: raw[key])
            rounded[top] = max(0, rounded[top] - drift)

    dominant = max(GAP_KEYS, key=lambda key: counts[key]) if total_gaps else "missing"
    insights = {
        "size": "Most execution gaps come from size of brand elements",
        "placement": "Most execution gaps come from placement of brand elements",
        "missing": "Most execution gaps come from missing required elements",
        "usage": "Most execution gaps come from improper usage of brand elements",
        "outdated": "Most execution gaps come from outdated brand elements",
        "recommended": "Most execution gaps come from recommended element updates",
    }

    return {
        "creatives_at_risk_pct": at_risk_pct,
        "missing_brand_elements": len(missing_creatives),
        "promo_without_cta": promo_without_cta,
        "largest_gap": {
            "size_pct": rounded["size"] if total_gaps else 0,
            "placement_pct": rounded["placement"] if total_gaps else 0,
            "missing_pct": rounded["missing"] if total_gaps else 0,
            "usage_pct": rounded["usage"] if total_gaps else 0,
            "outdated_pct": rounded["outdated"] if total_gaps else 0,
            "recommended_pct": rounded["recommended"] if total_gaps else 0,
            "dominant": GAP_LABELS[dominant],
            "insight": insights[dominant],
        },
    }


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
    avg = _simple_avg_basco(rows)
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


_SKIP_CAMPAIGN_TYPES = frozenset({"", "na", "none", "unknown", "null"})


def classify_campaign_bucket(campaign_type):
    """Map AIHD CAMPAIGN_TYPE. NA / blank / Unknown are excluded (None)."""
    text = str(campaign_type or "").strip()
    compact = text.lower().replace(" ", "").replace("-", "").replace("_", "")
    if compact in _SKIP_CAMPAIGN_TYPES:
        return None
    if "intelgamer" in compact or compact == "igd" or compact.endswith("igd"):
        return "Intel Gamer Days"
    if "intelday" in compact:
        return "Intel Days"
    if "backtoschool" in compact or compact == "bts":
        return "Back to School"
    return "Other"


def previous_quarter_label(label: str) -> str:
    match = re.search(r"Q\s*([1-4])\s+(\d{4})", str(label or ""), re.I)
    if not match:
        return ""
    quarter = int(match.group(1))
    year = int(match.group(2))
    if quarter == 1:
        return f"Q4 {year - 1}"
    return f"Q{quarter - 1} {year}"


def _helpdesk_child_key(row: dict) -> str:
    return normalize_parent(
        row.get("Child_Account")
        or row.get("child_account")
        or row.get("Retailer")
        or row.get("retailer")
        or ""
    )


def _is_yes_approval(value) -> bool:
    return str(value or "").strip().upper() in ("YES", "Y", "TRUE", "1")


def _is_counted_approval(value) -> bool:
    text = str(value or "").strip()
    return text.lower() not in ("", "na", "none", "unknown", "null")


def _pop_children_for_quarter(league_rows: list[dict], quarter: str) -> set[str]:
    wanted = str(quarter or "").strip().upper()
    names = set()
    for row in league_rows:
        if _row_quarter_label(row).upper() != wanted:
            continue
        key = _helpdesk_child_key(row)
        if key and key not in {normalize_parent(n) for n in _SKIP_ACCOUNTS}:
            names.add(key)
    return names


def _hd_children_for_quarter(helpdesk_rows: list[dict], quarter: str) -> set[str]:
    wanted = str(quarter or "").strip().upper()
    names = set()
    for row in helpdesk_rows:
        if _row_quarter_label(row).upper() != wanted:
            continue
        key = _helpdesk_child_key(row)
        if key and key not in {normalize_parent(n) for n in _SKIP_ACCOUNTS}:
            names.add(key)
    return names


def compute_helpdesk_kpis(
    league_rows: list[dict],
    visual_rows: list[dict],
    helpdesk_rows: list[dict] | None = None,
    league_history: list[dict] | None = None,
    helpdesk_history: list[dict] | None = None,
    compare_quarter: str = "",
) -> dict:
    """Helpdesk usage vs live creatives (POP queries + AIHD CAMPAIGN_TYPE mix)."""
    helpdesk_rows = helpdesk_rows or []
    league_history = league_history if league_history is not None else league_rows
    helpdesk_history = helpdesk_history if helpdesk_history is not None else helpdesk_rows
    queries_received = sum(int(row.get("creative_count") or 1) for row in visual_rows)

    approval_rows = [row for row in helpdesk_rows if _is_counted_approval(row.get("Final_Basco_Approval"))]
    yes_count = sum(1 for row in approval_rows if _is_yes_approval(row.get("Final_Basco_Approval")))
    final_approval_pct = round(yes_count / len(approval_rows) * 100, 1) if approval_rows else 0.0

    intel_days = 0
    intel_gamer_days = 0
    back_to_school = 0
    other = 0
    for row in visual_rows:
        count = int(row.get("creative_count") or 1)
        bucket = classify_campaign_bucket(row.get("Campaign_Type") or row.get("campaign_type"))
        if bucket == "Intel Days":
            intel_days += count
        elif bucket == "Intel Gamer Days":
            intel_gamer_days += count
        elif bucket == "Back to School":
            back_to_school += count
        elif bucket == "Other":
            other += count

    mix_total = intel_days + intel_gamer_days + back_to_school + other
    denom = mix_total or 1
    intel_days_pct = round(intel_days / denom * 100)
    intel_gamer_days_pct = round(intel_gamer_days / denom * 100)
    back_to_school_pct = round(back_to_school / denom * 100)
    other_pct = max(0, 100 - intel_days_pct - intel_gamer_days_pct - back_to_school_pct)
    intel_specific = intel_days + intel_gamer_days + back_to_school

    pop_now = _pop_children_for_quarter(league_history, compare_quarter) if compare_quarter else {
        key for row in league_history
        if (key := _helpdesk_child_key(row)) and key not in {normalize_parent(n) for n in _SKIP_ACCOUNTS}
    }
    hd_now = _hd_children_for_quarter(helpdesk_history, compare_quarter) if compare_quarter else {
        key for row in helpdesk_history
        if (key := _helpdesk_child_key(row)) and key not in {normalize_parent(n) for n in _SKIP_ACCOUNTS}
    }
    outside = len(pop_now - hd_now)
    adopted_now = len(pop_now & hd_now)

    prev_quarter = previous_quarter_label(compare_quarter) if compare_quarter else ""
    adopted_prev = 0
    has_prev = False
    if prev_quarter:
        pop_prev = _pop_children_for_quarter(league_history, prev_quarter)
        hd_prev = _hd_children_for_quarter(helpdesk_history, prev_quarter)
        if pop_prev or hd_prev:
            has_prev = True
            adopted_prev = len(pop_prev & hd_prev)

    if has_prev and adopted_now > adopted_prev:
        trend = "is growing"
    elif has_prev and adopted_now < adopted_prev:
        trend = "is declining"
    elif has_prev:
        trend = "is holding steady"
    else:
        trend = "is being tracked"

    return {
        "queries_received": int(queries_received),
        "final_approval_pct": final_approval_pct,
        "intel_specific_creatives": intel_specific,
        "campaign_mix": {
            "intel_days": intel_days,
            "intel_days_pct": intel_days_pct,
            "intel_gamer_days": intel_gamer_days,
            "intel_gamer_days_pct": intel_gamer_days_pct,
            "igd": intel_gamer_days,
            "igd_pct": intel_gamer_days_pct,
            "back_to_school": back_to_school,
            "back_to_school_pct": back_to_school_pct,
            "other": other,
            "other_pct": other_pct,
        },
        "retailers_outside_loop": outside,
        "insight": (
            f"Helpdesk adoption {trend}, but {outside} retailers are still outside the support loop"
        ),
    }


def is_low_intel_voice(application_of_voice) -> bool:
    """Low Intel voice = APPLICATION_OF_VOICE is Light or Neutral."""
    text = str(application_of_voice or "").strip().lower()
    return text in ("light", "neutral")


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
        bucket = classify_cta(
            row.get("CTA_Flag", "No"),
            row.get("CTA_Text", ""),
            row.get("Mapped_CTA_Bucket"),
        )
        objective = row.get("Objective", "")
        row_aligned = is_aligned(objective, bucket)
        if is_low_intel_voice(row.get("Application_Of_Voice") or row.get("APPLICATION_OF_VOICE")):
            low_voice += 1
        if row_aligned:
            aligned += 1
        if bucket in ("No CTA", "Missing CTA"):
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
            f"Intel voice of application is critical — "
            f"{round(low_voice / total * 100, 1) if total else 0.0}% of creatives are Light or Neutral, "
            f"and {misaligned_gaming} gaming creatives are misaligned"
        ),
    }


_PRICE_DISCOUNT_TYPES = frozenset({
    "discount", "price",
})


def is_price_discount_offer(offer_type) -> bool:
    text = str(offer_type or "").strip().lower().replace(" ", "")
    return text in ("discount", "price")


def is_no_offer_type(offer_type) -> bool:
    text = str(offer_type or "").strip().lower()
    return text in ("no offer", "none", "na", "", "unknown")


def compute_promotion_led(offer_rows: list[dict]) -> dict:
    """Promotion-led creative mix for Overview from AIHD + CTA mapping."""
    from .cta_campaign_views import classify_cta

    total = len(offer_rows)
    promo_rows = [
        r for r in offer_rows
        if str(r.get("Offer_Flag") or "").strip().lower() in ("yes", "y", "true", "1")
    ]
    promo_total = len(promo_rows)
    without_offer = sum(1 for r in offer_rows if is_no_offer_type(r.get("Offer_Type")))
    price_discount = sum(1 for r in offer_rows if is_price_discount_offer(r.get("Offer_Type")))

    without_cta = 0
    buckets = {
        "Buy/Shop CTA": 0,
        "Urgency CTA": 0,
        "Learn CTA": 0,
        "Other CTA": 0,
    }
    weak_children = set()

    def _child_key(row: dict) -> str:
        name = str(row.get("Child_Account") or row.get("CHILD_ACCOUNT") or "").strip()
        if not name or name in _SKIP_ACCOUNTS:
            return ""
        return normalize_parent(name) or name

    for row in promo_rows:
        flag = str(row.get("CTA_Flag") or "").strip()
        if flag.lower() in ("no", "n", "false", "0"):
            without_cta += 1
            key = _child_key(row)
            if key:
                weak_children.add(key)
            continue
        bucket = classify_cta(flag, row.get("CTA_Text", ""), row.get("Mapped_CTA_Bucket"))
        if bucket in ("Missing CTA", "No CTA"):
            continue
        if bucket not in ("Buy/Shop CTA", "Urgency CTA", "Learn CTA", "Other CTA"):
            buckets["Other CTA"] += 1
        else:
            buckets[bucket] += 1

    mix_total = (
        buckets["Buy/Shop CTA"]
        + buckets["Urgency CTA"]
        + buckets["Learn CTA"]
        + buckets["Other CTA"]
    ) or 1
    buy_pct = round(buckets["Buy/Shop CTA"] / mix_total * 100)
    urgency_pct = round(buckets["Urgency CTA"] / mix_total * 100)
    learn_pct = round(buckets["Learn CTA"] / mix_total * 100)
    other_pct = max(0, 100 - buy_pct - urgency_pct - learn_pct)

    return {
        "promo_without_cta_pct": round(without_cta / promo_total * 100, 1) if promo_total else 0.0,
        "price_discount": price_discount,
        "price_discount_total": total,
        "without_offer": without_offer,
        "without_offer_total": total,
        "cta_mix": {
            "buy_shop": buckets["Buy/Shop CTA"],
            "buy_shop_pct": buy_pct,
            "urgency": buckets["Urgency CTA"],
            "urgency_pct": urgency_pct,
            "learn": buckets["Learn CTA"],
            "learn_pct": learn_pct,
            "other": buckets["Other CTA"],
            "other_pct": other_pct,
        },
        "weak_promo_count": without_cta,
        "weak_retailer_count": len(weak_children),
        "insight": (
            f"{without_cta} of promotion-led creatives of {len(weak_children)} retailers "
            "are not fully equipped to convert shopper interest into action"
        ),
    }


def _layout_value(row: dict):
    return row.get("Layout_Category") or row.get("Layout")


def _creative_count(row: dict) -> int:
    try:
        return int(row.get("creative_count") or 1)
    except (TypeError, ValueError):
        return 1


def _hosted_row_key(row: dict) -> tuple:
    return (
        str(row.get("MD_Tag") or row.get("md_tag") or ""),
        str(row.get("Year") or row.get("year") or ""),
        str(row.get("Quarter") or row.get("quarter") or ""),
        str(row.get("Image_URL") or row.get("Image_Url") or ""),
    )


def layout_intel_custom_share(rows: list[dict]) -> tuple[int, int, float]:
    from .layout import is_intel_or_custom_layout as _is_intel_or_custom

    unique: dict[tuple, dict] = {}
    for row in rows:
        unique[_hosted_row_key(row)] = row

    total = 0
    used = 0
    for row in unique.values():
        count = _creative_count(row)
        total += count
        if _is_intel_or_custom(_layout_value(row)):
            used += count
    pct = round(used / total * 100, 1) if total else 0.0
    return used, total, pct


def classify_pms_usage(usage, layout_category=None) -> str:
    text = str(usage or "").strip().lower()
    compact = text.replace(" ", "").replace("-", "").replace("_", "")
    if "complete" in compact or compact in ("full", "fullyused"):
        return "Completely Used"
    if "partial" in compact:
        return "Partially Used"
    from .layout import is_custom_intel_layout, is_intel_layout_only
    if is_intel_layout_only(layout_category):
        return "Completely Used"
    if is_custom_intel_layout(layout_category):
        return "Partially Used"
    return "Unused"


def compute_intel_visual_adoption(visual_rows: list[dict], pop_rows: list[dict] | None = None) -> dict:
    """Overview Intel Visual Adoption from AIHD; POP comparison from hosted metadata."""
    from .layout import (
        is_cobranded_layout,
        is_intel_or_custom_layout,
        is_retailer_layout,
    )

    pop_rows = pop_rows or []
    total = 0
    intel_any = 0
    cobranded = 0
    retail_custom = 0
    partial = 0
    complete = 0

    for row in visual_rows:
        count = _creative_count(row)
        total += count
        layout = _layout_value(row)
        if is_intel_or_custom_layout(layout):
            intel_any += count
        if is_cobranded_layout(layout):
            cobranded += count
        if is_retailer_layout(layout):
            retail_custom += count
        bucket = classify_pms_usage(row.get("Intel_Visual_Usage"))
        if bucket == "Completely Used":
            complete += count
        elif bucket == "Partially Used":
            partial += count

    pms_total = partial + complete or 1
    partial_pct = round(partial / pms_total * 100) if (partial + complete) else 0
    complete_pct = max(0, 100 - partial_pct) if (partial + complete) else 0
    adoption = round(intel_any / total * 100, 1) if total else 0.0
    cobranded_pct = round(cobranded / total * 100, 1) if total else 0.0
    _, _, pop_pct = layout_intel_custom_share(pop_rows)
    gap = round(pop_pct - adoption, 1)
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
        "pop_adoption_pct": pop_pct,
        "helpdesk_adoption_pct": adoption,
        "pop_gap_pts": gap,
        "insight": (
            f"PMS asset adoption during POP-submission is {gap_abs}% {direction} "
            "than Helpdesk submitted creatives"
        ),
    }
