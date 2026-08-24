import { describe, expect, it } from 'vitest';

import { sortAlertsByRecency } from '@/lib/alerts';
import type { AlertItem } from '@/lib/types';

function buildAlert(overrides: Partial<AlertItem> = {}): AlertItem {
  return {
    alert_id: 'alert-1',
    kind: 'fragmentation-pattern',
    severity: 'media',
    sort_date: '2024-01-01',
    title: 'Alerta',
    summary: 'Resumen',
    evidence: {},
    filters: { year: '2024' },
    related_record_ids: [],
    ...overrides,
  };
}

describe('sortAlertsByRecency', () => {
  it('sorts alerts from most recent to oldest using sort_date', () => {
    const alerts = [
      buildAlert({ alert_id: 'older', sort_date: '2023-04-11' }),
      buildAlert({ alert_id: 'newest', sort_date: '2024-06-01' }),
      buildAlert({ alert_id: 'middle', sort_date: '2024-01-15' }),
    ];

    expect(sortAlertsByRecency(alerts).map((alert) => alert.alert_id)).toEqual(['newest', 'middle', 'older']);
  });

  it('falls back to the alert year when sort_date is missing', () => {
    const alerts = [
      buildAlert({ alert_id: 'year-2022', sort_date: null, filters: { year: '2022' } }),
      buildAlert({ alert_id: 'year-2025', sort_date: null, filters: { year: '2025' } }),
      buildAlert({ alert_id: 'year-2024', sort_date: null, filters: { year: '2024' } }),
    ];

    expect(sortAlertsByRecency(alerts).map((alert) => alert.alert_id)).toEqual(['year-2025', 'year-2024', 'year-2022']);
  });
});
