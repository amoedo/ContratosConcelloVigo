from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pytest

from contratos_vigo.text import (
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
    strip_accents,
    tokenize,
    write_json,
)


class TestCleanLabel:
    def test_removes_newlines_and_extra_whitespace(self) -> None:
        assert clean_label("  hello\n  world\r ") == "hello world"

    def test_returns_empty_string_for_none(self) -> None:
        assert clean_label(None) == ""

    def test_converts_non_string(self) -> None:
        assert clean_label(42) == "42"

    def test_strips_surrounding_whitespace(self) -> None:
        assert clean_label("   abc   ") == "abc"


class TestStripAccents:
    def test_removes_spanish_accents(self) -> None:
        assert strip_accents("señor común") == "senor comun"

    def test_removes_galician_characters(self) -> None:
        assert strip_accents("información") == "informacion"

    def test_preserves_ascii(self) -> None:
        assert strip_accents("hello world") == "hello world"


class TestNormalizeAsciiKey:
    def test_uppercases_and_strips_accents(self) -> None:
        assert normalize_ascii_key("café") == "CAFE"

    def test_removes_punctuation(self) -> None:
        assert normalize_ascii_key("hello, world!") == "HELLO WORLD"

    def test_collapses_whitespace(self) -> None:
        assert normalize_ascii_key("  a   b  ") == "A B"

    def test_handles_none(self) -> None:
        assert normalize_ascii_key(None) == ""


class TestNormalizeSearchText:
    def test_returns_lowercase(self) -> None:
        assert normalize_search_text("Café Señor") == "cafe senor"


class TestSlugify:
    def test_basic_slug(self) -> None:
        assert slugify("Hello World") == "hello-world"

    def test_strips_accents_in_slug(self) -> None:
        assert slugify("Señor café") == "senor-cafe"

    def test_empty_returns_sentinel(self) -> None:
        assert slugify("") == "sen-identificador"

    def test_special_characters_become_dashes(self) -> None:
        assert slugify("a & b / c") == "a-b-c"


class TestStableHash:
    def test_deterministic(self) -> None:
        h1 = stable_hash("a", "b")
        h2 = stable_hash("a", "b")
        assert h1 == h2

    def test_different_inputs_differ(self) -> None:
        assert stable_hash("x") != stable_hash("y")

    def test_custom_length(self) -> None:
        assert len(stable_hash("test", length=8)) == 8


class TestSafeFloat:
    def test_valid_number(self) -> None:
        assert safe_float("3.14") == 3.14

    def test_none_returns_default(self) -> None:
        assert safe_float(None) == 0.0

    def test_empty_string_returns_default(self) -> None:
        assert safe_float("") == 0.0

    def test_invalid_returns_default(self) -> None:
        assert safe_float("abc", default=-1.0) == -1.0


class TestSafeInt:
    def test_valid_integer(self) -> None:
        assert safe_int("5") == 5

    def test_float_string_truncates(self) -> None:
        assert safe_int("3.9") == 3

    def test_none_returns_default(self) -> None:
        assert safe_int(None) is None

    def test_empty_string_returns_default(self) -> None:
        assert safe_int("", default=0) == 0

    def test_invalid_returns_default(self) -> None:
        assert safe_int("abc") is None


class TestParseDate:
    def test_valid_iso_date(self) -> None:
        assert parse_date("2024-01-15") == date(2024, 1, 15)

    def test_truncates_extra_characters(self) -> None:
        assert parse_date("2024-03-20T10:30:00") == date(2024, 3, 20)

    def test_none_returns_none(self) -> None:
        assert parse_date(None) is None

    def test_empty_returns_none(self) -> None:
        assert parse_date("") is None

    def test_invalid_format_returns_none(self) -> None:
        assert parse_date("not-a-date") is None


class TestMonthKey:
    def test_formats_month_with_leading_zero(self) -> None:
        assert month_key(date(2024, 3, 1)) == "2024-03"

    def test_none_returns_none(self) -> None:
        assert month_key(None) is None


class TestMonthLabel:
    def test_january(self) -> None:
        assert month_label(1) == "ene"

    def test_december(self) -> None:
        assert month_label(12) == "dic"


class TestPercentile:
    def test_empty_returns_zero(self) -> None:
        assert percentile([], 0.5) == 0.0

    def test_single_value(self) -> None:
        assert percentile([10.0], 0.5) == 10.0

    def test_median_of_two(self) -> None:
        assert percentile([10.0, 20.0], 0.5) == 15.0

    def test_percentile_25(self) -> None:
        result = percentile([1.0, 2.0, 3.0, 4.0, 5.0], 0.25)
        assert result == 2.0


class TestMedian:
    def test_empty_returns_zero(self) -> None:
        assert median([]) == 0.0

    def test_odd_count(self) -> None:
        assert median([1.0, 3.0, 5.0]) == 3.0

    def test_even_count(self) -> None:
        assert median([1.0, 2.0, 3.0, 4.0]) == 2.5


class TestTokenize:
    def test_basic_tokenization(self) -> None:
        tokens = tokenize("servicio de limpieza")
        assert tokens == ["servicio", "limpieza"]

    def test_short_tokens_excluded(self) -> None:
        tokens = tokenize("a en de largo")
        assert tokens == ["largo"]


class TestReadWriteJson:
    def test_read_missing_returns_default(self, tmp_path: Path) -> None:
        assert read_json(tmp_path / "nope.json", default=[]) == []

    def test_write_and_read_roundtrip(self, tmp_path: Path) -> None:
        data = {"key": "value", "num": 42}
        path = tmp_path / "sub" / "test.json"
        write_json(path, data)
        assert read_json(path) == data

    def test_write_creates_parent_directories(self, tmp_path: Path) -> None:
        path = tmp_path / "a" / "b" / "c.json"
        write_json(path, [1, 2, 3])
        assert path.exists()
        assert read_json(path) == [1, 2, 3]
