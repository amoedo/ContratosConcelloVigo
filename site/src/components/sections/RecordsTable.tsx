import type { RecordExcerpt } from '@/lib/types';
import { formatCompactDate, formatCurrency, formatNumber } from '@/lib/format';
import { useLanguage } from '@/lib/i18n';

interface Props { rows: RecordExcerpt[]; title: string; titleGl?: string }

export function RecordsTable({ rows, title, titleGl = title }: Props) {
  const language = useLanguage();
  const copy = language === 'gl'
    ? { title: titleGl, empty: 'Sen rexistros para mostrar', body: 'Cando existan datos derivados, esta táboa mostrará filas reais.', date: 'Data', subject: 'Asunto', unit: 'Unidade', vendor: 'Adxudicatario', amount: 'Importe', bidders: 'Licitadores', missing: 'Sen dato' }
    : { title, empty: 'Sin registros para mostrar', body: 'Cuando existan datos derivados, esta tabla mostrará filas reales.', date: 'Fecha', subject: 'Asunto', unit: 'Unidad', vendor: 'Adjudicatario', amount: 'Importe', bidders: 'Licitadores', missing: 'Sin dato' };
  return <div className="table-card panel"><h3 className="card-title">{copy.title}</h3>{!rows.length ? <div className="empty-state"><strong>{copy.empty}</strong><p>{copy.body}</p></div> : <table className="data-table"><thead><tr><th>{copy.date}</th><th>{copy.subject}</th><th>{copy.unit}</th><th>{copy.vendor}</th><th>{copy.amount}</th><th>{copy.bidders}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.record_id}><td>{formatCompactDate(row.award_date)}</td><td>{row.subject_raw}</td><td>{row.unit_name}</td><td>{row.vendor_name}</td><td>{formatCurrency(row.importe_eur)}</td><td>{row.licitadores_raw ? formatNumber(row.licitadores_raw) : copy.missing}</td></tr>)}</tbody></table>}</div>;
}
