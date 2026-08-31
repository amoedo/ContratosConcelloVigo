from __future__ import annotations

import json
import math
import time
import urllib.error
from collections import Counter, defaultdict
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any
from urllib.request import urlopen

try:
    from rapidfuzz import fuzz
except ImportError:  # pragma: no cover
    fuzz = None

from .settings import load_settings
from .text import (
    clean_label,
    median,
    month_key,
    month_label,
    normalize_ascii_key,
    normalize_search_text,
    parse_date,
    percentile,
    read_json,
    safe_float,
    safe_int,
    slugify,
    stable_hash,
    tokenize,
    write_json,
)

AMOUNT_BUCKETS = [
    ("0-500", 0, 500),
    ("500-2000", 500, 2000),
    ("2000-5000", 2000, 5000),
    ("5000-10000", 5000, 10000),
    ("10000-15000", 10000, 15000),
    ("15000+", 15000, None),
]
SEVERITY_ORDER = {"alta": 3, "media": 2, "baixa": 1}
SUFFIX_SEQUENCES = [
    ("UNIPERSONAL",),
    ("S", "A"),
    ("SA",),
    ("S", "L"),
    ("SL",),
    ("S", "L", "U"),
    ("SLU",),
    ("S", "L", "L"),
    ("SLL",),
    ("S", "A", "U"),
    ("SAU",),
    ("SLNE",),
    ("S", "L", "N", "E"),
    ("S", "C"),
    ("SC",),
    ("C", "B"),
    ("CB",),
    ("U", "T", "E"),
    ("UTE",),
]
TRUNCATED_VENDOR_TOKENS = {"SERVIC", "SUMINIST", "CONSTRUCC", "COMUNICAC", "INSTALAC", "MANTENIM"}


def similarity(left: str, right: str) -> float:
    if fuzz is not None:
        return float(fuzz.token_sort_ratio(left, right))
    return SequenceMatcher(None, left, right).ratio() * 100



def token_overlap(left: str, right: str) -> float:
    left_tokens = set(left.split())
    right_tokens = set(right.split())
    if not left_tokens or not right_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / max(1, min(len(left_tokens), len(right_tokens)))



def amount_bucket(amount: float) -> str:
    for label, start, end in AMOUNT_BUCKETS:
        if end is None and amount >= start:
            return label
        if start <= amount < end:
            return label
    return AMOUNT_BUCKETS[0][0]



def competition_bucket(value: int | None) -> str:
    if value is None or value <= 0:
        return "desconocido"
    if value >= 4:
        return "4+"
    return str(value)



def strip_suffix_tokens(tokens: list[str]) -> list[str]:
    stripped = tokens[:]
    changed = True
    while changed and stripped:
        changed = False
        for sequence in SUFFIX_SEQUENCES:
            if len(stripped) >= len(sequence) and tuple(stripped[-len(sequence):]) == sequence:
                stripped = stripped[:-len(sequence)]
                changed = True
                break
    return stripped



def base_entity_key(label: str, kind: str) -> str:
    key = normalize_ascii_key(label)
    tokens = key.split()
    if kind == "vendor":
        tokens = strip_suffix_tokens(tokens)
    return " ".join(tokens).strip() or key



def pick_display_label(labels: list[str], counts: Counter[str], preferred: str | None = None) -> str:
    if preferred:
        return clean_label(preferred)
    return sorted({clean_label(label) for label in labels}, key=lambda label: (-counts[label], len(label), label))[0]



def resolve_entities(
    values: list[str],
    kind: str,
    manual_aliases: dict[str, str],
    threshold: int,
) -> tuple[dict[str, dict[str, str]], list[dict[str, Any]]]:
    counts = Counter(clean_label(value) for value in values if clean_label(value))
    manual_lookup = {normalize_ascii_key(key): value for key, value in manual_aliases.items()}
    grouped_labels: dict[str, list[str]] = defaultdict(list)
    grouped_count: Counter[str] = Counter()

    for label, count in counts.items():
        normalized = normalize_ascii_key(label)
        preferred = manual_lookup.get(normalized)
        base_key = base_entity_key(preferred or label, kind)
        grouped_labels[base_key].append(label)
        grouped_count[base_key] += count

    reviews: list[dict[str, Any]] = []
    canonical_groups: dict[str, dict[str, Any]] = {}
    assigned_base: dict[str, str] = {}

    ordered_groups = sorted(grouped_labels.items(), key=lambda item: (-grouped_count[item[0]], item[0]))

    for base_key, labels in ordered_groups:
        preferred = None
        for label in labels:
            normalized = normalize_ascii_key(label)
            if normalized in manual_lookup:
                preferred = manual_lookup[normalized]
                break

        if preferred:
            canonical_groups.setdefault(
                base_key,
                {"name": preferred, "labels": [], "count": 0, "base_key": base_key},
            )
            canonical_groups[base_key]["labels"].extend(labels)
            canonical_groups[base_key]["count"] += grouped_count[base_key]
            assigned_base[base_key] = base_key
            continue

        if not canonical_groups:
            canonical_groups[base_key] = {
                "name": pick_display_label(labels, counts),
                "labels": labels[:],
                "count": grouped_count[base_key],
                "base_key": base_key,
            }
            assigned_base[base_key] = base_key
            continue

        candidates = sorted(
            (
                (similarity(base_key, existing_key), existing_key, token_overlap(base_key, existing_key))
                for existing_key in canonical_groups
            ),
            reverse=True,
        )
        best_score, best_key, overlap = candidates[0]
        second_score = candidates[1][0] if len(candidates) > 1 else -1

        if best_score >= threshold and overlap >= 0.66 and best_score - second_score >= 2:
            canonical_groups[best_key]["labels"].extend(labels)
            canonical_groups[best_key]["count"] += grouped_count[base_key]
            assigned_base[base_key] = best_key
            reviews.append(
                {
                    "entity": kind,
                    "raw_base_key": base_key,
                    "suggested_base_key": best_key,
                    "suggested_name": canonical_groups[best_key]["name"],
                    "score": round(best_score, 2),
                    "status": "auto-merged",
                }
            )
            continue

        if best_score >= threshold - 5 and overlap >= 0.5:
            reviews.append(
                {
                    "entity": kind,
                    "raw_base_key": base_key,
                    "suggested_base_key": best_key,
                    "suggested_name": canonical_groups[best_key]["name"],
                    "score": round(best_score, 2),
                    "status": "manual-review",
                }
            )

        canonical_groups[base_key] = {
            "name": pick_display_label(labels, counts),
            "labels": labels[:],
            "count": grouped_count[base_key],
            "base_key": base_key,
        }
        assigned_base[base_key] = base_key

    used_ids: set[str] = set()
    for group in canonical_groups.values():
        group["name"] = pick_display_label(group["labels"], counts, preferred=group.get("name"))
        entity_id = slugify(group["name"])
        if entity_id in used_ids:
            entity_id = f"{entity_id}-{stable_hash(group['base_key'], length=6)}"
        used_ids.add(entity_id)
        group["id"] = entity_id

    resolved: dict[str, dict[str, str]] = {}
    for raw_label in counts:
        normalized = normalize_ascii_key(raw_label)
        preferred = manual_lookup.get(normalized)
        source_base = base_entity_key(preferred or raw_label, kind)
        group = canonical_groups[assigned_base[source_base]]
        resolved[raw_label] = {
            "id": group["id"],
            "name": group["name"],
            "base_key": group["base_key"],
        }

        if kind == "vendor" and normalize_ascii_key(raw_label).split()[-1:] and normalize_ascii_key(raw_label).split()[-1] in TRUNCATED_VENDOR_TOKENS:
            reviews.append(
                {
                    "entity": kind,
                    "raw_label": raw_label,
                    "suggested_name": group["name"],
                    "status": "possible-source-truncation",
                    "reason": "El nombre parece terminar en una palabra truncada por el sistema de origen.",
                }
            )

    return resolved, reviews



