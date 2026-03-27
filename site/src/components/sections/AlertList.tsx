import React from 'react';
import { withBase } from '@/lib/base';
import type { AlertItem } from '@/lib/types';

interface Props {
  alerts: AlertItem[];
  title?: string;
  maxItems?: number;
  titleLink?: string;
}

export function AlertList({ alerts, title = 'Hallazgos automáticos', maxItems, titleLink }: Props) {
  const displayedAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;

  return (
    <div className="list-card panel">
      {titleLink ? (
        <h3 className="card-title">
          <a href={titleLink} style={{ textDecoration: 'none', color: 'inherit' }}>
            {title}
          </a>
        </h3>
      ) : (
        <h3 className="card-title">{title}</h3>
      )}
      {!alerts.length ? (
        <div className="empty-state">
          <strong>{'Sin hallazgos todavía'}</strong>
          <p>{'Cuando el pipeline detecte concentración, baja competencia o patrones repetidos, aparecerán aquí con enlace directo al explorador.'}</p>
        </div>
      ) : (
        <ul className="list-reset">
          {displayedAlerts.map((alert) => (
            <li className="alert-item" data-severity={alert.severity} key={alert.alert_id}>
              <div className="badge-row">
                <span className="badge">{alert.severity}</span>
                <span className="badge">{alert.kind}</span>
              </div>
              <strong>{alert.title}</strong>
              <p>{alert.summary}</p>
              <a className="inline-link" href={`${withBase('/explorador')}?${new URLSearchParams(alert.filters).toString()}`}>
                Ver casos relacionados
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
