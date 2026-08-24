import { useEffect, useState } from 'react';

import { DeferredChart } from '@/components/charts/DeferredChart';
import { withBase, withDataPath } from '@/lib/base';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import { fetchJson } from '@/lib/http';
import { useLanguage, withLanguage } from '@/lib/i18n';
import type { AmountsPageData, CompetitionPageData, MetaData, TimelinePageData, TopicsPageData, UnitsPageData, VendorsPageData } from '@/lib/types';

type Section = 'vendors' | 'units' | 'competition' | 'amounts' | 'topics' | 'timeline';
type SectionData = VendorsPageData | UnitsPageData | CompetitionPageData | AmountsPageData | TopicsPageData | TimelinePageData;

const COPY = {
  es: { titles: { vendors: 'Adjudicatarios', units: 'Unidades municipales', competition: 'Competencia', amounts: 'Distribución de importes', topics: 'Temas y asuntos', timeline: 'Evolución temporal' }, scope: 'Ámbito del análisis', scopeBody: 'Los indicadores y rankings se recalculan para el ejercicio seleccionado.', year: 'Año', all: 'Serie completa', partial: 'parcial', entities: 'Entidades', topAmount: 'Importe del top 10', top: 'Top 10 por importe', ranking: 'Ranking verificable', awards: 'adjudicaciones', bidders: 'Número de licitadores', unitsSingle: 'Unidades con más contratos de un licitador', unit: 'Unidad', known: 'Con dato', single: 'Un licitador', median: 'Mediana', p90: 'Percentil 90', max: 'Máximo', bands: 'Contratos por tramo', largest: 'Mayores importes', view: 'Ver', monthly: 'Serie mensual' },
  gl: { titles: { vendors: 'Adxudicatarios', units: 'Unidades municipais', competition: 'Competencia', amounts: 'Distribución de importes', topics: 'Temas e asuntos', timeline: 'Evolución temporal' }, scope: 'Ámbito da análise', scopeBody: 'Os indicadores e rankings recalcúlanse para o exercicio seleccionado.', year: 'Ano', all: 'Serie completa', partial: 'parcial', entities: 'Entidades', topAmount: 'Importe do top 10', top: 'Top 10 por importe', ranking: 'Ranking verificable', awards: 'adxudicacións', bidders: 'Número de licitadores', unitsSingle: 'Unidades con máis contratos dun licitador', unit: 'Unidade', known: 'Con dato', single: 'Un licitador', median: 'Mediana', p90: 'Percentil 90', max: 'Máximo', bands: 'Contratos por tramo', largest: 'Maiores importes', view: 'Ver', monthly: 'Serie mensual' },
};

export function YearlyAnalysis({ section, initial, meta }: { section: Section; initial: SectionData; meta: MetaData }) {
  const language = useLanguage(); const copy = COPY[language];
  const [year, setYear] = useState('all'); const [data, setData] = useState<SectionData>(initial); const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false; setLoading(true);
    fetchJson<SectionData>(withDataPath(`/derived/${section}/${year}.json`), initial).then((payload) => { if (!cancelled) { setData(payload); setLoading(false); } });
    return () => { cancelled = true; };
  }, [initial, section, year]);
  return <section className={`yearly-analysis ${loading ? 'is-loading' : ''}`}>
    <div className="scope-toolbar panel"><div><span className="kicker">{copy.scope}</span><h2>{copy.titles[section]}</h2><p>{copy.scopeBody}</p></div><label className="year-control"><span>{copy.year}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">{copy.all}</option>{meta.available_years.slice().reverse().map((item) => <option value={item} key={item}>{item}{meta.partial_years.includes(item) ? ` · ${copy.partial}` : ''}</option>)}</select></label></div>
    {section === 'vendors' && <EntityRankings data={data as VendorsPageData} path="/adjudicatarios" language={language} copy={copy} />}
    {section === 'units' && <EntityRankings data={data as UnitsPageData} path="/unidades" language={language} copy={copy} />}
    {section === 'competition' && <CompetitionView data={data as CompetitionPageData} language={language} copy={copy} />}
    {section === 'amounts' && <AmountsView data={data as AmountsPageData} language={language} copy={copy} />}
    {section === 'topics' && <TopicsView data={data as TopicsPageData} language={language} />}
    {section === 'timeline' && <TimelineView data={data as TimelinePageData} copy={copy} />}
  </section>;
}

