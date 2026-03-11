import React, { useEffect, useMemo, useState } from 'react';

import { withBase, withDataPath } from '@/lib/base';
import { buildSearch, defaultFilters, readFilters } from '@/lib/filters';
import { fetchJson } from '@/lib/http';
import { EMPTY_META, type MetaData } from '@/lib/types';

export function FilterBar() {
  const [meta, setMeta] = useState<MetaData>(EMPTY_META);
  const [filters, setFilters] = useState(defaultFilters);

  useEffect(() => {
    setFilters(readFilters(window.location.search));
    fetchJson<MetaData>(withDataPath('/derived/meta.json'), EMPTY_META).then(setMeta);
  }, []);

  const years = useMemo(() => meta.available_years.slice().sort((a, b) => b - a), [meta.available_years]);
  const activeCount = useMemo(() => Object.values(filters).filter(Boolean).length, [filters]);

  const update = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const apply = () => {
    const search = buildSearch(filters);
    window.location.assign(`${window.location.pathname}${search}`);
  };

  const clear = () => {
    window.location.assign(window.location.pathname);
  };

  return (
    <section className="panel filter-panel">
      <div className="filter-panel__intro">
        <div>
          <div className="kicker">{'Exploraci\u00f3n transversal'}</div>
          <h2 className="card-title">Filtros persistentes</h2>
        </div>
        <p className="card-subtitle">
          {'Act\u00faan como contrato com\u00fan entre secciones. Puedes llegar desde un gr\u00e1fico al explorador sin perder el contexto activo.'}
        </p>
      </div>

      <div className="filter-grid">
        <label className="filter-field">
          <span className="filter-label">{'A\u00f1o'}</span>
          <select value={filters.year} onChange={(event) => update('year', event.target.value)}>
            <option value="">Todos</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-label">Tipo</span>
          <select value={filters.type} onChange={(event) => update('type', event.target.value)}>
            <option value="">Todos</option>
            {meta.filters.types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-label">Competencia</span>
          <select value={filters.competition} onChange={(event) => update('competition', event.target.value)}>
            <option value="">Todas</option>
            {meta.filters.competition.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-label">Tramo</span>
          <select value={filters.amount} onChange={(event) => update('amount', event.target.value)}>
            <option value="">Todos</option>
            {meta.filters.amounts.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span className="filter-label">Tema</span>
          <select value={filters.topic} onChange={(event) => update('topic', event.target.value)}>
            <option value="">Todos</option>
            {meta.filters.topics.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field filter-field--wide">
          <span className="filter-label">Texto libre</span>
          <input value={filters.q} onChange={(event) => update('q', event.target.value)} placeholder="Asunto, adjudicatario o unidad" />
        </label>
      </div>

      <div className="filter-actions">
        <div className="badge-row">
          <span className="badge">{`${activeCount} filtros activos`}</span>
          <span className="badge">JSON ligeros por secci\u00f3n</span>
        </div>
        <div className="badge-row">
          <button className="pill-link" type="button" onClick={apply}>
            Aplicar
          </button>
          <button className="pill-link pill-link--ghost" type="button" onClick={clear}>
            Limpiar
          </button>
          <a className="pill-link pill-link--accent" href={`${withBase('/explorador')}${buildSearch(filters)}`}>
            Abrir explorador
          </a>
        </div>
      </div>
    </section>
  );
}
