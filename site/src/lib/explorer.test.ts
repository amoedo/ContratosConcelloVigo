import { describe, expect, it } from 'vitest';

import { defaultFilters } from '@/lib/filters';
import { EXPLORER_PAGE_SIZE, explorerCsv, filterExplorerRows, paginateExplorerRows, sortExplorerRows } from '@/lib/explorer';
import type { RecordExcerpt } from '@/lib/types';

function record(id: string, amount: number, subject: string, date: string): RecordExcerpt {
  return {
    record_id: id, award_date: date, source_year: 2026, expediente_key: id, expediente_raw: `EXP-${id}`,
    unit_id: 'cultura', unit_name: 'ÁREA DE CULTURA', vendor_id: 'empresa', vendor_name: 'EMPRESA ÁRTICA',
    type_normalized: 'servicio', subject_raw: subject, importe_eur: amount, licitadores_raw: 1,
    competition_bucket: '1', amount_bucket: '500-2000', primary_topic_id: 'eventos-cultura',
    primary_topic_label: 'Eventos e cultura', alert_flags: [], data_quality_flags: [], near_threshold: false,
  };
}

describe('explorer data operations', () => {
  const rows = [record('a', 1200, 'Iluminación', '2026-01-02'), record('b', 800, 'Sonorización', '2026-03-04')];

  it('filters accent-insensitively and by amount', () => {
    expect(filterExplorerRows(rows, { ...defaultFilters, q: 'iluminacion', min_amount: '1000' })).toEqual([rows[0]]);
  });

  it('sorts and never returns more than the page size', () => {
    expect(sortExplorerRows(rows, 'amount', 'asc').map((item) => item.record_id)).toEqual(['b', 'a']);
    expect(paginateExplorerRows(Array.from({ length: 120 }, (_, index) => ({ ...rows[0], record_id: String(index) })), 1)).toHaveLength(EXPLORER_PAGE_SIZE);
  });

  it('exports Excel-friendly localized CSV and escapes quotes', () => {
    const output = explorerCsv([{ ...rows[0], subject_raw: 'Acto "Vigo"' }], 'gl');
    expect(output.startsWith('\uFEFF"data";')).toBe(true);
    expect(output).toContain('"Acto ""Vigo"""');
  });
});
