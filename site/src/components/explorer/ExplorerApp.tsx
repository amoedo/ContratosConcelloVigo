import { useEffect, useMemo, useState } from 'react';

import { withBase, withDataPath } from '@/lib/base';
import { defaultFilters, readFilters, type FilterState } from '@/lib/filters';
import { EXPLORER_PAGE_SIZE, explorerCsv, filterExplorerRows, paginateExplorerRows, sortExplorerRows } from '@/lib/explorer';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { fetchJson } from '@/lib/http';
import { useLanguage, withLanguage } from '@/lib/i18n';
import { ruleName } from '@/lib/rules';
import { EMPTY_META, createEmptyExplorerYear, type EntityIndexItem, type ExplorerYearPayload, type MetaData, type RecordExcerpt } from '@/lib/types';

const HIDDEN_CHIPS = new Set(['sort', 'direction', 'page', 'lang']);

const COPY = {
  es: { title: 'Explorador de contratos', intro: 'Busca, ordena y verifica las filas publicadas sin cargar miles de registros en pantalla.', kicker: 'Datos verificables', filters: 'Filtros', results: 'resultados', export: 'Exportar CSV', clear: 'Limpiar', allYears: 'Todos los años', year: 'Año', text: 'Texto', textPlaceholder: 'Asunto, empresa, unidad…', subject: 'Asunto', unit: 'Unidad', vendor: 'Adjudicatario', type: 'Tipo', all: 'Todos', competition: 'Competencia', from: 'Desde', to: 'Hasta', min: 'Importe mínimo', max: 'Importe máximo', quality: 'Calidad', alert: 'Señal', sort: 'Ordenar', direction: 'Dirección', descending: 'Descendente', ascending: 'Ascendente', amount: 'Importe', bidders: 'Licitadores', date: 'Fecha', expediente: 'Expediente', details: 'Ver detalle', previous: 'Anterior', next: 'Siguiente', page: 'Página', compare: 'Comparar entidades', source: 'Abrir fuente oficial', noResults: 'No hay resultados para estos filtros.', loading: 'Cargando…', allF: 'Todas', near: 'Cerca del umbral', missing: 'Competencia sin dato', outYear: 'Fecha fuera del año', synthetic: 'Expediente sintético', awards: 'adjudicaciones', vendors: 'Adjudicatarios', units: 'Unidades', first: 'Primera entidad', second: 'Segunda entidad', close: 'Cerrar', noData: 'Sin dato', signals: 'Señales asociadas', cautions: 'Cautelas del dato' },
  gl: { title: 'Explorador de contratos', intro: 'Busca, ordena e verifica as filas publicadas sen cargar miles de rexistros en pantalla.', kicker: 'Datos verificables', filters: 'Filtros', results: 'resultados', export: 'Exportar CSV', clear: 'Limpar', allYears: 'Todos os anos', year: 'Ano', text: 'Texto', textPlaceholder: 'Asunto, empresa, unidade…', subject: 'Asunto', unit: 'Unidade', vendor: 'Adxudicatario', type: 'Tipo', all: 'Todos', competition: 'Competencia', from: 'Desde', to: 'Ata', min: 'Importe mínimo', max: 'Importe máximo', quality: 'Calidade', alert: 'Sinal', sort: 'Ordenar', direction: 'Dirección', descending: 'Descendente', ascending: 'Ascendente', amount: 'Importe', bidders: 'Licitadores', date: 'Data', expediente: 'Expediente', details: 'Ver detalle', previous: 'Anterior', next: 'Seguinte', page: 'Páxina', compare: 'Comparar entidades', source: 'Abrir fonte oficial', noResults: 'Non hai resultados para estes filtros.', loading: 'Cargando…', allF: 'Todas', near: 'Preto do limiar', missing: 'Competencia sen dato', outYear: 'Data fóra do ano', synthetic: 'Expediente sintético', awards: 'adxudicacións', vendors: 'Adxudicatarios', units: 'Unidades', first: 'Primeira entidade', second: 'Segunda entidade', close: 'Pechar', noData: 'Sen dato', signals: 'Sinais asociados', cautions: 'Cautelas do dato' },
} as const;

function buildSearch(filters: FilterState) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    const defaultValue = defaultFilters[key as keyof FilterState];
    if (value && value !== defaultValue) params.set(key, value);
  });
  return params.toString() ? `?${params}` : '';
}