def normalize_type(type_raw: str, subject_clean: str) -> str:
    key = normalize_ascii_key(type_raw)
    if "PRIVAD" in key or "contrato privado" in subject_clean:
        return "privado"
    if "OBRA" in key:
        return "obra"
    if "SUMIN" in key or "SUBMIN" in key:
        return "suministro"
    if "SERV" in key:
        return "servicio"
    return "otro"



def threshold_for_record(record: dict[str, Any], settings: dict[str, Any]) -> float:
    thresholds = settings["legal_thresholds"]
    resolved = dict(thresholds.get("default", {}))
    for year_key, year_thresholds in sorted(thresholds.get("overrides", {}).items(), key=lambda item: int(item[0])):
        if int(year_key) <= record["source_year"]:
            resolved.update(year_thresholds)
    return float(resolved.get(record["type_normalized"], resolved.get("otro", 15000)))



def near_threshold(record: dict[str, Any], settings: dict[str, Any]) -> bool:
    ratio = float(settings["legal_thresholds"].get("near_threshold_ratio", 0.85))
    threshold = record["legal_threshold_eur"]
    amount = record["importe_eur"]
    return amount >= threshold * ratio and amount <= threshold



def load_raw_datasets(settings: dict[str, Any], years: list[int] | None = None) -> dict[int, list[dict[str, Any]]]:
    raw_dir: Path = settings["raw_dir"]
    selected_years = years or list(range(settings["start_year"], settings["current_year"] + 1))
    datasets: dict[int, list[dict[str, Any]]] = {}
    for year in selected_years:
        path = raw_dir / f"contratos-menores-{year}.json"
        if path.exists():
            datasets[year] = read_json(path, default=[])
    return datasets



_DOWNLOAD_TIMEOUT = 60
_DOWNLOAD_MAX_RETRIES = 3
_DOWNLOAD_RETRY_DELAY = 5


def download_year(year: int, settings: dict[str, Any], force: bool = False) -> Path:
    raw_dir: Path = settings["raw_dir"]
    raw_dir.mkdir(parents=True, exist_ok=True)
    suffix = str(year)[-2:]
    output = raw_dir / f"contratos-menores-{year}.json"
    if output.exists() and not force:
        return output
    url = settings["source_url_template"].format(suffix=suffix)
    for attempt in range(_DOWNLOAD_MAX_RETRIES):
        try:
            with urlopen(url, timeout=_DOWNLOAD_TIMEOUT) as response:
                payload = json.loads(response.read().decode("utf-8"))
            write_json(output, payload)
            return output
        except (urllib.error.URLError, OSError):
            if attempt < _DOWNLOAD_MAX_RETRIES - 1:
                time.sleep(_DOWNLOAD_RETRY_DELAY * (attempt + 1))
            else:
                raise



def download_all(settings: dict[str, Any], years: list[int] | None = None, force: bool = False) -> list[Path]:
    selected_years = years or list(range(settings["start_year"], settings["current_year"] + 1))
    return [download_year(year, settings, force=force) for year in selected_years]



