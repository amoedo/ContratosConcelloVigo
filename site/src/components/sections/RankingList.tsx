import React from 'react';
import { withBase } from '@/lib/base';
import type { RankedEntity } from '@/lib/types';
import { formatCurrency, formatNumber } from '@/lib/format';

interface Props {
  items: RankedEntity[];
  hrefBase: string;
  title: string;
  subtitle: string;
}

export function RankingList({ items, hrefBase, title, subtitle }: Props) {
  return (
    <div className="list-card panel">
      <h3 className="card-title">{title}</h3>
      <p className="card-subtitle">{subtitle}</p>
      {!items.length ? (
        <div className="empty-state">
          <strong>{'Ranking pendiente de datos'}</strong>
          <p>{'Este bloque se rellenar\u00e1 cuando el pipeline genere agregados reales para la secci\u00f3n.'}</p>
        </div>
      ) : (
        <ol className="list-reset">
          {items.map((item, index) => (
            <li className="rank-item" key={item.id}>
              <div className="badge-row">
                <span className="badge">#{index + 1}</span>
                <span className="badge">{`${formatNumber(item.contract_count)} adjudicaciones`}</span>
              </div>
              <a className="inline-link" href={withBase(`${hrefBase}/${item.id}`)}>
                <strong>{item.name}</strong>
              </a>
              <p>{`${formatCurrency(item.total_amount)} / Media ${formatCurrency(item.mean_amount)}`}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
