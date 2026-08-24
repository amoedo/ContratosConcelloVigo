import { useEffect, useState } from 'react';

import { DeferredChart } from '@/components/charts/DeferredChart';
import { withBase, withDataPath } from '@/lib/base';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';
import { fetchJson } from '@/lib/http';
import { useLanguage, withLanguage } from '@/lib/i18n';
import { localizedAlertSummary, ruleName, severityLabel } from '@/lib/rules';
import { EMPTY_DASHBOARD, type DashboardData, type MetaData, type SummaryKpis } from '@/lib/types';

interface Props { initial: DashboardData; meta: MetaData }

const COPY = {
  es: {
    eyebrow: 'Radiografía del año', title: 'Entender la contratación menor de Vigo, sin perderse en los datos',
    intro: 'Una lectura pública y verificable de qué se contrata, quién recibe adjudicaciones y dónde conviene mirar con más detalle.',
    all: 'Serie completa', partial: 'Datos parciales del año en curso', contracts: 'Adjudicaciones', amount: 'Importe total',
    median: 'Importe mediano', vendors: 'Adjudicatarios', bidders: 'Con un licitador', known: 'Con dato de competencia',
    questions: 'Empieza por una pregunta', pulse: 'Evolución mensual', types: 'Qué tipo de contratos se publican',
    findings: 'Señales que conviene revisar', rankings: 'Quién y qué unidades concentran más importe', quality: 'Qué sabemos del dato',
    vendorsTitle: 'Adjudicatarios', unitsTitle: 'Unidades', more: 'Ver análisis completo', evidence: 'Comprobar evidencia', previous: 'vs. año anterior', chartData: 'Ver datos de la gráfica', month: 'Mes', categories: 'categorías', confidence: 'confianza', outYear: 'Fechas fuera del año', missing: 'Competencia sin dato', synthetic: 'Expedientes sintéticos', allRanking: 'Ver todos', metricDefinition: 'Las métricas parten de las filas publicadas por el Concello de Vigo.', year: 'Año',
  },
  gl: {
    eyebrow: 'Radiografía do ano', title: 'Entender a contratación menor de Vigo, sen perderse nos datos',
    intro: 'Unha lectura pública e verificable de que se contrata, quen recibe adxudicacións e onde convén mirar con máis detalle.',
    all: 'Serie completa', partial: 'Datos parciais do ano en curso', contracts: 'Adxudicacións', amount: 'Importe total',
    median: 'Importe mediano', vendors: 'Adxudicatarios', bidders: 'Cun licitador', known: 'Con dato de competencia',
    questions: 'Comeza por unha pregunta', pulse: 'Evolución mensual', types: 'Que tipo de contratos se publican',
    findings: 'Sinais que convén revisar', rankings: 'Quen e que unidades concentran máis importe', quality: 'Que sabemos do dato',
    vendorsTitle: 'Adxudicatarios', unitsTitle: 'Unidades', more: 'Ver análise completa', evidence: 'Comprobar evidencia', previous: 'vs. ano anterior', chartData: 'Ver datos da gráfica', month: 'Mes', categories: 'categorías', confidence: 'confianza', outYear: 'Datas fóra do ano', missing: 'Competencia sen dato', synthetic: 'Expedientes sintéticos', allRanking: 'Ver todos', metricDefinition: 'As métricas parten das filas publicadas polo Concello de Vigo.', year: 'Ano',
  },
} as const;

