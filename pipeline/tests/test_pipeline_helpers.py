from __future__ import annotations

from collections import Counter

import pytest

from contratos_vigo.pipeline import (
    amount_bucket,
    base_entity_key,
    competition_bucket,
    normalize_type,
    pick_display_label,
    similarity,
    strip_suffix_tokens,
    token_overlap,
)


class TestSimilarity:
    def test_identical_strings(self) -> None:
        assert similarity("hello", "hello") == 100.0

    def test_completely_different(self) -> None:
        assert similarity("abc", "xyz") < 50

    def test_similar_strings(self) -> None:
        score = similarity("EMPRESA DE LIMPIEZA", "EMPRESA LIMPIEZA")
        assert score > 70


class TestTokenOverlap:
    def test_identical_tokens(self) -> None:
        assert token_overlap("a b c", "a b c") == 1.0

    def test_partial_overlap(self) -> None:
        assert token_overlap("a b c", "a b d") == pytest.approx(2 / 3)

    def test_empty_left(self) -> None:
        assert token_overlap("", "a b") == 0.0

    def test_empty_right(self) -> None:
        assert token_overlap("a b", "") == 0.0


class TestAmountBucket:
    def test_zero_amount(self) -> None:
        assert amount_bucket(0) == "0-500"

    def test_boundary_500(self) -> None:
        assert amount_bucket(500) == "500-2000"

    def test_large_amount(self) -> None:
        assert amount_bucket(20000) == "15000+"

    def test_mid_range(self) -> None:
        assert amount_bucket(3000) == "2000-5000"


class TestCompetitionBucket:
    def test_none(self) -> None:
        assert competition_bucket(None) == "desconocido"

    def test_zero(self) -> None:
        assert competition_bucket(0) == "desconocido"

    def test_negative(self) -> None:
        assert competition_bucket(-1) == "desconocido"

    def test_one(self) -> None:
        assert competition_bucket(1) == "1"

    def test_three(self) -> None:
        assert competition_bucket(3) == "3"

    def test_four_plus(self) -> None:
        assert competition_bucket(4) == "4+"

    def test_large_number(self) -> None:
        assert competition_bucket(100) == "4+"


class TestStripSuffixTokens:
    def test_removes_sa(self) -> None:
        assert strip_suffix_tokens(["EMPRESA", "S", "A"]) == ["EMPRESA"]

    def test_removes_sl(self) -> None:
        assert strip_suffix_tokens(["EMPRESA", "S", "L"]) == ["EMPRESA"]

    def test_removes_unipersonal(self) -> None:
        assert strip_suffix_tokens(["EMPRESA", "UNIPERSONAL"]) == ["EMPRESA"]

    def test_no_suffix(self) -> None:
        assert strip_suffix_tokens(["EMPRESA", "GRANDE"]) == ["EMPRESA", "GRANDE"]

    def test_empty(self) -> None:
        assert strip_suffix_tokens([]) == []


class TestBaseEntityKey:
    def test_vendor_strips_suffix(self) -> None:
        key = base_entity_key("Empresa S.L.", "vendor")
        assert "SL" not in key.split()
        assert "EMPRESA" in key

    def test_unit_keeps_full_name(self) -> None:
        key = base_entity_key("Unidade S.L.", "unit")
        assert key == "UNIDADE S L"


class TestPickDisplayLabel:
    def test_preferred_overrides(self) -> None:
        counts: Counter[str] = Counter({"A": 5, "B": 3})
        assert pick_display_label(["A", "B"], counts, preferred="Custom") == "Custom"

    def test_picks_most_frequent(self) -> None:
        counts: Counter[str] = Counter({"Alpha": 10, "Beta": 2})
        result = pick_display_label(["Alpha", "Beta"], counts)
        assert result == "Alpha"


class TestNormalizeType:
    def test_privado(self) -> None:
        assert normalize_type("Contrato Privado", "") == "privado"

    def test_obra(self) -> None:
        assert normalize_type("Obra menor", "") == "obra"

    def test_suministro(self) -> None:
        assert normalize_type("Suministro", "") == "suministro"

    def test_servicio(self) -> None:
        assert normalize_type("Servicio de limpieza", "") == "servicio"

    def test_other(self) -> None:
        assert normalize_type("Algo desconocido", "") == "otro"

    def test_privado_from_subject(self) -> None:
        assert normalize_type("", "contrato privado de oficina") == "privado"
