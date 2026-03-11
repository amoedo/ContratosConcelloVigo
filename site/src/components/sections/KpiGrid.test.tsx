import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KpiGrid } from '@/components/sections/KpiGrid';

describe('KpiGrid', () => {
  it('renders the main kpis', () => {
    render(
      <KpiGrid
        summary={{
          contract_count: 12,
          total_amount: 34000,
          mean_amount: 2800,
          median_amount: 1400,
          unique_vendors: 7,
          unique_units: 4,
          unique_expedientes: 10,
          single_bidder_pct: 75,
          known_competition_count: 8,
        }}
      />,
    );

    expect(screen.getByText('Adjudicaciones publicadas')).toBeInTheDocument();
    expect(screen.getByText(/34.000/)).toBeInTheDocument();
  });
});