function delta(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function Metric({ label, value, change, previous }: { label: string; value: string; change: number | null; previous: string }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong>{change != null && <small className={change >= 0 ? 'delta-up' : 'delta-down'}>{change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% {previous}</small>}</article>;
}

export function CivicDashboard({ initial, meta }: Props) {
  const language = useLanguage();
  const copy = COPY[language];
  const latest = meta.available_years.at(-1);
  const [year, setYear] = useState('all');
  const [data, setData] = useState(initial);
  const [previous, setPrevious] = useState<SummaryKpis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!latest) return;
    let cancelled = false;
    setLoading(true);
    const selected = year === 'all' ? 'all' : year;
    const priorYear = year === 'all' ? null : Number(year) - 1;
    Promise.all([
      fetchJson<DashboardData>(withDataPath(`/derived/dashboard/${selected}.json`), initial),
      priorYear && meta.available_years.includes(priorYear)
        ? fetchJson<DashboardData>(withDataPath(`/derived/dashboard/${priorYear}.json`), EMPTY_DASHBOARD)
        : Promise.resolve(null),
    ]).then(([next, prior]) => {
      if (cancelled) return;
      setData(next);
      setPrevious(prior?.summary ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [initial, latest, meta.available_years, year]);

  const monthlyOption = {
    tooltip: { trigger: 'axis' }, grid: { left: 12, right: 18, bottom: 12, containLabel: true },
    xAxis: { type: 'category', data: data.series.monthly.map((item) => item.key.slice(5)) },
    yAxis: [{ type: 'value', name: copy.contracts }, { type: 'value', name: '€', splitLine: { show: false } }],
    series: [
      { type: 'line', smooth: true, data: data.series.monthly.map((item) => item.count), name: copy.contracts, itemStyle: { color: '#0b6573' }, areaStyle: { color: 'rgba(11,101,115,.12)' } },
      { type: 'bar', yAxisIndex: 1, data: data.series.monthly.map((item) => item.amount), name: copy.amount, itemStyle: { color: '#dc7137' } },
    ],
  };
  const typesOption = { tooltip: { trigger: 'item' }, series: [{ type: 'pie', radius: ['48%', '72%'], label: { formatter: '{b}\n{d}%' }, data: data.types.map((item) => ({ name: item.type, value: item.count })) }] };
  const guided = language === 'gl' ? [
    ['Quen recibe máis?', '/adjudicatarios'], ['Que unidades teñen menos competencia?', '/competencia'],
    ['Contratos preto do limiar', '/explorador?quality=near-threshold'], ['Buscar unha empresa ou asunto', '/explorador'],
  ] : [
    ['¿Quién recibe más?', '/adjudicatarios'], ['¿Qué unidades tienen menos competencia?', '/competencia'],
    ['Contratos cerca del umbral', '/explorador?quality=near-threshold'], ['Buscar una empresa o asunto', '/explorador'],
  ];

  return <>
    <section className="civic-hero panel">
      <div>
        <div className="kicker">{copy.eyebrow}</div>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
      </div>
      <label className="year-control"><span>{copy.year}</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">{copy.all}</option>{meta.available_years.slice().reverse().map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      {year !== 'all' && meta.partial_years.includes(Number(year)) && <div className="partial-notice">{copy.partial}</div>}
    </section>

    <section className={`grid metrics home-metrics ${loading ? 'is-loading' : ''}`} aria-live="polite">
      <Metric label={copy.contracts} value={formatNumber(data.summary.contract_count)} change={delta(data.summary.contract_count, previous?.contract_count ?? null)} previous={copy.previous} />
      <Metric label={copy.amount} value={formatCurrency(data.summary.total_amount)} change={delta(data.summary.total_amount, previous?.total_amount ?? null)} previous={copy.previous} />
      <Metric label={copy.median} value={formatCurrency(data.summary.median_amount)} change={delta(data.summary.median_amount, previous?.median_amount ?? null)} previous={copy.previous} />
      <Metric label={copy.vendors} value={formatNumber(data.summary.unique_vendors)} change={delta(data.summary.unique_vendors, previous?.unique_vendors ?? null)} previous={copy.previous} />
      <Metric label={copy.bidders} value={formatPercent(data.summary.single_bidder_pct)} change={delta(data.summary.single_bidder_pct, previous?.single_bidder_pct ?? null)} previous={copy.previous} />
      <Metric label={copy.known} value={formatNumber(data.summary.known_competition_count)} change={delta(data.summary.known_competition_count, previous?.known_competition_count ?? null)} previous={copy.previous} />
    </section>

    <section className="guided-section panel"><div><span className="kicker">{copy.questions}</span><h2>{copy.questions}</h2></div><div className="guided-links">{guided.map(([label, href]) => <a href={withLanguage(withBase(href), language)} key={label}>{label}<span>→</span></a>)}</div></section>

    <section className="two-col home-analysis">
      <article className="chart-card panel"><h2 className="card-title">{copy.pulse}</h2><DeferredChart option={monthlyOption} height={320} description={`${copy.pulse}. ${data.series.monthly.length}.`} /><details className="chart-data"><summary>{copy.chartData}</summary><table className="data-table"><thead><tr><th>{copy.month}</th><th>{copy.contracts}</th><th>{copy.amount}</th></tr></thead><tbody>{data.series.monthly.map((item) => <tr key={item.key}><td>{item.key}</td><td>{formatNumber(item.count)}</td><td>{formatCurrency(item.amount)}</td></tr>)}</tbody></table></details></article>
      <article className="chart-card panel"><h2 className="card-title">{copy.types}</h2><DeferredChart option={typesOption} height={320} description={`${copy.types}. ${data.types.length} ${copy.categories}.`} /><details className="chart-data"><summary>{copy.chartData}</summary><table className="data-table"><tbody>{data.types.map((item) => <tr key={item.type}><td>{item.type}</td><td>{formatNumber(item.count)}</td></tr>)}</tbody></table></details></article>
    </section>

    <section className="home-findings panel"><div className="section-heading"><div><span className="kicker">{copy.findings}</span><h2>{copy.findings}</h2></div><a href={withLanguage(withBase('/patrones'), language)}>{copy.more} →</a></div><div className="finding-grid">{data.alerts.slice(0, 4).map((alert) => <article key={alert.alert_id}><div className="badge-row"><span className="badge">{severityLabel(alert.severity, language)}</span><span className="badge">{Math.round((alert.confidence ?? .7) * 100)}% {copy.confidence}</span></div><h3>{ruleName(alert.kind, language)}</h3><p>{localizedAlertSummary(alert, language)}</p><a href={withLanguage(`${withBase('/explorador')}?${new URLSearchParams(alert.filters)}`, language)}>{copy.evidence} →</a></article>)}</div></section>

    <section className="home-rankings"><div className="section-heading"><div><span className="kicker">{copy.rankings}</span><h2>{copy.rankings}</h2></div></div><div className="two-col"><CompactRanking title={copy.vendorsTitle} items={data.top_vendors.slice(0, 5)} path="/adjudicatarios" language={language} /><CompactRanking title={copy.unitsTitle} items={data.top_units.slice(0, 5)} path="/unidades" language={language} /></div></section>

    <section className="quality-panel panel"><div><span className="kicker">{copy.quality}</span><h2>{copy.quality}</h2><p>{language === 'es' ? (meta.metric_definitions?.contract_count ?? copy.metricDefinition) : copy.metricDefinition}</p></div><dl><div><dt>{copy.outYear}</dt><dd>{formatNumber(meta.quality.out_of_year_rows ?? 0)}</dd></div><div><dt>{copy.missing}</dt><dd>{formatNumber(meta.quality.missing_competition ?? 0)}</dd></div><div><dt>{copy.synthetic}</dt><dd>{formatNumber(meta.quality.synthetic_expediente ?? 0)}</dd></div></dl><a className="pill-link" href={withLanguage(withBase('/metodologia'), language)}>{copy.more}</a></section>
  </>;
}

function CompactRanking({ title, items, path, language }: { title: string; items: DashboardData['top_vendors']; path: string; language: 'es' | 'gl' }) {
  return <article className="compact-ranking panel"><div className="section-heading"><h3>{title}</h3><a href={withLanguage(withBase(path), language)}>{COPY[language].allRanking} →</a></div><ol>{items.map((item, index) => <li key={item.id}><span>{index + 1}</span><a href={withLanguage(withBase(`${path}/${item.id}`), language)}>{item.name}</a><strong>{formatCurrency(item.total_amount)}</strong></li>)}</ol></article>;
}
