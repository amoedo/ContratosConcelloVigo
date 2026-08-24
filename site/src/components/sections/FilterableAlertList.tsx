import React, { useState, useMemo } from 'react';
import { withBase } from '@/lib/base';
import type { AlertItem } from '@/lib/types';

interface Props {
  alerts: AlertItem[];
  title?: string;
}

export function FilterableAlertList({ alerts, title = 'Alertas automáticas generadas' }: Props) {
  const [selectedKind, setSelectedKind] = useState<string>('all');

  // Get unique pattern kinds
  const kinds = useMemo(() => {
    const uniqueKinds = new Set(alerts.map(alert => alert.kind));
    return Array.from(uniqueKinds).sort();
  }, [alerts]);

  // Filter alerts by selected kind
  const filteredAlerts = useMemo(() => {
    if (selectedKind === 'all') {
      return alerts;
    }
    return alerts.filter(alert => alert.kind === selectedKind);
  }, [alerts, selectedKind]);

  // Format kind label for display
  const formatKindLabel = (kind: string): string => {
    return kind.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="list-card panel">
      <h3 className="card-title">{title}</h3>

      {kinds.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="kind-filter" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Filtrar por tipo de patrón:
          </label>
          <select
            id="kind-filter"
            value={selectedKind}
            onChange={(e) => setSelectedKind(e.target.value)}
            style={{
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid var(--border-color, #ccc)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-color, white)',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            <option value="all">Todos ({alerts.length})</option>
            {kinds.map(kind => {
              const count = alerts.filter(a => a.kind === kind).length;
              return (
                <option key={kind} value={kind}>
                  {formatKindLabel(kind)} ({count})
                </option>
              );
            })}
          </select>
        </div>
      )}

      {!filteredAlerts.length ? (
        <div className="empty-state">
          <strong>{'Sin hallazgos'}</strong>
          <p>
            {selectedKind === 'all'
              ? 'No hay alertas todavía.'
              : `No hay alertas del tipo seleccionado.`}
          </p>
        </div>
      ) : (
        <ul className="list-reset">
          {filteredAlerts.map((alert) => (
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
