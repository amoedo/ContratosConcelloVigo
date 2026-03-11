import React from 'react';
import { withBase } from '@/lib/base';
import type { AlertItem } from '@/lib/types';

interface Props {
  alerts: AlertItem[];
  title?: string;
}

export function AlertList({ alerts, title = 'Hallazgos autom\u00e1ticos' }: Props) {
  return (
    <div className="list-card panel">
      <h3 className="card-title">{title}</h3>
      {!alerts.length ? (
        <div className="empty-state">
          <strong>{'Sin hallazgos todav\u00eda'}</strong>
          <p>{'Cuando el pipeline detecte concentraci\u00f3n, baja competencia o patrones repetidos, aparecer\u00e1n aqu\u00ed con enlace directo al explorador.'}</p>
        </div>
      ) : (
        <ul className="list-reset">
          {alerts.map((alert) => (
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