function EntityRankings({ data, path, language, copy }: { data: VendorsPageData | UnitsPageData; path: string; language: 'es' | 'gl'; copy: typeof COPY.es | typeof COPY.gl }) {
  const ranking = data.ranking_by_amount;
  const option = { tooltip: { trigger: 'axis' }, grid: { left: 10, right: 20, bottom: 10, containLabel: true }, xAxis: { type: 'value' }, yAxis: { type: 'category', inverse: true, data: ranking.slice(0, 10).map((item) => item.name) }, series: [{ type: 'bar', data: ranking.slice(0, 10).map((item) => item.total_amount), itemStyle: { color: '#0b6573' } }] };
  return <><div className="yearly-kpis grid metrics"><article className="stat-card"><span>{copy.entities}</span><strong>{formatNumber(ranking.length)}</strong></article><article className="stat-card"><span>{copy.topAmount}</span><strong>{formatCurrency(ranking.slice(0, 10).reduce((sum, item) => sum + item.total_amount, 0))}</strong></article></div><div className="two-col"><article className="chart-card panel"><h3 className="card-title">{copy.top}</h3><DeferredChart option={option} height={420} description={copy.top} /></article><article className="compact-ranking panel"><h3>{copy.ranking}</h3><ol>{ranking.slice(0, 12).map((item, index) => <li key={item.id}><span>{index + 1}</span><a href={withLanguage(withBase(`${path}/${item.id}`), language)}>{item.name}</a><strong>{formatCurrency(item.total_amount)}</strong></li>)}</ol></article></div></>;
}

function CompetitionView({ data, language, copy }: { data: CompetitionPageData; language: 'es' | 'gl'; copy: typeof COPY.es | typeof COPY.gl }) {
  const option = { tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: data.distribution.map((item) => item.bucket) }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: data.distribution.map((item) => item.count), itemStyle: { color: '#0b6573' } }] };
  return <div className="two-col"><article className="chart-card panel"><h3 className="card-title">{copy.bidders}</h3><DeferredChart option={option} height={360} description={copy.bidders} /></article><article className="table-card panel"><h3 className="card-title">{copy.unitsSingle}</h3><table className="data-table"><thead><tr><th>{copy.unit}</th><th>{copy.known}</th><th>{copy.single}</th></tr></thead><tbody>{data.by_unit.slice(0, 15).map((item) => <tr key={item.unit_id}><td><a href={withLanguage(withBase(`/unidades/${item.unit_id}`), language)}>{item.unit_name}</a></td><td>{formatNumber(item.known_contracts)}</td><td>{formatPercent(item.single_bidder_pct)}</td></tr>)}</tbody></table></article></div>;
}

function AmountsView({ data, language, copy }: { data: AmountsPageData; language: 'es' | 'gl'; copy: typeof COPY.es | typeof COPY.gl }) {
  const option = { tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: data.buckets.map((item) => item.bucket) }, yAxis: { type: 'value' }, series: [{ type: 'bar', data: data.buckets.map((item) => item.count), itemStyle: { color: '#dc7137' } }] };
  return <><div className="yearly-kpis grid metrics"><article className="stat-card"><span>{copy.median}</span><strong>{formatCurrency(data.summary.p50)}</strong></article><article className="stat-card"><span>{copy.p90}</span><strong>{formatCurrency(data.summary.p90)}</strong></article><article className="stat-card"><span>{copy.max}</span><strong>{formatCurrency(data.summary.max)}</strong></article></div><div className="two-col"><article className="chart-card panel"><h3 className="card-title">{copy.bands}</h3><DeferredChart option={option} height={360} description={copy.bands} /></article><article className="table-card panel"><h3 className="card-title">{copy.largest}</h3><table className="data-table"><tbody>{data.top_contracts.slice(0, 12).map((row) => <tr key={row.record_id}><td>{row.subject_raw}</td><td>{formatCurrency(row.importe_eur)}</td><td><a href={withLanguage(`${withBase('/explorador')}?year=${row.source_year}&expediente=${encodeURIComponent(row.expediente_raw ?? '')}`, language)}>{copy.view}</a></td></tr>)}</tbody></table></article></div></>;
}

function TopicsView({ data, language }: { data: TopicsPageData; language: 'es' | 'gl' }) {
  return <div className="topic-grid">{data.ranking.slice(0, 20).map((item) => <a className="topic-card panel" href={withLanguage(`${withBase('/explorador')}?topic=${item.topic_id}`, language)} key={item.topic_id}><span>{formatNumber(item.contract_count)} {COPY[language].awards}</span><h3>{item.label}</h3><strong>{formatCurrency(item.total_amount)}</strong></a>)}</div>;
}

function TimelineView({ data, copy }: { data: TimelinePageData; copy: typeof COPY.es | typeof COPY.gl }) {
  const monthly = { tooltip: { trigger: 'axis' }, grid: { left: 10, right: 20, bottom: 10, containLabel: true }, xAxis: { type: 'category', data: data.monthly.map((item) => item.key) }, yAxis: [{ type: 'value' }, { type: 'value' }], series: [{ type: 'line', smooth: true, data: data.monthly.map((item) => item.count), itemStyle: { color: '#0b6573' } }, { type: 'bar', yAxisIndex: 1, data: data.monthly.map((item) => item.amount), itemStyle: { color: '#dc7137' } }] };
  return <><article className="chart-card panel"><h3 className="card-title">{copy.monthly}</h3><DeferredChart option={monthly} height={420} description={copy.monthly} /></article><div className="anomaly-grid">{data.anomalies.slice(0, 8).map((item) => <article className="stat-card" key={item.key}><span>{item.key}</span><strong>{formatCurrency(item.amount)}</strong><small>{formatNumber(item.count)} {copy.awards}</small></article>)}</div></>;
}
