import { useEffect, useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { withBase, withDataPath } from '@/lib/base';
import { fetchJson } from '@/lib/http';
import { defaultFilters, readFilters } from '@/lib/filters';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { EMPTY_META, createEmptyExplorerYear, type ExplorerYearPayload, type MetaData, type RecordExcerpt } from '@/lib/types';

const columnHelper = createColumnHelper<RecordExcerpt>();
const columns = [
  columnHelper.accessor('award_date', { header: 'Fecha', cell: (info) => formatDate(info.getValue()) }),
  columnHelper.accessor('subject_raw', { header: 'Asunto', cell: (info) => <span>{info.getValue()}</span> }),
  columnHelper.accessor('unit_name', { header: 'Unidad', cell: (info) => info.getValue() }),
  columnHelper.accessor('vendor_name', { header: 'Adjudicatario', cell: (info) => info.getValue() }),
  columnHelper.accessor('type_normalized', { header: 'Tipo', cell: (info) => info.getValue() }),
  columnHelper.accessor('importe_eur', { header: 'Importe', cell: (info) => formatCurrency(info.getValue()) }),
  columnHelper.accessor('licitadores_raw', { header: 'Licitadores', cell: (info) => (info.getValue() ? formatNumber(info.getValue()) : 'Sin dato') }),
];

function normalize(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function toCsv(rows: RecordExcerpt[]) {
  const header = ['fecha', 'asunto', 'unidad', 'adjudicatario', 'tipo', 'importe', 'licitadores'];
  const lines = rows.map((row) => [
    row.award_date ?? '',
    row.subject_raw,
    row.unit_name,
    row.vendor_name,
    row.type_normalized,
    String(row.importe_eur),
    row.licitadores_raw ?? '',
  ]);
  return [header, ...lines]
    .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
}

export function ExplorerApp() {
  const [meta, setMeta] = useState<MetaData>(EMPTY_META);
  const [rows, setRows] = useState<RecordExcerpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(defaultFilters);
  const [pathname, setPathname] = useState(withBase('/explorador'));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setPathname(window.location.pathname);
      const currentFilters = readFilters(window.location.search);
      setFilters(currentFilters);

      const metaPayload = await fetchJson(withDataPath('/derived/meta.json'), EMPTY_META);
      if (cancelled) return;
      setMeta(metaPayload);

      const years = currentFilters.year ? [Number(currentFilters.year)] : metaPayload.available_years;
      const payloads = await Promise.all(
        years.map((year) => fetchJson<ExplorerYearPayload>(withDataPath(`/derived/explorer/${year}.json`), createEmptyExplorerYear(year))),
      );
      if (cancelled) return;
      setRows(payloads.flatMap((payload) => payload.records));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const query = normalize(filters.q);
    return rows.filter((row) => {
      if (filters.year && String(row.source_year) !== filters.year) return false;
      if (filters.unit && row.unit_id !== filters.unit) return false;
      if (filters.vendor && row.vendor_id !== filters.vendor) return false;
      if (filters.type && row.type_normalized !== filters.type) return false;
      if (filters.competition && row.competition_bucket !== filters.competition) return false;
      if (filters.amount && row.amount_bucket !== filters.amount) return false;
      if (filters.topic && row.primary_topic_id !== filters.topic && !(row.topic_ids ?? []).includes(filters.topic)) return false;
      if (query) {
        const haystack = normalize([row.subject_raw, row.vendor_name, row.unit_name, row.type_normalized].join(' '));
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [filters, rows]);

  const table = useReactTable({ data: filteredRows, columns, getCoreRowModel: getCoreRowModel() });

  const exportCsv = () => {
    const blob = new Blob([toCsv(filteredRows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contratos-vigo-explorador.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page-shell section">
      <div className="panel hero">
        <div className="hero-eyebrow">Explorador libre</div>
        <h2 className="hero-title" style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>Tabla avanzada con filtros compartidos</h2>
        <p className="hero-copy">
          {'Esta vista aplica los par\u00e1metros de la URL actual y carga solo los a\u00f1os necesarios. Es la puerta de entrada para validar cualquier hallazgo.'}
        </p>
        <div className="grid metrics">
          <div className="stat-card"><span>Filas cargadas</span><strong>{formatNumber(rows.length)}</strong></div>
          <div className="stat-card"><span>Filas filtradas</span><strong>{formatNumber(filteredRows.length)}</strong></div>
          <div className="stat-card"><span>{'A\u00f1os disponibles'}</span><strong>{formatNumber(meta.available_years.length)}</strong></div>
        </div>
        <div className="badge-row">
          <button className="pill-link" type="button" onClick={exportCsv}>Exportar CSV</button>
          <a className="pill-link pill-link--ghost" href={pathname}>Quitar filtros</a>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><strong>{'Cargando explorador'}</strong><p>{'Se est\u00e1n leyendo los JSON derivados necesarios para esta vista.'}</p></div>
      ) : !filteredRows.length ? (
        <div className="empty-state"><strong>Sin resultados</strong><p>{'No hay filas que encajen con los filtros activos. Prueba a limpiar filtros o a generar datos reales con el pipeline.'}</p></div>
      ) : (
        <div className="table-card panel">
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