export function ExplorerApp() {
  const language = useLanguage();
  const copy = COPY[language];
  const [meta, setMeta] = useState<MetaData>(EMPTY_META);
  const [rows, setRows] = useState<RecordExcerpt[]>([]);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RecordExcerpt | null>(null);
  const [vendors, setVendors] = useState<EntityIndexItem[]>([]);
  const [units, setUnits] = useState<EntityIndexItem[]>([]);
  const [vendorText, setVendorText] = useState('');
  const [unitText, setUnitText] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchJson(withDataPath('/derived/meta.json'), EMPTY_META),
      fetchJson<EntityIndexItem[]>(withDataPath('/derived/entities/vendors/index.json'), []),
      fetchJson<EntityIndexItem[]>(withDataPath('/derived/entities/units/index.json'), []),
    ]).then(([nextMeta, nextVendors, nextUnits]) => {
      if (cancelled) return;
      const fromUrl = readFilters(window.location.search);
      const latest = nextMeta.available_years.at(-1);
      if (!fromUrl.year && latest) fromUrl.year = String(latest);
      if (!fromUrl.lang && language === 'gl') fromUrl.lang = 'gl';
      setMeta(nextMeta); setVendors(nextVendors); setUnits(nextUnits); setFilters(fromUrl);
      setVendorText(nextVendors.find((item) => item.id === fromUrl.vendor)?.name ?? '');
      setUnitText(nextUnits.find((item) => item.id === fromUrl.unit)?.name ?? '');
      window.history.replaceState(null, '', `${window.location.pathname}${buildSearch(fromUrl)}`);
    });
    return () => { cancelled = true; };
  }, [language]);

  useEffect(() => {
    if (!meta.available_years.length || !filters.year) return;
    let cancelled = false;
    setLoading(true);
    const years = filters.year === 'all' ? meta.available_years : [Number(filters.year)];
    Promise.all(years.map((year) => fetchJson<ExplorerYearPayload>(withDataPath(`/derived/explorer/${year}.json`), createEmptyExplorerYear(year))))
      .then((payloads) => { if (!cancelled) { setRows(payloads.flatMap((payload) => payload.records)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [filters.year, meta.available_years]);

  const update = (key: keyof FilterState, value: string) => {
    setFilters((current) => {
      const next = { ...current, [key]: value, page: key === 'page' ? value : '1' };
      window.history.replaceState(null, '', `${window.location.pathname}${buildSearch(next)}`);
      return next;
    });
  };

  const filtered = useMemo(() => filterExplorerRows(rows, filters), [filters, rows]);

  const sorted = useMemo(() => sortExplorerRows(filtered, filters.sort, filters.direction), [filtered, filters.direction, filters.sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / EXPLORER_PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number(filters.page) || 1));
  const visible = paginateExplorerRows(sorted, page);
  const chips = Object.entries(filters).filter(([key, value]) => value && value !== defaultFilters[key as keyof FilterState] && !HIDDEN_CHIPS.has(key));

  const exportCsv = () => {
    const blob = new Blob([explorerCsv(sorted, language)], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `contratos-vigo-${filters.year}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  const clear = () => {
    const next = { ...defaultFilters, year: String(meta.available_years.at(-1) ?? ''), lang: language === 'gl' ? 'gl' : '' };
    setFilters(next); setVendorText(''); setUnitText(''); window.history.replaceState(null, '', `${window.location.pathname}${buildSearch(next)}`);
  };

  return <section className="explorer-shell">
    <header className="explorer-heading"><div><span className="kicker">{copy.kicker}</span><h1>{copy.title}</h1><p>{copy.intro}</p></div><button className="pill-link pill-link--accent" onClick={exportCsv} disabled={!sorted.length}>{copy.export}</button></header>

    <details className="explorer-filters panel" open><summary>{copy.filters}<span>{chips.length}</span></summary><div className="advanced-filter-grid">
      <label><span>{copy.year}</span><select value={filters.year} onChange={(e) => update('year', e.target.value)}><option value="all">{copy.allYears}</option>{meta.available_years.slice().reverse().map((year) => <option key={year}>{year}</option>)}</select></label>
      <label className="wide"><span>{copy.text}</span><input value={filters.q} onChange={(e) => update('q', e.target.value)} placeholder={copy.textPlaceholder} /></label>
      <label><span>{copy.vendor}</span><input list="vendor-options" value={vendorText} onChange={(e) => { const value = e.target.value; setVendorText(value); update('vendor', vendors.find((item) => item.name === value)?.id ?? ''); }} /><datalist id="vendor-options">{vendors.map((item) => <option value={item.name} key={item.id} />)}</datalist></label>
      <label><span>{copy.unit}</span><input list="unit-options" value={unitText} onChange={(e) => { const value = e.target.value; setUnitText(value); update('unit', units.find((item) => item.name === value)?.id ?? ''); }} /><datalist id="unit-options">{units.map((item) => <option value={item.name} key={item.id} />)}</datalist></label>
      <label><span>{copy.type}</span><select value={filters.type} onChange={(e) => update('type', e.target.value)}><option value="">{copy.all}</option>{meta.filters.types.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>{copy.competition}</span><select value={filters.competition} onChange={(e) => update('competition', e.target.value)}><option value="">{copy.allF}</option>{meta.filters.competition.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>{copy.from}</span><input type="date" value={filters.date_from} onChange={(e) => update('date_from', e.target.value)} /></label>
      <label><span>{copy.to}</span><input type="date" value={filters.date_to} onChange={(e) => update('date_to', e.target.value)} /></label>
      <label><span>{copy.min}</span><input type="number" min="0" value={filters.min_amount} onChange={(e) => update('min_amount', e.target.value)} /></label>
      <label><span>{copy.max}</span><input type="number" min="0" value={filters.max_amount} onChange={(e) => update('max_amount', e.target.value)} /></label>
      <label><span>{copy.expediente}</span><input value={filters.expediente} onChange={(e) => update('expediente', e.target.value)} /></label>
      <label><span>{copy.quality}</span><select value={filters.quality} onChange={(e) => update('quality', e.target.value)}><option value="">{copy.allF}</option><option value="near-threshold">{copy.near}</option><option value="missing-competition">{copy.missing}</option><option value="out-of-year-award-date">{copy.outYear}</option><option value="synthetic-expediente">{copy.synthetic}</option></select></label>
      <label><span>{copy.alert}</span><select value={filters.alert} onChange={(e) => update('alert', e.target.value)}><option value="">{copy.allF}</option>{['fragmentation-pattern', 'unit-concentration', 'low-competition', 'near-threshold-group', 'vendor-growth', 'topic-growth', 'repeated-amounts'].map((kind) => <option value={kind} key={kind}>{ruleName(kind, language)}</option>)}</select></label>
      <label><span>{copy.sort}</span><select value={filters.sort} onChange={(e) => update('sort', e.target.value)}><option value="date">{copy.date}</option><option value="amount">{copy.amount}</option><option value="vendor">{copy.vendor}</option><option value="unit">{copy.unit}</option><option value="bidders">{copy.bidders}</option></select></label>
      <label><span>{copy.direction}</span><select value={filters.direction} onChange={(e) => update('direction', e.target.value)}><option value="desc">{copy.descending}</option><option value="asc">{copy.ascending}</option></select></label>
    </div><div className="filter-footer"><div className="filter-chips">{chips.map(([key, value]) => <button key={key} onClick={() => { update(key as keyof FilterState, ''); if (key === 'vendor') setVendorText(''); if (key === 'unit') setUnitText(''); }}>{key}: {value} ×</button>)}</div><button className="text-button" onClick={clear}>{copy.clear}</button></div></details>

    <ComparisonPanel vendors={vendors} units={units} title={copy.compare} language={language} />

    <div className="results-toolbar"><strong>{loading ? copy.loading : `${formatNumber(sorted.length)} ${copy.results}`}</strong><span>{copy.page} {page} / {totalPages}</span></div>
    {!loading && !visible.length ? <div className="empty-state">{copy.noResults}</div> : <>
      <div className="explorer-table panel"><table className="data-table"><thead><tr><th>{copy.date}</th><th>{copy.subject}</th><th>{copy.unit}</th><th>{copy.vendor}</th><th>{copy.amount}</th><th>{copy.bidders}</th><th /></tr></thead><tbody>{visible.map((row) => <tr key={row.record_id}><td>{formatDate(row.award_date)}</td><td>{row.subject_raw}</td><td><a href={withLanguage(withBase(`/unidades/${row.unit_id}`), language)}>{row.unit_name}</a></td><td><a href={withLanguage(withBase(`/adjudicatarios/${row.vendor_id}`), language)}>{row.vendor_name}</a></td><td>{formatCurrency(row.importe_eur)}</td><td>{row.licitadores_raw ?? '—'}</td><td><button className="text-button" onClick={() => setSelected(row)}>{copy.details}</button></td></tr>)}</tbody></table></div>
      <div className="record-cards">{visible.map((row) => <article className="panel" key={row.record_id}><span>{formatDate(row.award_date)} · {row.type_normalized}</span><h2>{row.subject_raw}</h2><p>{row.vendor_name}<br />{row.unit_name}</p><strong>{formatCurrency(row.importe_eur)}</strong><button className="text-button" onClick={() => setSelected(row)}>{copy.details} →</button></article>)}</div>
      <nav className="pagination" aria-label="Paginación"><button disabled={page <= 1} onClick={() => update('page', String(page - 1))}>{copy.previous}</button><span>{copy.page} {page} / {totalPages}</span><button disabled={page >= totalPages} onClick={() => update('page', String(page + 1))}>{copy.next}</button></nav>
    </>}
    {selected && <RecordDrawer record={selected} close={() => setSelected(null)} language={language} sourceLabel={copy.source} />}
  </section>;
}

function ComparisonPanel({ vendors, units, title, language }: { vendors: EntityIndexItem[]; units: EntityIndexItem[]; title: string; language: 'es' | 'gl' }) {
  const [kind, setKind] = useState<'vendor' | 'unit'>('vendor'); const [left, setLeft] = useState(''); const [right, setRight] = useState('');
  const items = kind === 'vendor' ? vendors : units; const first = items.find((item) => item.id === left); const second = items.find((item) => item.id === right);
  const copy = COPY[language];
  return <details className="comparison panel"><summary>{title}</summary><div className="comparison-controls"><select value={kind} onChange={(e) => { setKind(e.target.value as 'vendor' | 'unit'); setLeft(''); setRight(''); }}><option value="vendor">{copy.vendors}</option><option value="unit">{copy.units}</option></select><select value={left} onChange={(e) => setLeft(e.target.value)}><option value="">{copy.first}</option>{items.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select value={right} onChange={(e) => setRight(e.target.value)}><option value="">{copy.second}</option>{items.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>{first && second && <div className="comparison-grid">{[first, second].map((item) => <article key={item.id}><h3>{item.name}</h3><strong>{formatCurrency(item.total_amount ?? 0)}</strong><p>{formatNumber(item.contract_count ?? 0)} {copy.awards} · {(item.years ?? []).join(', ')}</p></article>)}</div>}</details>;
}

function RecordDrawer({ record, close, language, sourceLabel }: { record: RecordExcerpt; close: () => void; language: 'es' | 'gl'; sourceLabel: string }) {
  const copy = COPY[language];
  return <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) close(); }}><aside className="record-drawer" role="dialog" aria-modal="true" aria-labelledby="record-title"><button className="drawer-close" onClick={close} aria-label={copy.close}>×</button><span className="kicker">{record.expediente_raw ?? record.expediente_key}</span><h2 id="record-title">{record.subject_raw}</h2><dl><div><dt>{copy.date}</dt><dd>{formatDate(record.award_date)}</dd></div><div><dt>{copy.amount}</dt><dd>{formatCurrency(record.importe_eur)}</dd></div><div><dt>{copy.bidders}</dt><dd>{record.licitadores_raw ?? copy.noData}</dd></div><div><dt>{copy.type}</dt><dd>{record.type_normalized}</dd></div><div><dt>{copy.unit}</dt><dd><a href={withLanguage(withBase(`/unidades/${record.unit_id}`), language)}>{record.unit_name}</a></dd></div><div><dt>{copy.vendor}</dt><dd><a href={withLanguage(withBase(`/adjudicatarios/${record.vendor_id}`), language)}>{record.vendor_name}</a></dd></div></dl>{record.alert_flags.length > 0 && <div><h3>{copy.signals}</h3><div className="badge-row">{record.alert_flags.map((flag) => <span className="badge" key={flag}>{ruleName(flag, language)}</span>)}</div></div>}{record.data_quality_flags.length > 0 && <div><h3>{copy.cautions}</h3><div className="badge-row">{record.data_quality_flags.map((flag) => <span className="badge" key={flag}>{flag}</span>)}</div></div>}{record.source_url && <a className="pill-link pill-link--accent" href={record.source_url} target="_blank" rel="noreferrer">{sourceLabel} ↗</a>}</aside></div>;
}