def canonicalize_records(raw_by_year: dict[int, list[dict[str, Any]]], settings: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    vendor_values = [clean_label(row.get("adxudicatario")) for rows in raw_by_year.values() for row in rows]
    unit_values = [clean_label(row.get("unidade")) for rows in raw_by_year.values() for row in rows]

    vendor_map, vendor_reviews = resolve_entities(
        vendor_values,
        "vendor",
        settings["aliases"].get("vendors", {}),
        settings["fuzzy_threshold_vendor"],
    )
    unit_map, unit_reviews = resolve_entities(
        unit_values,
        "unit",
        settings["aliases"].get("units", {}),
        settings["fuzzy_threshold_unit"],
    )

    records: list[dict[str, Any]] = []
    for source_year, rows in sorted(raw_by_year.items()):
        for index, row in enumerate(rows):
            vendor_raw = clean_label(row.get("adxudicatario")) or "Sen adxudicatario"
            unit_raw = clean_label(row.get("unidade")) or "Sen unidade"
            subject_raw = clean_label(row.get("asunto"))
            subject_clean = normalize_search_text(subject_raw)
            type_raw = clean_label(row.get("tipo"))
            amount = round(safe_float(row.get("importe")), 2)
            award_date = parse_date(row.get("data"))
            licitadores_raw = safe_int(row.get("num_licitadores"))
            licitadores_valid = licitadores_raw if licitadores_raw is not None and licitadores_raw > 0 else None
            expediente_raw = clean_label(row.get("expediente"))
            flags: list[str] = []

            if not type_raw:
                flags.append("missing-type")
            if licitadores_valid is None:
                flags.append("missing-competition")
            if award_date is None:
                flags.append("missing-award-date")
            elif award_date.year != source_year:
                flags.append("out-of-year-award-date")

            if expediente_raw:
                expediente_key = slugify(expediente_raw)
            else:
                flags.append("synthetic-expediente")
                expediente_key = f"syn-{stable_hash(source_year, index, unit_raw, vendor_raw, subject_raw, amount, length=12)}"

            vendor_entity = vendor_map.get(vendor_raw, {"id": "sen-adxudicatario", "name": "Sen adxudicatario"})
            unit_entity = unit_map.get(unit_raw, {"id": "sen-unidade", "name": "Sen unidade"})

            record = {
                "record_id": stable_hash(source_year, index, expediente_key, vendor_raw, unit_raw, amount, subject_raw),
                "source_year": source_year,
                "award_date": award_date.isoformat() if award_date else None,
                "expediente_key": expediente_key,
                "expediente_raw": expediente_raw or None,
                "unit_id": unit_entity["id"],
                "unit_name": unit_entity["name"],
                "unit_raw": unit_raw,
                "vendor_id": vendor_entity["id"],
                "vendor_name": vendor_entity["name"],
                "vendor_raw": vendor_raw,
                "type_normalized": normalize_type(type_raw, subject_clean),
                "type_raw": type_raw or None,
                "subject_raw": subject_raw,
                "subject_clean": subject_clean,
                "importe_eur": amount,
                "licitadores_raw": licitadores_raw,
                "competition_bucket": competition_bucket(licitadores_valid),
                "amount_bucket": amount_bucket(amount),
                "topic_ids": [],
                "primary_topic_id": "sen-clasificar",
                "primary_topic_label": "Sen clasificar",
                "topic_cluster_id": None,
                "topic_cluster_label": None,
                "alert_flags": [],
                "data_quality_flags": flags,
            }
            record["legal_threshold_eur"] = threshold_for_record(record, settings)
            record["near_threshold"] = near_threshold(record, settings)
            if record["near_threshold"]:
                record["alert_flags"].append("near-threshold")
            records.append(record)

    topic_catalog = assign_topics(records, settings)
    alerts = build_alerts(records)
    return records, {
        "entity_reviews": vendor_reviews + unit_reviews,
        "topic_catalog": topic_catalog,
        "alerts": alerts,
    }


def assign_topics(records: list[dict[str, Any]], settings: dict[str, Any]) -> list[dict[str, Any]]:
    stopwords = settings["stopwords"]
    rules = []
    for rule in settings["topic_rules"]:
        rules.append({**rule, "normalized_keywords": [normalize_search_text(keyword) for keyword in rule.get("keywords", [])]})

    document_terms: list[list[str]] = []
    document_frequency: Counter[str] = Counter()
    for record in records:
        base_tokens = [token for token in tokenize(record["subject_clean"]) if token not in stopwords and not token.isdigit()]
        bigrams = [f"{left}_{right}" for left, right in zip(base_tokens, base_tokens[1:])]
        terms = base_tokens + bigrams
        document_terms.append(terms)
        document_frequency.update(set(terms))

    record_count = max(len(records), 1)
    idf = {term: math.log((1 + record_count) / (1 + frequency)) + 1 for term, frequency in document_frequency.items()}

    topic_catalog: dict[str, dict[str, Any]] = {
        rule["id"]: {"id": rule["id"], "label": rule["label"], "count": 0, "amount": 0.0}
        for rule in rules
    }
    topic_catalog.setdefault("sen-clasificar", {"id": "sen-clasificar", "label": "Sen clasificar", "count": 0, "amount": 0.0})

    provisional_clusters: dict[str, str] = {}
    cluster_counts: Counter[str] = Counter()
    cluster_labels: dict[str, str] = {}

    for record, terms in zip(records, document_terms):
        weighted_terms = {term: count * idf.get(term, 1.0) for term, count in Counter(terms).items()}
        top_terms = sorted(weighted_terms.items(), key=lambda item: (-item[1], item[0]))[:12]
        record["search_terms"] = [{"term": term, "weight": round(weight, 4)} for term, weight in top_terms]

        normalized_subject = record["subject_clean"]
        hits: list[tuple[int, str]] = []
        for rule in rules:
            score = sum(1 for keyword in rule["normalized_keywords"] if keyword and keyword in normalized_subject)
            if score:
                hits.append((score, rule["id"]))
        hits.sort(reverse=True)

        topic_ids = [topic_id for _, topic_id in hits[:2]] or ["sen-clasificar"]
        record["topic_ids"] = topic_ids
        record["primary_topic_id"] = topic_ids[0]
        record["primary_topic_label"] = topic_catalog.get(topic_ids[0], topic_catalog["sen-clasificar"])["label"]

        signature = "|".join(term for term, _ in top_terms[:3]) or "sen-cluster"
        provisional_clusters[record["record_id"]] = signature
        cluster_counts[signature] += 1
        cluster_labels[signature] = signature.replace("_", " ").replace("|", " / ")

        for topic_id in topic_ids:
            topic_catalog.setdefault(topic_id, {"id": topic_id, "label": topic_id.replace("-", " ").title(), "count": 0, "amount": 0.0})
            topic_catalog[topic_id]["count"] += 1
            topic_catalog[topic_id]["amount"] += record["importe_eur"]

    for record in records:
        signature = provisional_clusters[record["record_id"]]
        if cluster_counts[signature] >= 4:
            record["topic_cluster_id"] = f"cluster:{stable_hash(signature, length=10)}"
            record["topic_cluster_label"] = cluster_labels[signature]

    return sorted(topic_catalog.values(), key=lambda item: (-item["amount"], item["label"]))



def build_alerts(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    by_record = {record["record_id"]: record for record in records}

    def alert_sort_date(alert: dict[str, Any]) -> str | None:
        related_rows = [by_record[record_id] for record_id in alert["related_record_ids"] if record_id in by_record]
        related_dates = [parse_date(row["award_date"]) for row in related_rows if row.get("award_date")]
        if related_dates:
            return max(related_dates).isoformat()
        related_years = [row["source_year"] for row in related_rows if row.get("source_year") is not None]
        if related_years:
            return f"{max(related_years)}-12-31"
        year = alert.get("filters", {}).get("year")
        if year:
            return f"{year}-12-31"
        return None

    def register_alert(alert: dict[str, Any]) -> None:
        alert["sort_date"] = alert_sort_date(alert)
        alerts.append(alert)
        for record_id in alert["related_record_ids"]:
            if record_id in by_record and alert["kind"] not in by_record[record_id]["alert_flags"]:
                by_record[record_id]["alert_flags"].append(alert["kind"])

    grouped_by_year_unit: dict[tuple[int, str], list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        grouped_by_year_unit[(record["source_year"], record["unit_id"])].append(record)

    for (year, unit_id), rows in grouped_by_year_unit.items():
        total_amount = sum(row["importe_eur"] for row in rows)
        if total_amount <= 0:
            continue
        unit_name = rows[0]["unit_name"]
        vendor_totals: dict[str, dict[str, Any]] = {}
        for row in rows:
            vendor_totals.setdefault(row["vendor_id"], {"name": row["vendor_name"], "amount": 0.0, "record_ids": []})
            vendor_totals[row["vendor_id"]]["amount"] += row["importe_eur"]
            vendor_totals[row["vendor_id"]]["record_ids"].append(row["record_id"])
        ranked_vendors = sorted(vendor_totals.items(), key=lambda item: item[1]["amount"], reverse=True)
        top_vendor_share = ranked_vendors[0][1]["amount"] / total_amount if ranked_vendors else 0.0
        top_three_share = sum(item[1]["amount"] for item in ranked_vendors[:3]) / total_amount
        concentration_summary = None
        concentration_severity = "media"
        concentration_record_ids: list[str] = []
        if total_amount >= 10000 and len(rows) >= 10:
            if len(ranked_vendors) >= 3 and top_three_share >= 0.6:
                concentration_severity = "alta" if top_three_share >= 0.75 else "media"
                concentration_summary = f"En {year}, {unit_name} concentró el {round(top_three_share * 100, 1)}% del importe en sus 3 principales adjudicatarios."
                concentration_record_ids = [record_id for _, vendor in ranked_vendors[:3] for record_id in vendor["record_ids"][:5]]
            elif top_vendor_share >= 0.9:
                concentration_severity = "alta"
                concentration_summary = f"En {year}, {unit_name} concentró el {round(top_vendor_share * 100, 1)}% del importe en un único adjudicatario."
                concentration_record_ids = ranked_vendors[0][1]["record_ids"][:10]
        if concentration_summary:
            register_alert(
                {
                    "alert_id": f"unit-concentration-{year}-{unit_id}",
                    "kind": "unit-concentration",
                    "severity": concentration_severity,
                    "title": f"{unit_name} concentra el gasto en pocos adjudicatarios",
                    "summary": concentration_summary,
                    "evidence": {"year": year, "unit_id": unit_id, "unit_name": unit_name, "record_count": len(rows), "vendor_count": len(ranked_vendors), "top_vendor_share": round(top_vendor_share, 4), "top_three_share": round(top_three_share, 4), "total_amount": round(total_amount, 2)},
                    "filters": {"year": str(year), "unit": unit_id},
                    "related_record_ids": concentration_record_ids,
                }
            )

        valid_competition = [row for row in rows if row["licitadores_raw"] is not None and row["licitadores_raw"] > 0]
        one_bidder = [row for row in valid_competition if row["licitadores_raw"] == 1]
        if len(valid_competition) >= 5:
            one_bidder_ratio = len(one_bidder) / len(valid_competition)
            if one_bidder_ratio >= 0.75:
                register_alert(
                    {
                        "alert_id": f"low-competition-{year}-{unit_id}",
                        "kind": "low-competition",
                        "severity": "alta" if one_bidder_ratio >= 0.85 else "media",
                        "title": f"{unit_name} muestra baja competencia en {year}",
                        "summary": f"El {round(one_bidder_ratio * 100, 1)}% de las adjudicaciones con dato válido de licitadores en {unit_name} tuvo un único licitador en {year}.",
                        "evidence": {"year": year, "unit_id": unit_id, "known_contracts": len(valid_competition), "single_bidder_ratio": round(one_bidder_ratio, 4)},
                        "filters": {"year": str(year), "unit": unit_id, "competition": "1"},
                        "related_record_ids": [row["record_id"] for row in one_bidder[:10]],
                    }
                )

        near_threshold_rows = [row for row in rows if row["near_threshold"]]
        if len(near_threshold_rows) >= 3:
            register_alert(
                {
                    "alert_id": f"near-threshold-{year}-{unit_id}",
                    "kind": "near-threshold-group",
                    "severity": "media",
                    "title": f"{unit_name} acumula varios contratos cercanos al umbral",
                    "summary": f"En {year}, {unit_name} registró {len(near_threshold_rows)} adjudicaciones entre el 85% y el 100% del umbral analítico configurado.",
                    "evidence": {"year": year, "unit_id": unit_id, "records": len(near_threshold_rows)},
                    "filters": {"year": str(year), "unit": unit_id, "amount": "10000-15000"},
                    "related_record_ids": [row["record_id"] for row in near_threshold_rows[:10]],
                }
            )

    vendor_year_totals: dict[str, dict[int, float]] = defaultdict(lambda: defaultdict(float))
    vendor_rows: dict[str, dict[int, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))
    for record in records:
        vendor_year_totals[record["vendor_id"]][record["source_year"]] += record["importe_eur"]
        vendor_rows[record["vendor_id"]][record["source_year"]].append(record)

    for vendor_id, yearly_totals in vendor_year_totals.items():
        years = sorted(yearly_totals)
        vendor_name = vendor_rows[vendor_id][years[-1]][0]["vendor_name"]
        for previous_year, year in zip(years, years[1:]):
            if year != previous_year + 1:
                continue
            previous_amount = yearly_totals[previous_year]
            current_amount = yearly_totals[year]
            if previous_amount >= 1000 and current_amount >= previous_amount * 2.5 and current_amount >= 5000:
                register_alert(
                    {
                        "alert_id": f"vendor-growth-{vendor_id}-{year}",
                        "kind": "vendor-growth",
                        "severity": "media",
                        "title": f"{vendor_name} crece con fuerza frente al año anterior",
                        "summary": f"{vendor_name} multiplicó por {round(current_amount / previous_amount, 2)} su importe adjudicado al pasar de {previous_year} a {year}.",
                        "evidence": {"vendor_id": vendor_id, "vendor_name": vendor_name, "previous_year": previous_year, "year": year, "previous_amount": round(previous_amount, 2), "current_amount": round(current_amount, 2)},
                        "filters": {"year": str(year), "vendor": vendor_id},
                        "related_record_ids": [row["record_id"] for row in vendor_rows[vendor_id][year][:10]],
                    }
                )

    topic_year_totals: dict[str, dict[int, float]] = defaultdict(lambda: defaultdict(float))
    topic_rows: dict[str, dict[int, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))
    for record in records:
        topic_year_totals[record["primary_topic_id"]][record["source_year"]] += record["importe_eur"]
        topic_rows[record["primary_topic_id"]][record["source_year"]].append(record)

    for topic_id, yearly_totals in topic_year_totals.items():
        years = sorted(yearly_totals)
        for previous_year, year in zip(years, years[1:]):
            if year != previous_year + 1:
                continue
            previous_amount = yearly_totals[previous_year]
            current_amount = yearly_totals[year]
            if previous_amount >= 1000 and current_amount >= previous_amount * 2.4 and current_amount >= 5000:
                topic_label = topic_rows[topic_id][year][0]["primary_topic_label"]
                register_alert(
                    {
                        "alert_id": f"topic-growth-{topic_id}-{year}",
                        "kind": "topic-growth",
                        "severity": "media",
                        "title": f"{topic_label} acelera su peso interanual",
                        "summary": f"La temática {topic_label} creció un {round(((current_amount / previous_amount) - 1) * 100, 1)}% en importe adjudicado entre {previous_year} y {year}.",
                        "evidence": {"topic_id": topic_id, "topic_label": topic_label, "previous_year": previous_year, "year": year, "previous_amount": round(previous_amount, 2), "current_amount": round(current_amount, 2)},
                        "filters": {"year": str(year), "topic": topic_id},
                        "related_record_ids": [row["record_id"] for row in topic_rows[topic_id][year][:10]],
                    }
                )

    fragmentation_groups: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        if record["award_date"]:
            fragmentation_groups[(record["unit_id"], record["vendor_id"], record["primary_topic_id"])].append(record)

    for (unit_id, vendor_id, topic_id), rows in fragmentation_groups.items():
        ordered = sorted(rows, key=lambda row: row["award_date"])
        if len(ordered) < 3:
            continue
        emitted = False
        for start in range(len(ordered)):
            window = [ordered[start]]
            window_start = parse_date(ordered[start]["award_date"])
            total_amount = ordered[start]["importe_eur"]
            for end in range(start + 1, len(ordered)):
                current_date = parse_date(ordered[end]["award_date"])
                if current_date is None or window_start is None:
                    continue
                if (current_date - window_start).days > 60:
                    break
                window.append(ordered[end])
                total_amount += ordered[end]["importe_eur"]
                if len(window) >= 3:
                    threshold = min(item["legal_threshold_eur"] for item in window)
                    if total_amount >= threshold:
                        register_alert(
                            {
                                "alert_id": f"fragmentation-{unit_id}-{vendor_id}-{topic_id}-{start}",
                                "kind": "fragmentation-pattern",
                                "severity": "alta",
                                "title": f"Posible patrón repetido en {ordered[start]['unit_name']}",
                                "summary": f"Se han detectado {len(window)} adjudicaciones de {ordered[start]['unit_name']} al mismo adjudicatario en menos de 60 días dentro de la temática {ordered[start]['primary_topic_label']}, con un importe agregado de {round(total_amount, 2)} euros.",
                                "evidence": {"unit_id": unit_id, "vendor_id": vendor_id, "topic_id": topic_id, "records": len(window), "window_days": (current_date - window_start).days, "total_amount": round(total_amount, 2)},
                                "filters": {"year": str(ordered[start]["source_year"]), "unit": unit_id, "vendor": vendor_id, "topic": topic_id},
                                "related_record_ids": [item["record_id"] for item in window],
                            }
                        )
                        emitted = True
                        break
            if emitted:
                break

    threshold_split_groups: dict[tuple[str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        if record["award_date"]:
            threshold_split_groups[
                (record["vendor_id"], record["primary_topic_id"], record["type_normalized"])
            ].append(record)

    for (vendor_id, topic_id, contract_type), rows in threshold_split_groups.items():
        ordered = sorted(rows, key=lambda row: row["award_date"])
        for start, first in enumerate(ordered):
            if not first["near_threshold"]:
                continue
            first_date = parse_date(first["award_date"])
            if first_date is None:
                continue
            total_amount = first["importe_eur"]
            for end in range(start + 1, len(ordered)):
                subsequent = ordered[end]
                subsequent_date = parse_date(subsequent["award_date"])
                if subsequent_date is None:
                    break
                window_days = (subsequent_date - first_date).days
                if window_days > 30:
                    break
                total_amount += subsequent["importe_eur"]
                if total_amount > first["legal_threshold_eur"]:
                    register_alert(
                        {
                            "alert_id": f"threshold-split-{first['record_id']}",
                            "kind": "threshold-splitting",
                            "severity": "alta",
                            "title": f"Posible fraccionamiento para {first['vendor_name']}",
                            "summary": f"Una adjudicación cercana al umbral y contratos posteriores de temática similar para {first['vendor_name']} superan el umbral de {round(first['legal_threshold_eur'], 2)} euros en {window_days} días.",
                            "evidence": {"vendor_id": vendor_id, "topic_id": topic_id, "type": contract_type, "threshold_eur": first["legal_threshold_eur"], "window_days": window_days, "total_amount": round(total_amount, 2)},
                            "filters": {"year": str(first["source_year"]), "vendor": vendor_id, "topic": topic_id},
                            "related_record_ids": [item["record_id"] for item in ordered[start:end + 1]],
                        }
                    )
                    break

    repeated_amount_groups: dict[tuple[int, str, str, int], list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        rounded_amount = int(round(record["importe_eur"] / 50.0) * 50)
        repeated_amount_groups[(record["source_year"], record["unit_id"], record["vendor_id"], rounded_amount)].append(record)

    for (year, unit_id, vendor_id, rounded_amount), rows in repeated_amount_groups.items():
        if len(rows) >= 3 and sum(row["importe_eur"] for row in rows) >= 5000:
            register_alert(
                {
                    "alert_id": f"repeated-amount-{year}-{unit_id}-{vendor_id}-{rounded_amount}",
                    "kind": "repeated-amounts",
                    "severity": "media",
                    "title": f"Importes muy parecidos repetidos en {rows[0]['unit_name']}",
                    "summary": f"{rows[0]['unit_name']} y {rows[0]['vendor_name']} repiten {len(rows)} adjudicaciones con importes próximos a {rounded_amount} euros en {year}.",
                    "evidence": {"year": year, "unit_id": unit_id, "vendor_id": vendor_id, "rounded_amount": rounded_amount, "records": len(rows)},
                    "filters": {"year": str(year), "unit": unit_id, "vendor": vendor_id},
                    "related_record_ids": [row["record_id"] for row in rows],
                }
            )

    rule_parameters = {
        "unit-concentration": {"minimum_records": 10, "minimum_total_eur": 10000, "top_vendor_share": 0.9, "top_three_share": 0.6},
        "low-competition": {"minimum_known_records": 5, "single_bidder_share": 0.75},
        "near-threshold-group": {"minimum_records": 3, "threshold_ratio": 0.85},
        "vendor-growth": {"growth_multiple": 2.5, "minimum_current_eur": 5000},
        "topic-growth": {"growth_multiple": 2.4, "minimum_current_eur": 5000},
        "fragmentation-pattern": {"minimum_records": 3, "window_days": 60},
        "threshold-splitting": {"window_days": 30, "requires_near_threshold_first_award": True},
        "repeated-amounts": {"minimum_records": 3, "rounding_eur": 50},
    }
    priority_by_severity = {"alta": 3, "media": 2, "baixa": 1}
    confidence_by_kind = {
        "fragmentation-pattern": 0.78,
        "threshold-splitting": 0.88,
        "unit-concentration": 0.9,
        "low-competition": 0.86,
        "near-threshold-group": 0.92,
        "repeated-amounts": 0.72,
        "vendor-growth": 0.82,
        "topic-growth": 0.76,
    }
    for alert in alerts:
        filters = alert.get("filters", {})
        family_parts = [
            alert["kind"],
            filters.get("unit", ""),
            filters.get("vendor", ""),
            filters.get("topic", ""),
        ]
        alert["family_id"] = f"{alert['kind']}-{stable_hash(*family_parts, length=10)}"
        alert["confidence"] = confidence_by_kind.get(alert["kind"], 0.7)
        alert["priority"] = priority_by_severity.get(alert["severity"], 1)
        alert["rule_version"] = "2.0"
        alert["rule_parameters"] = rule_parameters.get(alert["kind"], {})
        alert["affected_count"] = len(alert.get("related_record_ids", []))
        alert["known_data_denominator"] = alert.get("evidence", {}).get("known_contracts")
        alert["evidence_totals"] = {
            key: value
            for key, value in alert.get("evidence", {}).items()
            if key in {"total_amount", "previous_amount", "current_amount", "records", "window_days"}
        }

        related_dates = sorted(
            record["award_date"]
            for record_id in alert.get("related_record_ids", [])
            if (record := by_record.get(record_id)) and record.get("award_date")
        )
        evidence_years = [
            int(value)
            for key in ("previous_year", "year")
            if (value := alert.get("evidence", {}).get(key)) is not None
        ]
        alert["observed_from"] = related_dates[0] if related_dates else (f"{min(evidence_years)}-01-01" if evidence_years else None)
        alert["observed_to"] = related_dates[-1] if related_dates else (f"{max(evidence_years)}-12-31" if evidence_years else None)
        is_partial = alert["kind"] in {"vendor-growth", "topic-growth"} and alert.get("evidence", {}).get("year") == datetime.now().year
        alert["is_partial_comparison"] = is_partial
        alert["caveats"] = ["partial-year-comparison"] if is_partial else []
        if is_partial:
            alert["priority"] = max(1, alert["priority"] - 1)
            alert["confidence"] = round(alert["confidence"] * 0.75, 2)

    alerts.sort(key=lambda alert: (alert.get("observed_to") or "", alert["priority"], alert["confidence"], alert["alert_id"]), reverse=True)
    return alerts



def record_excerpt(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "record_id": record["record_id"],
        "award_date": record["award_date"],
        "source_year": record["source_year"],
        "expediente_key": record["expediente_key"],
        "expediente_raw": record["expediente_raw"],
        "unit_id": record["unit_id"],
        "unit_name": record["unit_name"],
        "vendor_id": record["vendor_id"],
        "vendor_name": record["vendor_name"],
        "type_normalized": record["type_normalized"],
        "subject_raw": record["subject_raw"],
        "importe_eur": record["importe_eur"],
        "licitadores_raw": record["licitadores_raw"],
        "competition_bucket": record["competition_bucket"],
        "amount_bucket": record["amount_bucket"],
        "primary_topic_id": record["primary_topic_id"],
        "primary_topic_label": record["primary_topic_label"],
        "alert_flags": record["alert_flags"],
        "data_quality_flags": record["data_quality_flags"],
        "near_threshold": record["near_threshold"],
        "legal_threshold_eur": record["legal_threshold_eur"],
        "source_url": f"https://datos.vigo.org/data/sector-publico/contratos-menores-{str(record['source_year'])[-2:]}.json",
    }



def summarise_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    amounts = [row["importe_eur"] for row in rows]
    valid_competition = [row["licitadores_raw"] for row in rows if row["licitadores_raw"] is not None and row["licitadores_raw"] > 0]
    return {
        "contract_count": len(rows),
        "total_amount": round(sum(amounts), 2),
        "mean_amount": round(sum(amounts) / len(amounts), 2) if amounts else 0.0,
        "median_amount": round(median(amounts), 2),
        "unique_vendors": len({row["vendor_id"] for row in rows}),
        "unique_units": len({row["unit_id"] for row in rows}),
        "unique_expedientes": len({row["expediente_key"] for row in rows}),
        "single_bidder_pct": round((sum(1 for value in valid_competition if value == 1) / len(valid_competition)) * 100, 2) if valid_competition else None,
        "known_competition_count": len(valid_competition),
    }



def aggregate_timeseries(rows: list[dict[str, Any]], mode: str) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, Any]] = {}
    for row in rows:
        if mode == "month":
            award_date = parse_date(row["award_date"])
            key = month_key(award_date)
        else:
            key = str(row["source_year"])
        if key is None:
            continue
        buckets.setdefault(key, {"key": key, "count": 0, "amount": 0.0})
        buckets[key]["count"] += 1
        buckets[key]["amount"] += row["importe_eur"]
    return [{**payload, "amount": round(payload["amount"], 2)} for _, payload in sorted(buckets.items(), key=lambda item: item[0])]


def build_heatmap(rows: list[dict[str, Any]]) -> dict[str, Any]:
    unit_totals: Counter[str] = Counter()
    unit_names: dict[str, str] = {}
    for row in rows:
        unit_totals[row["unit_id"]] += row["importe_eur"]
        unit_names[row["unit_id"]] = row["unit_name"]
    top_units = [unit_id for unit_id, _ in unit_totals.most_common(10)]

    cells = []
    matrix: dict[tuple[str, int], dict[str, Any]] = defaultdict(lambda: {"count": 0, "amount": 0.0})
    for row in rows:
        award_date = parse_date(row["award_date"])
        if award_date is None or row["unit_id"] not in top_units:
            continue
        matrix[(row["unit_id"], award_date.month)]["count"] += 1
        matrix[(row["unit_id"], award_date.month)]["amount"] += row["importe_eur"]

    for unit_id in top_units:
        for month_number in range(1, 13):
            payload = matrix[(unit_id, month_number)]
            cells.append({
                "unit_id": unit_id,
                "unit_name": unit_names[unit_id],
                "month": month_number,
                "month_label": month_label(month_number),
                "count": payload["count"],
                "amount": round(payload["amount"], 2),
            })
    return {
        "months": [{"value": month_number, "label": month_label(month_number)} for month_number in range(1, 13)],
        "units": [{"id": unit_id, "name": unit_names[unit_id]} for unit_id in top_units],
        "cells": cells,
    }



def rank_entities(rows: list[dict[str, Any]], entity_field: str, name_field: str, counterpart_field: str) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[row[entity_field]].append(row)

    ranking = []
    for entity_id, group_rows in grouped.items():
        amounts = [row["importe_eur"] for row in group_rows]
        ranking.append({
            "id": entity_id,
            "name": group_rows[0][name_field],
            "total_amount": round(sum(amounts), 2),
            "contract_count": len(group_rows),
            "mean_amount": round(sum(amounts) / len(amounts), 2),
            "median_amount": round(median(amounts), 2),
            "first_year": min(row["source_year"] for row in group_rows),
            "last_year": max(row["source_year"] for row in group_rows),
            "counterparty_count": len({row[counterpart_field] for row in group_rows}),
            "topics": [{"label": label, "count": count} for label, count in Counter(row["primary_topic_label"] for row in group_rows).most_common(3)],
        })
    return sorted(ranking, key=lambda item: (-item["total_amount"], -item["contract_count"], item["name"]))



def build_entity_payload(entity_id: str, rows: list[dict[str, Any]], alerts: list[dict[str, Any]], counterpart_id_field: str, counterpart_name_field: str, entity_kind: str) -> dict[str, Any]:
    totals = summarise_rows(rows)
    record_ids = {row["record_id"] for row in rows}
    counterparty_totals: dict[str, dict[str, Any]] = {}
    for row in rows:
        counterparty_totals.setdefault(row[counterpart_id_field], {"id": row[counterpart_id_field], "name": row[counterpart_name_field], "amount": 0.0, "count": 0})
        counterparty_totals[row[counterpart_id_field]]["amount"] += row["importe_eur"]
        counterparty_totals[row[counterpart_id_field]]["count"] += 1

    competition_values = [row["licitadores_raw"] for row in rows if row["licitadores_raw"] is not None and row["licitadores_raw"] > 0]
    competition_distribution = Counter(competition_bucket(value) for value in competition_values)
    topic_distribution = Counter(row["primary_topic_label"] for row in rows)
    related_alerts = [alert for alert in alerts if alert["filters"].get(entity_kind) == entity_id or any(record_id in record_ids for record_id in alert["related_record_ids"])]

    return {
        "entity_id": entity_id,
        "entity_name": rows[0]["vendor_name" if entity_kind == "vendor" else "unit_name"],
        "entity_type": entity_kind,
        "totals": {**totals, "years": sorted({row["source_year"] for row in rows})},
        "timeseries": {"yearly": aggregate_timeseries(rows, "year"), "monthly": aggregate_timeseries(rows, "month")},
        "top_counterparties": sorted(counterparty_totals.values(), key=lambda item: (-item["amount"], item["name"]))[:12],
        "competition": {
            "average_bidders": round(sum(competition_values) / len(competition_values), 2) if competition_values else None,
            "distribution": [{"bucket": key, "count": count} for key, count in sorted(competition_distribution.items())],
            "single_bidder_pct": totals["single_bidder_pct"],
        },
        "topics": [{"label": label, "count": count} for label, count in topic_distribution.most_common(12)],
        "near_threshold_records": [record_excerpt(row) for row in sorted([row for row in rows if row["near_threshold"]], key=lambda row: (-row["importe_eur"], row["award_date"] or ""))[:12]],
        "pattern_clusters": related_alerts[:12],
        "recent_records": [record_excerpt(row) for row in sorted(rows, key=lambda row: (row["award_date"] or "", row["record_id"]), reverse=True)[:12]],
    }



def build_amount_distribution(rows: list[dict[str, Any]]) -> dict[str, Any]:
    amounts = [row["importe_eur"] for row in rows]
    buckets = Counter(row["amount_bucket"] for row in rows)
    return {
        "summary": {
            "min": round(min(amounts), 2) if amounts else 0.0,
            "max": round(max(amounts), 2) if amounts else 0.0,
            "p10": round(percentile(amounts, 0.10), 2),
            "p25": round(percentile(amounts, 0.25), 2),
            "p50": round(percentile(amounts, 0.50), 2),
            "p75": round(percentile(amounts, 0.75), 2),
            "p90": round(percentile(amounts, 0.90), 2),
            "p95": round(percentile(amounts, 0.95), 2),
        },
        "buckets": [{"bucket": bucket, "count": buckets.get(bucket, 0)} for bucket, _, _ in AMOUNT_BUCKETS],
        "top_contracts": [record_excerpt(row) for row in sorted(rows, key=lambda row: (-row["importe_eur"], row["record_id"]))[:20]],
        "lowest_contracts": [record_excerpt(row) for row in sorted(rows, key=lambda row: (row["importe_eur"], row["record_id"]))[:20]],
        "near_threshold_records": [record_excerpt(row) for row in sorted([row for row in rows if row["near_threshold"]], key=lambda row: (-row["importe_eur"], row["record_id"]))[:20]],
    }



def build_competition_section(rows: list[dict[str, Any]]) -> dict[str, Any]:
    distribution = Counter(row["competition_bucket"] for row in rows)
    average_amount_by_bucket: dict[str, list[float]] = defaultdict(list)
    for row in rows:
        average_amount_by_bucket[row["competition_bucket"]].append(row["importe_eur"])

    by_unit: list[dict[str, Any]] = []
    grouped_units: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped_units[row["unit_id"]].append(row)
    for unit_id, unit_rows in grouped_units.items():
        valid = [row for row in unit_rows if row["licitadores_raw"] is not None and row["licitadores_raw"] > 0]
        if not valid:
            continue
        one_bidder_ratio = sum(1 for row in valid if row["licitadores_raw"] == 1) / len(valid)
        by_unit.append({
            "unit_id": unit_id,
            "unit_name": unit_rows[0]["unit_name"],
            "known_contracts": len(valid),
            "single_bidder_pct": round(one_bidder_ratio * 100, 2),
            "average_bidders": round(sum(row["licitadores_raw"] for row in valid) / len(valid), 2),
        })

    return {
        "distribution": [{"bucket": bucket, "count": count} for bucket, count in sorted(distribution.items())],
        "average_amount_by_bucket": [{"bucket": bucket, "mean_amount": round(sum(values) / len(values), 2)} for bucket, values in sorted(average_amount_by_bucket.items())],
        "by_unit": sorted(by_unit, key=lambda item: (-item["single_bidder_pct"], -item["known_contracts"], item["unit_name"]))[:25],
        "timeline": aggregate_timeseries([row for row in rows if row["competition_bucket"] != "desconocido"], "month"),
    }



def build_topics_section(rows: list[dict[str, Any]]) -> dict[str, Any]:
    topic_totals: dict[str, dict[str, Any]] = defaultdict(lambda: {"amount": 0.0, "count": 0, "label": ""})
    by_year: dict[tuple[int, str], dict[str, Any]] = defaultdict(lambda: {"amount": 0.0, "count": 0})
    clusters = Counter(row["topic_cluster_label"] for row in rows if row["topic_cluster_label"])
    terms = Counter()
    for row in rows:
        topic_totals[row["primary_topic_id"]]["amount"] += row["importe_eur"]
        topic_totals[row["primary_topic_id"]]["count"] += 1
        topic_totals[row["primary_topic_id"]]["label"] = row["primary_topic_label"]
        by_year[(row["source_year"], row["primary_topic_id"])]["amount"] += row["importe_eur"]
        by_year[(row["source_year"], row["primary_topic_id"])]["count"] += 1
        for term in row.get("search_terms", [])[:4]:
            terms[term["term"].replace("_", " ")] += 1

    ranking = [{"topic_id": topic_id, "label": payload["label"], "total_amount": round(payload["amount"], 2), "contract_count": payload["count"]} for topic_id, payload in topic_totals.items()]
    yearly = [{"year": year, "topic_id": topic_id, "label": topic_totals[topic_id]["label"], "amount": round(payload["amount"], 2), "count": payload["count"]} for (year, topic_id), payload in sorted(by_year.items())]

    return {
        "ranking": sorted(ranking, key=lambda item: (-item["total_amount"], item["label"])),
        "yearly": yearly,
        "clusters": [{"label": label, "count": count} for label, count in clusters.most_common(20)],
        "top_terms": [{"term": term, "count": count} for term, count in terms.most_common(40)],
    }



def build_timeline_section(rows: list[dict[str, Any]]) -> dict[str, Any]:
    monthly = aggregate_timeseries(rows, "month")
    yearly = aggregate_timeseries(rows, "year")
    monthly_amounts = [item["amount"] for item in monthly]
    average_month = sum(monthly_amounts) / len(monthly_amounts) if monthly_amounts else 0.0
    anomalies = [item for item in monthly if average_month and item["amount"] >= average_month * 1.6]
    return {"monthly": monthly, "yearly": yearly, "anomalies": anomalies[:12]}



def build_meta(rows: list[dict[str, Any]], alerts: list[dict[str, Any]], topic_catalog: list[dict[str, Any]]) -> dict[str, Any]:
    years = sorted({row["source_year"] for row in rows})
    dated_rows = [row["award_date"] for row in rows if row["award_date"]]
    return {
        "dataset": "contratos-menores-vigo",
        "source_name": "Portal de datos abiertos del Concello de Vigo",
        "source_url": "https://datos.vigo.org/",
        "source_dataset_template": "https://datos.vigo.org/data/sector-publico/contratos-menores-{yy}.json",
        "last_refreshed": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "refresh_status": "ok",
        "available_years": years,
        "partial_years": years[-1:] if years else [],
        "partial_year_explanation": "El ejercicio más reciente puede estar incompleto y cambia con cada actualización.",
        "coverage": {
            "dataset_start_year": years[0] if years else None,
            "dataset_end_year": years[-1] if years else None,
            "award_date_from": min(dated_rows) if dated_rows else None,
            "award_date_to": max(dated_rows) if dated_rows else None,
        },
        "row_count": len(rows),
        "entity_counts": {"vendors": len({row["vendor_id"] for row in rows}), "units": len({row["unit_id"] for row in rows})},
        "quality": {
            "out_of_year_rows": sum(1 for row in rows if "out-of-year-award-date" in row["data_quality_flags"]),
            "missing_competition": sum(1 for row in rows if "missing-competition" in row["data_quality_flags"]),
            "missing_type": sum(1 for row in rows if "missing-type" in row["data_quality_flags"]),
            "synthetic_expediente": sum(1 for row in rows if "synthetic-expediente" in row["data_quality_flags"]),
        },
        "filters": {
            "types": sorted({row["type_normalized"] for row in rows}),
            "competition": ["1", "2", "3", "4+", "desconocido"],
            "amounts": [bucket for bucket, _, _ in AMOUNT_BUCKETS],
            "topics": [{"id": topic["id"], "label": topic["label"]} for topic in topic_catalog if topic["count"] > 0],
        },
        "alert_count": len(alerts),
        "metric_definitions": {
            "contract_count": "Filas o adjudicaciones publicadas en los JSON de origen.",
            "unique_expedientes": "Expedientes distintos cuando existe identificador; en 2019 se usa una clave sintética.",
            "single_bidder_pct": "Porcentaje calculado solo sobre filas con un número de licitadores válido y mayor que cero.",
            "total_amount": "Suma del importe publicado, sin reinterpretar impuestos ni condiciones del expediente.",
        },
    }


def alerts_for_rows(alerts: list[dict[str, Any]], rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    record_ids = {row["record_id"] for row in rows}
    return [alert for alert in alerts if any(record_id in record_ids for record_id in alert["related_record_ids"])]


def concentration_for_ranking(ranking: list[dict[str, Any]]) -> dict[str, float]:
    total = sum(item["total_amount"] for item in ranking) or 1
    return {
        "top1_share": round(sum(item["total_amount"] for item in ranking[:1]) / total, 4),
        "top5_share": round(sum(item["total_amount"] for item in ranking[:5]) / total, 4),
        "top10_share": round(sum(item["total_amount"] for item in ranking[:10]) / total, 4),
    }


def build_section_payloads(rows: list[dict[str, Any]], alerts: list[dict[str, Any]]) -> dict[str, Any]:
    scoped_alerts = alerts_for_rows(alerts, rows)
    vendor_ranking = rank_entities(rows, "vendor_id", "vendor_name", "unit_id")
    unit_ranking = rank_entities(rows, "unit_id", "unit_name", "vendor_id")
    dashboard = {
        "summary": summarise_rows(rows),
        "series": {"monthly": aggregate_timeseries(rows, "month"), "yearly": aggregate_timeseries(rows, "year")},
        "types": [{"type": type_name, "count": count} for type_name, count in Counter(row["type_normalized"] for row in rows).most_common()],
        "top_vendors": vendor_ranking[:10],
        "top_units": unit_ranking[:10],
        "latest_records": [record_excerpt(row) for row in sorted(rows, key=lambda row: (row["award_date"] or "", row["record_id"]), reverse=True)[:20]],
        "heatmap": build_heatmap(rows),
        "alerts": scoped_alerts[:12],
    }
    vendors = {
        "ranking_by_amount": vendor_ranking,
        "ranking_by_count": sorted(vendor_ranking, key=lambda item: (-item["contract_count"], -item["total_amount"], item["name"])),
        "concentration": concentration_for_ranking(vendor_ranking),
        "new_by_year": [],
        "recurring": [],
        "highlights": [alert for alert in scoped_alerts if alert["kind"] in {"vendor-growth", "fragmentation-pattern"}][:12],
    }
    units = {
        "ranking_by_amount": unit_ranking,
        "ranking_by_count": sorted(unit_ranking, key=lambda item: (-item["contract_count"], -item["total_amount"], item["name"])),
        "high_spend_vs_fragmentation": [{"id": item["id"], "name": item["name"], "total_amount": item["total_amount"], "contract_count": item["contract_count"], "mean_amount": item["mean_amount"]} for item in unit_ranking[:25]],
        "highlights": [alert for alert in scoped_alerts if alert["filters"].get("unit")][:12],
    }
    return {
        "dashboard": dashboard,
        "vendors": vendors,
        "units": units,
        "competition": build_competition_section(rows),
        "amounts": build_amount_distribution(rows),
        "topics": build_topics_section(rows),
        "timeline": build_timeline_section(rows),
    }


def build_artifacts(records: list[dict[str, Any]], audits: dict[str, Any]) -> dict[str, Any]:
    alerts = audits["alerts"]
    topic_catalog = audits["topic_catalog"]

    vendor_ranking = rank_entities(records, "vendor_id", "vendor_name", "unit_id")
    unit_ranking = rank_entities(records, "unit_id", "unit_name", "vendor_id")

    vendor_grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    unit_grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        vendor_grouped[record["vendor_id"]].append(record)
        unit_grouped[record["unit_id"]].append(record)

    vendor_details = {vendor_id: build_entity_payload(vendor_id, rows, alerts, "unit_id", "unit_name", "vendor") for vendor_id, rows in vendor_grouped.items()}
    unit_details = {unit_id: build_entity_payload(unit_id, rows, alerts, "vendor_id", "vendor_name", "unit") for unit_id, rows in unit_grouped.items()}

    yearly_vendor_new: Counter[int] = Counter()
    recurring_vendors = []
    for item in vendor_ranking:
        rows = vendor_grouped[item["id"]]
        first_year = min(row["source_year"] for row in rows)
        yearly_vendor_new[first_year] += 1
        years = sorted({row["source_year"] for row in rows})
        if len(years) >= 3:
            recurring_vendors.append({"id": item["id"], "name": item["name"], "years": years, "total_amount": item["total_amount"]})

    vendor_total_amount = sum(item["total_amount"] for item in vendor_ranking) or 1
    vendor_concentration = {
        "top1_share": round(sum(item["total_amount"] for item in vendor_ranking[:1]) / vendor_total_amount, 4),
        "top5_share": round(sum(item["total_amount"] for item in vendor_ranking[:5]) / vendor_total_amount, 4),
        "top10_share": round(sum(item["total_amount"] for item in vendor_ranking[:10]) / vendor_total_amount, 4),
    }

    unit_total_amount = sum(item["total_amount"] for item in unit_ranking) or 1
    for ranking, details, total_amount in (
        (vendor_ranking, vendor_details, vendor_total_amount),
        (unit_ranking, unit_details, unit_total_amount),
    ):
        for index, item in enumerate(ranking):
            detail = details[item["id"]]
            detail["rank"] = index + 1
            detail["share_of_total"] = round(item["total_amount"] / total_amount, 6)
            detail["comparable_peers"] = [
                {"id": peer["id"], "name": peer["name"], "total_amount": peer["total_amount"], "contract_count": peer["contract_count"]}
                for peer in ranking[max(0, index - 2):index + 3]
                if peer["id"] != item["id"]
            ]

    dashboard = {
        "summary": summarise_rows(records),
        "series": {"monthly": aggregate_timeseries(records, "month"), "yearly": aggregate_timeseries(records, "year")},
        "types": [{"type": type_name, "count": count} for type_name, count in Counter(row["type_normalized"] for row in records).most_common()],
        "top_vendors": vendor_ranking[:10],
        "top_units": unit_ranking[:10],
        "latest_records": [record_excerpt(row) for row in sorted(records, key=lambda row: (row["award_date"] or "", row["record_id"]), reverse=True)[:20]],
        "heatmap": build_heatmap(records),
        "alerts": alerts[:12],
    }

    vendors = {
        "ranking_by_amount": vendor_ranking,
        "ranking_by_count": sorted(vendor_ranking, key=lambda item: (-item["contract_count"], -item["total_amount"], item["name"])),
        "concentration": vendor_concentration,
        "new_by_year": [{"year": year, "count": count} for year, count in sorted(yearly_vendor_new.items())],
        "recurring": sorted(recurring_vendors, key=lambda item: (-len(item["years"]), -item["total_amount"], item["name"]))[:25],
        "highlights": [alert for alert in alerts if alert["kind"] in {"vendor-growth", "fragmentation-pattern"}][:12],
    }

    units = {
        "ranking_by_amount": unit_ranking,
        "ranking_by_count": sorted(unit_ranking, key=lambda item: (-item["contract_count"], -item["total_amount"], item["name"])),
        "high_spend_vs_fragmentation": [{"id": item["id"], "name": item["name"], "total_amount": item["total_amount"], "contract_count": item["contract_count"], "mean_amount": item["mean_amount"]} for item in unit_ranking[:25]],
        "highlights": [alert for alert in alerts if alert["filters"].get("unit")][:12],
    }

    competition = build_competition_section(records)
    amounts = build_amount_distribution(records)
    patterns = {
        "alerts": alerts,
        "fragmentation": [alert for alert in alerts if alert["kind"] == "fragmentation-pattern"],
        "repeated_amounts": [alert for alert in alerts if alert["kind"] == "repeated-amounts"],
        "near_threshold_groups": [alert for alert in alerts if alert["kind"] == "near-threshold-group"],
        "counts": {
            "rule_types": len({alert["kind"] for alert in alerts}),
            "grouped_cases": len({alert["family_id"] for alert in alerts}),
            "individual_signals": len(alerts),
        },
    }
    topics = build_topics_section(records)
    timeline = build_timeline_section(records)
    meta = build_meta(records, alerts, topic_catalog)

    yearly_sections: dict[int, dict[str, Any]] = {}
    for year in sorted({record["source_year"] for record in records}):
        yearly_sections[year] = build_section_payloads(
            [record for record in records if record["source_year"] == year],
            alerts,
        )

    explorer_years: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        explorer_years[record["source_year"]].append(record_excerpt(record) | {
            "unit_raw": record["unit_raw"],
            "vendor_raw": record["vendor_raw"],
            "type_raw": record["type_raw"],
            "subject_clean": record["subject_clean"],
            "topic_ids": record["topic_ids"],
            "search_terms": record.get("search_terms", []),
        })

    return {
        "meta": meta,
        "dashboard": dashboard,
        "vendors": vendors,
        "units": units,
        "competition": competition,
        "amounts": amounts,
        "patterns": patterns,
        "topics": topics,
        "timeline": timeline,
        "vendor_index": [{"id": item["id"], "name": item["name"], "aliases": sorted({row["vendor_raw"] for row in vendor_grouped[item["id"]] if row["vendor_raw"] != item["name"]}), "total_amount": item["total_amount"], "contract_count": item["contract_count"], "years": vendor_details[item["id"]]["totals"]["years"]} for item in vendor_ranking],
        "unit_index": [{"id": item["id"], "name": item["name"], "aliases": sorted({row["unit_raw"] for row in unit_grouped[item["id"]] if row["unit_raw"] != item["name"]}), "total_amount": item["total_amount"], "contract_count": item["contract_count"], "years": unit_details[item["id"]]["totals"]["years"]} for item in unit_ranking],
        "vendor_details": vendor_details,
        "unit_details": unit_details,
        "explorer_years": explorer_years,
        "yearly_sections": yearly_sections,
        "audits": audits,
        "canonical_records": records,
    }



def write_artifacts(artifacts: dict[str, Any], settings: dict[str, Any]) -> None:
    derived_dir: Path = settings["derived_dir"]
    canonical_dir: Path = settings["canonical_dir"]
    reports_dir: Path = settings["reports_dir"]

    write_json(derived_dir / "meta.json", artifacts["meta"])
    write_json(derived_dir / "dashboard.json", artifacts["dashboard"])
    write_json(derived_dir / "vendors.json", artifacts["vendors"])
    write_json(derived_dir / "units.json", artifacts["units"])
    write_json(derived_dir / "competition.json", artifacts["competition"])
    write_json(derived_dir / "amounts.json", artifacts["amounts"])
    write_json(derived_dir / "patterns.json", artifacts["patterns"])
    write_json(derived_dir / "topics.json", artifacts["topics"])
    write_json(derived_dir / "timeline.json", artifacts["timeline"])
    section_names = ("dashboard", "vendors", "units", "competition", "amounts", "topics", "timeline")
    for section_name in section_names:
        write_json(derived_dir / section_name / "all.json", artifacts[section_name])
    for year, sections in artifacts["yearly_sections"].items():
        for section_name in section_names:
            write_json(derived_dir / section_name / f"{year}.json", sections[section_name])
    write_json(derived_dir / "entities" / "vendors" / "index.json", artifacts["vendor_index"])
    write_json(derived_dir / "entities" / "units" / "index.json", artifacts["unit_index"])

    for vendor_id, payload in artifacts["vendor_details"].items():
        write_json(derived_dir / "entities" / "vendors" / f"{vendor_id}.json", payload)
    for unit_id, payload in artifacts["unit_details"].items():
        write_json(derived_dir / "entities" / "units" / f"{unit_id}.json", payload)
    for year, rows in artifacts["explorer_years"].items():
        write_json(derived_dir / "explorer" / f"{year}.json", {"year": year, "records": rows})

    write_json(canonical_dir / "canonical-records.json", artifacts["canonical_records"])
    write_json(reports_dir / "entity-review-report.json", artifacts["audits"]["entity_reviews"])
    write_json(reports_dir / "topic-catalog.json", artifacts["audits"]["topic_catalog"])
    write_json(reports_dir / "alerts.json", artifacts["audits"]["alerts"])



def build_from_raw(raw_by_year: dict[int, list[dict[str, Any]]], settings: dict[str, Any] | None = None) -> dict[str, Any]:
    resolved_settings = settings or load_settings()
    records, audits = canonicalize_records(raw_by_year, resolved_settings)
    artifacts = build_artifacts(records, audits)
    write_artifacts(artifacts, resolved_settings)
    return artifacts



def refresh_data(years: list[int] | None = None, force_download: bool = False, settings: dict[str, Any] | None = None) -> dict[str, Any]:
    resolved_settings = settings or load_settings()
    download_all(resolved_settings, years=years, force=force_download)
    raw_by_year = load_raw_datasets(resolved_settings, years=years)
    return build_from_raw(raw_by_year, resolved_settings)



def build_from_fixture_directory(fixture_dir: Path, settings: dict[str, Any] | None = None) -> dict[str, Any]:
    resolved_settings = settings or load_settings()
    raw_by_year: dict[int, list[dict[str, Any]]] = {}
    for path in sorted(fixture_dir.glob("raw-*.json")):
        year = int(path.stem.split("-")[-1])
        raw_by_year[year] = read_json(path, default=[])
    return build_from_raw(raw_by_year, resolved_settings)
