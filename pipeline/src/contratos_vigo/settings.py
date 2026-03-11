from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
PIPELINE_ROOT = REPO_ROOT / "pipeline"
CONFIG_DIR = PIPELINE_ROOT / "config"
RAW_DIR = PIPELINE_ROOT / "data" / "raw"
CANONICAL_DIR = PIPELINE_ROOT / "data" / "canonical"
REPORTS_DIR = PIPELINE_ROOT / "data" / "reports"
DERIVED_DIR = REPO_ROOT / "site" / "public" / "data" / "derived"
SOURCE_URL_TEMPLATE = "https://datos.vigo.org/data/sector-publico/contratos-menores-{suffix}.json"


def load_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def load_settings() -> dict[str, Any]:
    aliases = load_json(CONFIG_DIR / "aliases.json", default={"vendors": {}, "units": {}})
    thresholds = load_json(CONFIG_DIR / "legal-thresholds.json", default={})
    stopwords = load_json(CONFIG_DIR / "stopwords.json", default=[])
    topic_rules = load_json(CONFIG_DIR / "topic-rules.json", default=[])

    return {
        "start_year": 2019,
        "current_year": date.today().year,
        "raw_dir": RAW_DIR,
        "canonical_dir": CANONICAL_DIR,
        "reports_dir": REPORTS_DIR,
        "derived_dir": DERIVED_DIR,
        "source_url_template": SOURCE_URL_TEMPLATE,
        "aliases": aliases,
        "legal_thresholds": thresholds,
        "stopwords": set(stopwords),
        "topic_rules": topic_rules,
        "fuzzy_threshold_vendor": 97,
        "fuzzy_threshold_unit": 98,
    }
