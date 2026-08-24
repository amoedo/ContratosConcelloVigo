export type Severity = 'alta' | 'media' | 'baixa';

export interface AlertItem {
  alert_id: string;
  kind: string;
  severity: Severity;
  sort_date?: string | null;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  filters: Record<string, string>;
  related_record_ids: string[];
  family_id?: string;
  confidence?: number;
  priority?: number;
  rule_version?: string;
  rule_parameters?: Record<string, unknown>;
  affected_count?: number;
  known_data_denominator?: number | null;
  evidence_totals?: Record<string, unknown>;
  observed_from?: string | null;
  observed_to?: string | null;
  is_partial_comparison?: boolean;
  caveats?: string[];
}

export interface MetaData {
  dataset: string;
  last_refreshed: string | null;
  available_years: number[];
  partial_years: number[];
  row_count: number;
  entity_counts: { vendors: number; units: number };
  quality: Record<string, number>;
  filters: {
    types: string[];
    competition: string[];
    amounts: string[];
    topics: Array<{ id: string; label: string }>;
  };
  alert_count: number;
  source_name?: string;
  source_url?: string;
  source_dataset_template?: string;
  refresh_status?: string;
  partial_year_explanation?: string;
  coverage?: { dataset_start_year: number | null; dataset_end_year: number | null; award_date_from: string | null; award_date_to: string | null };
  metric_definitions?: Record<string, string>;
}

export interface SummaryKpis {
  contract_count: number;
  total_amount: number;
  mean_amount: number;
  median_amount: number;
  unique_vendors: number;
  unique_units: number;
  unique_expedientes: number;
  single_bidder_pct: number | null;
  known_competition_count: number;
}

export interface TimeseriesPoint {
  key: string;
  count: number;
  amount: number;
}

export interface RankedEntity {
  id: string;
  name: string;
  total_amount: number;
  contract_count: number;
  mean_amount: number;
  median_amount: number;
  first_year?: number;
  last_year?: number;
  counterparty_count?: number;
  topics?: Array<{ label: string; count: number }>;
}

export interface RecordExcerpt {
  record_id: string;
  award_date: string | null;
  source_year: number;
  expediente_key: string;
  expediente_raw: string | null;
  unit_id: string;
  unit_name: string;
  vendor_id: string;
  vendor_name: string;
  type_normalized: string;
  subject_raw: string;
  importe_eur: number;
  licitadores_raw: number | null;
  competition_bucket: string;
  amount_bucket: string;
  primary_topic_id: string;
  primary_topic_label: string;
  alert_flags: string[];
  data_quality_flags: string[];
  near_threshold: boolean;
  unit_raw?: string;
  vendor_raw?: string;
  type_raw?: string | null;
  subject_clean?: string;
  topic_ids?: string[];
  search_terms?: Array<{ term: string; weight: number }>;
  legal_threshold_eur?: number;
  source_url?: string;
}

export interface DashboardData {
  summary: SummaryKpis;
  series: { monthly: TimeseriesPoint[]; yearly: TimeseriesPoint[] };
  types: Array<{ type: string; count: number }>;
  top_vendors: RankedEntity[];
  top_units: RankedEntity[];
  latest_records: RecordExcerpt[];
  heatmap: {
    months: Array<{ value: number; label: string }>;
    units: Array<{ id: string; name: string }>;
    cells: Array<{ unit_id: string; unit_name: string; month: number; month_label: string; count: number; amount: number }>;
  };
  alerts: AlertItem[];
}

export interface EntityDetail {
  entity_id: string;
  entity_name: string;
  entity_type: 'vendor' | 'unit';
  totals: SummaryKpis & { years: number[] };
  timeseries: { yearly: TimeseriesPoint[]; monthly: TimeseriesPoint[] };
  top_counterparties: Array<{ id: string; name: string; amount: number; count: number }>;
  competition: {
    average_bidders: number | null;
    distribution: Array<{ bucket: string; count: number }>;
    single_bidder_pct: number | null;
  };
  topics: Array<{ label: string; count: number }>;
  near_threshold_records: RecordExcerpt[];
  pattern_clusters: AlertItem[];
  recent_records: RecordExcerpt[];
  rank?: number;
  share_of_total?: number;
  comparable_peers?: Array<{ id: string; name: string; total_amount: number; contract_count: number }>;
}

export interface ExplorerYearPayload {
  year: number;
  records: RecordExcerpt[];
}

export interface EntityIndexItem {
  id: string;
  name: string;
  aliases?: string[];
  total_amount?: number;
  contract_count?: number;
  years?: number[];
}

export interface VendorsPageData {
  ranking_by_amount: RankedEntity[];
  ranking_by_count: RankedEntity[];
  concentration: { top1_share: number; top5_share: number; top10_share: number };
  new_by_year: Array<{ year: number; count: number }>;
  recurring: RankedEntity[];
  highlights: AlertItem[];
}

