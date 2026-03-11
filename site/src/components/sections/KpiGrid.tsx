import React from 'react';
import type { SummaryKpis } from '@/lib/types';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format';

interface Props {
  summary: SummaryKpis;
}

export function KpiGrid({ summary }: Props) {
  const cards = [
    ['Adjudicaciones publicadas', formatNumber(summary.contract_count)],
    ['Importe total', formatCurrency(summary.total_amount)],
    ['Importe medio', formatCurrency(summary.mean_amount)],
    ['Importe mediano', formatCurrency(summary.median_amount)],
    ['Adjudicatarios \u00fanicos', formatNumber(summary.unique_vendors)],
    ['1 licitador', formatPercent(summary.single_bidder_pct)],
  ];

  return (
    <div className="grid metrics section">
      {cards.map(([label, value]) => (
        <article className="metric-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </div>
  );
}
