from __future__ import annotations

import json
import urllib.error
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from contratos_vigo.pipeline import build_from_raw, canonicalize_records, download_year, read_json
from contratos_vigo.settings import load_settings

FIXTURE_DIR = Path(__file__).parent / 'fixtures'


def load_fixture_map() -> dict[int, list[dict[str, object]]]:
    return {
        2019: read_json(FIXTURE_DIR / 'raw-2019.json', default=[]),
        2020: read_json(FIXTURE_DIR / 'raw-2020.json', default=[]),
        2026: read_json(FIXTURE_DIR / 'raw-2026.json', default=[]),
    }


def test_canonicalization_normalizes_entities_and_synthetic_expediente(tmp_path: Path) -> None:
    settings = load_settings()
    settings['canonical_dir'] = tmp_path / 'canonical'
    settings['reports_dir'] = tmp_path / 'reports'
    settings['derived_dir'] = tmp_path / 'derived'

    records, audits = canonicalize_records(load_fixture_map(), settings)

    synthetic_rows = [row for row in records if row['source_year'] == 2019]
    assert synthetic_rows
    assert all('synthetic-expediente' in row['data_quality_flags'] for row in synthetic_rows)

    faro_rows = [row for row in records if 'FARO DE VIGO' in row['vendor_name']]
    assert faro_rows
    assert len({row['vendor_id'] for row in faro_rows}) == 1
    assert any(alert['kind'] == 'unit-concentration' for alert in audits['alerts'])


def test_build_from_raw_writes_expected_artifacts(tmp_path: Path) -> None:
    settings = load_settings()
    settings['canonical_dir'] = tmp_path / 'canonical'
    settings['reports_dir'] = tmp_path / 'reports'
    settings['derived_dir'] = tmp_path / 'derived'

    artifacts = build_from_raw(load_fixture_map(), settings)

    assert (tmp_path / 'derived' / 'dashboard.json').exists()
    assert (tmp_path / 'derived' / 'entities' / 'vendors' / 'index.json').exists()
    assert (tmp_path / 'reports' / 'alerts.json').exists()
    assert artifacts['dashboard']['summary']['contract_count'] == 8
    assert any(row['competition_bucket'] == 'desconocido' for row in artifacts['canonical_records'])


def test_download_year_retries_on_transient_error(tmp_path: Path) -> None:
    settings = load_settings()
    settings['raw_dir'] = tmp_path / 'raw'
    settings['source_url_template'] = 'https://example.com/data-{suffix}.json'

    payload = [{'id': 1}]
    response_mock = MagicMock()
    response_mock.__enter__ = lambda s: s
    response_mock.__exit__ = MagicMock(return_value=False)
    response_mock.read.return_value = json.dumps(payload).encode('utf-8')

    url_error = urllib.error.URLError(reason='connection refused')
    with patch('contratos_vigo.pipeline.urlopen', side_effect=[url_error, response_mock]) as mock_urlopen, \
         patch('contratos_vigo.pipeline.time.sleep') as mock_sleep:
        result = download_year(2024, settings, force=True)

    assert result.exists()
    assert mock_urlopen.call_count == 2
    mock_sleep.assert_called_once_with(5)


def test_download_year_raises_after_all_retries_exhausted(tmp_path: Path) -> None:
    settings = load_settings()
    settings['raw_dir'] = tmp_path / 'raw'
    settings['source_url_template'] = 'https://example.com/data-{suffix}.json'

    url_error = urllib.error.URLError(reason='connection timed out')
    with patch('contratos_vigo.pipeline.urlopen', side_effect=url_error), \
         patch('contratos_vigo.pipeline.time.sleep'):
        with pytest.raises(urllib.error.URLError):
            download_year(2024, settings, force=True)
