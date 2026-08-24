from __future__ import annotations

from pathlib import Path

from contratos_vigo.pipeline import build_alerts, build_from_raw, canonicalize_records, read_json, threshold_for_record
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
    assert not any(alert['kind'] == 'unit-concentration' for alert in audits['alerts'])


def test_build_from_raw_writes_expected_artifacts(tmp_path: Path) -> None:
    settings = load_settings()
    settings['canonical_dir'] = tmp_path / 'canonical'
    settings['reports_dir'] = tmp_path / 'reports'
    settings['derived_dir'] = tmp_path / 'derived'

    artifacts = build_from_raw(load_fixture_map(), settings)

    assert (tmp_path / 'derived' / 'dashboard.json').exists()
    assert (tmp_path / 'derived' / 'dashboard' / '2026.json').exists()
    assert (tmp_path / 'derived' / 'competition' / 'all.json').exists()
    assert (tmp_path / 'derived' / 'entities' / 'vendors' / 'index.json').exists()
    assert (tmp_path / 'reports' / 'alerts.json').exists()
    assert artifacts['dashboard']['summary']['contract_count'] == 8
    assert any(row['competition_bucket'] == 'desconocido' for row in artifacts['canonical_records'])
    assert artifacts['meta']['source_url'] == 'https://datos.vigo.org/'
    assert artifacts['meta']['coverage']['dataset_start_year'] == 2019
    assert all('family_id' in alert and 'rule_parameters' in alert for alert in artifacts['patterns']['alerts'])
    assert all('aliases' in item for item in artifacts['vendor_index'])
    assert artifacts['patterns']['counts']['individual_signals'] == len(artifacts['patterns']['alerts'])


def alert_record(index: int, *, year: int = 2025, vendor: str = 'vendor-a', amount: float = 1200) -> dict[str, object]:
    return {
        'record_id': f'{year}-{vendor}-{index}', 'source_year': year, 'award_date': f'{year}-01-{index + 1:02d}',
        'unit_id': 'unit-a', 'unit_name': 'Unidade A', 'vendor_id': vendor, 'vendor_name': vendor,
        'importe_eur': amount, 'licitadores_raw': 1, 'near_threshold': False,
        'primary_topic_id': 'topic-a', 'primary_topic_label': 'Tema A', 'legal_threshold_eur': 15000,
        'alert_flags': [],
    }


def test_concentration_requires_ten_records_and_exposes_observation_dates() -> None:
    assert not any(alert['kind'] == 'unit-concentration' for alert in build_alerts([alert_record(i) for i in range(9)]))
    alerts = build_alerts([alert_record(i) for i in range(10)])
    concentration = next(alert for alert in alerts if alert['kind'] == 'unit-concentration')
    assert concentration['evidence']['record_count'] == 10
    assert concentration['observed_from'] == '2025-01-01'
    assert concentration['observed_to'] == '2025-01-10'
    assert concentration['rule_version'] == '2.0'


def test_growth_requires_consecutive_years_and_marks_current_year_partial() -> None:
    non_consecutive = [alert_record(0, year=2024, amount=1000), alert_record(0, year=2026, amount=6000)]
    assert not any(alert['kind'] == 'vendor-growth' for alert in build_alerts(non_consecutive))

    consecutive = [alert_record(0, year=2025, amount=1000), alert_record(0, year=2026, amount=6000)]
    growth = next(alert for alert in build_alerts(consecutive) if alert['kind'] == 'vendor-growth')
    assert growth['is_partial_comparison'] is True
    assert growth['caveats'] == ['partial-year-comparison']


def test_legal_thresholds_distinguish_works_from_services_and_supplies() -> None:
    settings = load_settings()
    assert threshold_for_record({'source_year': 2026, 'type_normalized': 'obra'}, settings) == 40000
    assert threshold_for_record({'source_year': 2026, 'type_normalized': 'servicio'}, settings) == 15000
    assert threshold_for_record({'source_year': 2026, 'type_normalized': 'suministro'}, settings) == 15000