export interface UnitsPageData {
  ranking_by_amount: RankedEntity[];
  ranking_by_count: RankedEntity[];
  high_spend_vs_fragmentation: Array<{ id: string; name: string; total_amount: number; contract_count: number; mean_amount: number }>;
  highlights: AlertItem[];
}

export interface CompetitionPageData {
  distribution: Array<{ bucket: string; count: number }>;
  average_amount_by_bucket: Array<{ bucket: string; mean_amount: number }>;
  by_unit: Array<{ unit_id: string; unit_name: string; known_contracts: number; single_bidder_pct: number; average_bidders: number | null }>;
  timeline: TimeseriesPoint[];
}

export interface AmountsPageData {
  summary: { min: number; max: number; p10: number; p25: number; p50: number; p75: number; p90: number; p95: number };
  buckets: Array<{ bucket: string; count: number }>;
  top_contracts: RecordExcerpt[];
  lowest_contracts: RecordExcerpt[];
  near_threshold_records: RecordExcerpt[];
}

export interface TopicsPageData {
  ranking: Array<{ topic_id: string; label: string; total_amount: number; contract_count: number }>;
  yearly: Array<{ year: number; topic_id: string; label: string; amount: number; count: number }>;
  clusters: Array<{ label: string; count: number }>;
  top_terms: Array<{ term: string; count?: number; weight?: number }>;
}

export interface TimelinePageData {
  monthly: TimeseriesPoint[];
  yearly: TimeseriesPoint[];
  anomalies: TimeseriesPoint[];
}

export interface PatternsPageData {
  alerts: AlertItem[];
  fragmentation: AlertItem[];
  repeated_amounts: AlertItem[];
  near_threshold_groups: AlertItem[];
  counts: { rule_types: number; grouped_cases: number; individual_signals: number };
}

export const EMPTY_META: MetaData = {
  dataset: 'contratos-menores-vigo',
  last_refreshed: null,
  available_years: [],
  partial_years: [],
  row_count: 0,
  entity_counts: { vendors: 0, units: 0 },
  quality: {},
  filters: { types: [], competition: ['1', '2', '3', '4+', 'desconocido'], amounts: [], topics: [] },
  alert_count: 0,
};

export const EMPTY_SUMMARY_KPIS: SummaryKpis = {
  contract_count: 0,
  total_amount: 0,
  mean_amount: 0,
  median_amount: 0,
  unique_vendors: 0,
  unique_units: 0,
  unique_expedientes: 0,
  single_bidder_pct: null,
  known_competition_count: 0,
};

export const EMPTY_DASHBOARD: DashboardData = {
  summary: EMPTY_SUMMARY_KPIS,
  series: { monthly: [], yearly: [] },
  types: [],
  top_vendors: [],
  top_units: [],
  latest_records: [],
  heatmap: { months: [], units: [], cells: [] },
  alerts: [],
};

export const EMPTY_VENDORS_PAGE: VendorsPageData = {
  ranking_by_amount: [],
  ranking_by_count: [],
  concentration: { top1_share: 0, top5_share: 0, top10_share: 0 },
  new_by_year: [],
  recurring: [],
  highlights: [],
};

export const EMPTY_UNITS_PAGE: UnitsPageData = {
  ranking_by_amount: [],
  ranking_by_count: [],
  high_spend_vs_fragmentation: [],
  highlights: [],
};

export const EMPTY_COMPETITION_PAGE: CompetitionPageData = {
  distribution: [],
  average_amount_by_bucket: [],
  by_unit: [],
  timeline: [],
};

export const EMPTY_AMOUNTS_PAGE: AmountsPageData = {
  summary: { min: 0, max: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 },
  buckets: [],
  top_contracts: [],
  lowest_contracts: [],
  near_threshold_records: [],
};

export const EMPTY_TOPICS_PAGE: TopicsPageData = {
  ranking: [],
  yearly: [],
  clusters: [],
  top_terms: [],
};

export const EMPTY_TIMELINE_PAGE: TimelinePageData = {
  monthly: [],
  yearly: [],
  anomalies: [],
};

export const EMPTY_PATTERNS_PAGE: PatternsPageData = {
  alerts: [],
  fragmentation: [],
  repeated_amounts: [],
  near_threshold_groups: [],
  counts: { rule_types: 0, grouped_cases: 0, individual_signals: 0 },
};

export function createEmptyEntityDetail(entityId: string, entityType: 'vendor' | 'unit', entityName: string): EntityDetail {
  return {
    entity_id: entityId,
    entity_name: entityName,
    entity_type: entityType,
    totals: { ...EMPTY_SUMMARY_KPIS, years: [] },
    timeseries: { yearly: [], monthly: [] },
    top_counterparties: [],
    competition: { average_bidders: null, distribution: [], single_bidder_pct: null },
    topics: [],
    near_threshold_records: [],
    pattern_clusters: [],
    recent_records: [],
  };
}

export function createEmptyExplorerYear(year: number): ExplorerYearPayload {
  return { year, records: [] };
}
