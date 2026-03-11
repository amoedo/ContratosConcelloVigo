import React from 'react';
import type { RecordExcerpt } from '@/lib/types';
import { formatCompactDate, formatCurrency, formatNumber } from '@/lib/format';

interface Props {
  rows: RecordExcerpt[];
  title: string;
}

export function RecordsTable({ rows, title }: Props) {
  return (
    <div className="table-card panel">
      <h3 className="card-title">{title}</h3>
      {!rows.length ? (
        <div className="empty-state">
          <strong>{'Sin registros para mostrar'}</strong>
          <p>{'Cuando existan datos derivados, esta tabla mostrar\u00e1 filas reales con fecha, asunto, unidad, adjudicatario e importe.'}</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Asunto</th>
              <th>Unidad</th>
              <th>Adjudicatario</th>
              <th>Importe</th>
              <th>Licitadores</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.record_id}>
                <td>{formatCompactDate(row.award_date)}</td>
                <td>{row.subject_raw}</td>
                <td>{row.unit_name}</td>
                <td>{row.vendor_name}</td>
                <td>{formatCurrency(row.importe_eur)}</td>
                <td>{row.licitadores_raw ? formatNumber(row.licitadores_raw) : 'Sin dato'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
