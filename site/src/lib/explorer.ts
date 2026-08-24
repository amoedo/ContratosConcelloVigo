import type { FilterState } from '@/lib/filters';
import type { RecordExcerpt } from '@/lib/types';

export const EXPLORER_PAGE_SIZE = 50;

export function normalizeForSearch(value: string | null | undefined) {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function filterExplorerRows(rows: RecordExcerpt[], filters: FilterState) {
  const query = normalizeForSearch(filters.q);
  const min = Number(filters.min_amount || 0);
  const max = Number(filters.max_amount || Infinity);
  return rows.filter((row) => {
    if (filters.unit && row.unit_id !== filters.unit) return false;
    if (filters.vendor && row.vendor_id !== filters.vendor) return false;
    if (filters.type && row.type_normalized !== filters.type) return false;
    if (filters.competition && row.competition_bucket !== filters.competition) return false;
    if (filters.amount && row.amount_bucket !== filters.amount) return false;
    if (filters.topic && row.primary_topic_id !== filters.topic && !(row.topic_ids ?? []).includes(filters.topic)) return false;
    if (filters.date_from && (!row.award_date || row.award_date < filters.date_from)) return false;
    if (filters.date_to && (!row.award_date || row.award_date > filters.date_to)) return false;
    if (row.importe_eur < min || row.importe_eur > max) return false;
    if (filters.expediente && !normalizeForSearch(row.expediente_raw).includes(normalizeForSearch(filters.expediente))) return false;
    if (filters.alert && !row.alert_flags.includes(filters.alert)) return false;
    if (filters.quality === 'near-threshold' && !row.near_threshold) return false;
    if (filters.quality && filters.quality !== 'near-threshold' && !row.data_quality_flags.includes(filters.quality)) return false;
    if (query && !normalizeForSearch([row.subject_raw, row.vendor_name, row.unit_name, row.type_normalized, row.expediente_raw].join(' ')).includes(query)) return false;
    return true;
  });
}

export function sortExplorerRows(rows: RecordExcerpt[], sort: string, direction: string) {
  return rows.slice().sort((left, right) => {
    let result = 0;
    if (sort === 'amount') result = left.importe_eur - right.importe_eur;
    else if (sort === 'vendor') result = left.vendor_name.localeCompare(right.vendor_name);
    else if (sort === 'unit') result = left.unit_name.localeCompare(right.unit_name);
    else if (sort === 'bidders') result = (left.licitadores_raw ?? -1) - (right.licitadores_raw ?? -1);
    else result = (left.award_date ?? '').localeCompare(right.award_date ?? '');
    return direction === 'asc' ? result : -result;
  });
}

export function paginateExplorerRows(rows: RecordExcerpt[], page: number, pageSize = EXPLORER_PAGE_SIZE) {
  return rows.slice((page - 1) * pageSize, page * pageSize);
}

export function explorerCsv(rows: RecordExcerpt[], language: 'es' | 'gl') {
  const header = language === 'gl'
    ? ['data', 'expediente', 'asunto', 'unidade', 'adxudicatario', 'tipo', 'importe_eur', 'licitadores', 'ano_fonte']
    : ['fecha', 'expediente', 'asunto', 'unidad', 'adjudicatario', 'tipo', 'importe_eur', 'licitadores', 'ano_fuente'];
  const values = rows.map((row) => [row.award_date ?? '', row.expediente_raw ?? '', row.subject_raw, row.unit_name, row.vendor_name, row.type_normalized, row.importe_eur, row.licitadores_raw ?? '', row.source_year]);
  return `\uFEFF${[header, ...values].map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\r\n')}`;
}
