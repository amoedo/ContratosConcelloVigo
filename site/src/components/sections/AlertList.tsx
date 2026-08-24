import React from 'react';
import { withBase } from '@/lib/base';
import { useLanguage, withLanguage } from '@/lib/i18n';
import { localizedAlertSummary, ruleName, severityLabel } from '@/lib/rules';
import type { AlertItem } from '@/lib/types';

interface Props { alerts: AlertItem[]; title?: string; titleGl?: string; maxItems?: number; titleLink?: string }

export function AlertList({ alerts, title = 'Hallazgos automáticos', titleGl = 'Achados automáticos', maxItems, titleLink }: Props) {
  const language = useLanguage();
  const copy = language === 'gl'
    ? { title: titleGl, empty: 'Aínda non hai achados', body: 'Cando o pipeline detecte sinais, aparecerán aquí cunha ligazón directa ao explorador.', view: 'Ver casos relacionados' }
    : { title, empty: 'Sin hallazgos todavía', body: 'Cuando el pipeline detecte señales, aparecerán aquí con enlace directo al explorador.', view: 'Ver casos relacionados' };
  const visibleAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;
  return <div className="list-card panel">
    <h3 className="card-title">{titleLink ? <a href={titleLink}>{copy.title}</a> : copy.title}</h3>
    {!visibleAlerts.length ? <div className="empty-state"><strong>{copy.empty}</strong><p>{copy.body}</p></div> : <ul className="list-reset">{visibleAlerts.map((alert) => <li className="alert-item" data-severity={alert.severity} key={alert.alert_id}><div className="badge-row"><span className="badge">{severityLabel(alert.severity, language)}</span><span className="badge">{ruleName(alert.kind, language)}</span></div><strong>{ruleName(alert.kind, language)}</strong><p>{localizedAlertSummary(alert, language)}</p><a className="inline-link" href={withLanguage(`${withBase('/explorador')}?${new URLSearchParams(alert.filters)}`, language)}>{copy.view}</a></li>)}</ul>}
  </div>;
}
