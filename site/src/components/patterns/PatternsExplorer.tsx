import { useMemo, useState } from 'react';
import { withBase } from '@/lib/base';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { useLanguage, withLanguage } from '@/lib/i18n';
import { localizedAlertSummary, RULES, ruleName, severityLabel } from '@/lib/rules';
import type { AlertItem, PatternsPageData } from '@/lib/types';

const PAGE_SIZE = 20;
const COPY = {
  es: { kicker: 'Casos a revisar', title: 'casos agrupados', intro: 'Agrupamos señales relacionadas para evitar ruido. Una señal orienta la revisión; no demuestra una irregularidad.', rules: 'Tipos de regla activos', cases: 'Casos agrupados', signals: 'Señales individuales', rule: 'Regla', all: 'Todas', priority: 'Prioridad', grouped: 'Señales agrupadas', records: 'Registros enlazados', amount: 'Importe observado', observed: 'Periodo observado', version: 'Versión de regla', why: 'Por qué se generó', parameters: 'Parámetros aplicados', denominator: 'Denominador con dato conocido', partial: 'Comparación con un año parcial: su prioridad y confianza se han reducido.', evidence: 'Comprobar evidencia', previous: 'Anterior', next: 'Siguiente', page: 'Página', confidence: 'confianza' },
  gl: { kicker: 'Casos para revisar', title: 'casos agrupados', intro: 'Agrupamos sinais relacionados para evitar ruído. Un sinal orienta a revisión; non demostra unha irregularidade.', rules: 'Tipos de regra activos', cases: 'Casos agrupados', signals: 'Sinais individuais', rule: 'Regra', all: 'Todas', priority: 'Prioridade', grouped: 'Sinais agrupados', records: 'Rexistros ligados', amount: 'Importe observado', observed: 'Período observado', version: 'Versión da regra', why: 'Por que se xerou', parameters: 'Parámetros aplicados', denominator: 'Denominador con dato coñecido', partial: 'Comparación cun ano parcial: reducíronse a prioridade e a confianza.', evidence: 'Comprobar evidencia', previous: 'Anterior', next: 'Seguinte', page: 'Páxina', confidence: 'confianza' },
} as const;

type GroupedCase = { alert: AlertItem; occurrences: number; records: number };

export function groupAlertsNewestFirst(alerts: AlertItem[]): GroupedCase[] {
  const grouped = new Map<string, GroupedCase>();
  alerts.forEach((alert) => {
    const key = alert.family_id ?? alert.alert_id;
    const current = grouped.get(key);
    if (!current) grouped.set(key, { alert, occurrences: 1, records: alert.affected_count ?? alert.related_record_ids.length });
    else {
      current.occurrences += 1;
      current.records += alert.affected_count ?? alert.related_record_ids.length;
      if ((alert.observed_to ?? '') > (current.alert.observed_to ?? '')) current.alert = alert;
    }
  });
  return [...grouped.values()].sort((left, right) =>
    (right.alert.observed_to ?? '').localeCompare(left.alert.observed_to ?? '') || (right.alert.priority ?? 0) - (left.alert.priority ?? 0));
}

export function PatternsExplorer({ data }: { data: PatternsPageData }) {
  const language = useLanguage(); const copy = COPY[language];
  const [kind, setKind] = useState(''); const [severity, setSeverity] = useState(''); const [page, setPage] = useState(1);
  const allCases = useMemo(() => groupAlertsNewestFirst(data.alerts), [data.alerts]);
  const cases = allCases.filter(({ alert }) => (!kind || alert.kind === kind) && (!severity || alert.severity === severity));
  const pages = Math.max(1, Math.ceil(cases.length / PAGE_SIZE)); const currentPage = Math.min(page, pages);
  const visible = cases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeKinds = RULES.filter((rule) => data.alerts.some((alert) => alert.kind === rule.id));

  return <section className="patterns-workspace">
    <div className="pattern-counts grid metrics">
      <article className="stat-card"><span>{copy.rules}</span><strong>{formatNumber(activeKinds.length)}</strong></article>
      <article className="stat-card"><span>{copy.cases}</span><strong>{formatNumber(allCases.length)}</strong></article>
      <article className="stat-card"><span>{copy.signals}</span><strong>{formatNumber(data.alerts.length)}</strong></article>
    </div>
    <div className="patterns-toolbar panel"><div><span className="kicker">{copy.kicker}</span><h2>{formatNumber(cases.length)} {copy.title}</h2><p>{copy.intro}</p></div><label><span>{copy.rule}</span><select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }}><option value="">{copy.all}</option>{activeKinds.map((rule) => <option value={rule.id} key={rule.id}>{rule.name[language]}</option>)}</select></label><label><span>{copy.priority}</span><select value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }}><option value="">{copy.all}</option><option value="alta">Alta</option><option value="media">Media</option><option value="baixa">{language === 'gl' ? 'Baixa' : 'Baja'}</option></select></label></div>
    <div className="pattern-list">{visible.map(({ alert, occurrences, records }) => <article className="pattern-card panel" key={alert.family_id ?? alert.alert_id}><div className="badge-row"><span className="badge">{severityLabel(alert.severity, language)}</span><span className="badge">{ruleName(alert.kind, language)}</span><span className="badge">{Math.round((alert.confidence ?? .7) * 100)}% {copy.confidence}</span></div><div><h3>{ruleName(alert.kind, language)}</h3><p>{localizedAlertSummary(alert, language)}</p></div><dl><div><dt>{copy.grouped}</dt><dd>{occurrences}</dd></div><div><dt>{copy.records}</dt><dd>{records}</dd></div>{typeof alert.evidence?.total_amount === 'number' && <div><dt>{copy.amount}</dt><dd>{formatCurrency(alert.evidence.total_amount)}</dd></div>}<div><dt>{copy.observed}</dt><dd>{alert.observed_from ? formatDate(alert.observed_from) : '—'} – {alert.observed_to ? formatDate(alert.observed_to) : '—'}</dd></div><div><dt>{copy.version}</dt><dd>{alert.rule_version ?? '2.0'}</dd></div></dl>{alert.is_partial_comparison && <p className="method-caution">{copy.partial}</p>}<details><summary>{copy.why}</summary><p>{copy.parameters}:</p><pre>{JSON.stringify(alert.rule_parameters ?? {}, null, 2)}</pre>{alert.known_data_denominator != null && <p>{copy.denominator}: {formatNumber(alert.known_data_denominator)}.</p>}</details><a className="pill-link pill-link--accent" href={withLanguage(`${withBase('/explorador')}?${new URLSearchParams(alert.filters)}`, language)}>{copy.evidence} →</a></article>)}</div>
    <nav className="pagination" aria-label={copy.page}><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>{copy.previous}</button><span>{copy.page} {currentPage} / {pages}</span><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>{copy.next}</button></nav>
  </section>;
}
