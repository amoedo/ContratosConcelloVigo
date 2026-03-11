from __future__ import annotations

import hashlib
import json
import math
import re
import unicodedata
from datetime import date, datetime
from pathlib import Path
from statistics import median as statistics_median
from typing import Any

WHITESPACE_RE = re.compile(r"\s+")
PUNCT_RE = re.compile(r"[^\w\s]")
TOKEN_RE = re.compile(r"[\wÀ-ÿ]+", re.UNICODE)
MONTH_LABELS = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
]


def clean_label(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).replace("\n", " ").replace("\r", " ").strip()
    return WHITESPACE_RE.sub(" ", text)



def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")



def normalize_ascii_key(value: Any) -> str:
    cleaned = clean_label(value)
    ascii_value = strip_accents(cleaned).upper()
    ascii_value = PUNCT_RE.sub(" ", ascii_value)
    return WHITESPACE_RE.sub(" ", ascii_value).strip()



def normalize_search_text(value: Any) -> str:
    return normalize_ascii_key(value).lower()



def slugify(value: Any) -> str:
    ascii_value = normalize_search_text(value)
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug or "sen-identificador"



def stable_hash(*parts: Any, length: int = 16) -> str:
    digest = hashlib.sha1("||".join(clean_label(part) for part in parts).encode("utf-8")).hexdigest()
    return digest[:length]



def safe_float(value: Any, default: float = 0.0) -> float:
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default



def safe_int(value: Any, default: int | None = None) -> int | None:
    if value in (None, ""):
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default



def parse_date(value: Any) -> date | None:
    cleaned = clean_label(value)
    if not cleaned:
        return None
    try:
        return datetime.strptime(cleaned[:10], "%Y-%m-%d").date()
    except ValueError:
        return None



def month_key(value: date | None) -> str | None:
    if value is None:
        return None
    return f"{value.year}-{value.month:02d}"



def month_label(month_number: int) -> str:
    return MONTH_LABELS[month_number - 1]



def percentile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * q
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] + (ordered[upper] - ordered[lower]) * weight



def median(values: list[float]) -> float:
    if not values:
        return 0.0
    return float(statistics_median(values))



def tokenize(text: str) -> list[str]:
    return [token for token in TOKEN_RE.findall(text.lower()) if len(token) > 2]



def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))



def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
