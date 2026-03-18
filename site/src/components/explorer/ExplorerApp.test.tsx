import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ExplorerApp } from '@/components/explorer/ExplorerApp';
import type { ExplorerYearPayload, MetaData } from '@/lib/types';

const meta: MetaData = {
  dataset: 'contratos-menores-vigo',
  last_refreshed: null,
  available_years: [2024],
  partial_years: [],
  row_count: 3,
  entity_counts: { vendors: 3, units: 2 },
  quality: {},
  filters: { types: [], competition: ['1', '2', '3', '4+', 'desconocido'], amounts: [], topics: [] },
  alert_count: 0,
};

const explorerPayload: ExplorerYearPayload = {
  year: 2024,
  records: [
    {
      record_id: 'r-1',
      award_date: '2024-01-10',
      source_year: 2024,
      expediente_key: 'exp-1',
      expediente_raw: 'exp-1',
      unit_id: 'u-1',
      unit_name: 'Unidad B',
      vendor_id: 'v-1',
      vendor_name: 'Proveedor Z',
      type_normalized: 'Obras',
      subject_raw: 'Beta',
      importe_eur: 2000,
      licitadores_raw: 2,
      competition_bucket: '2',
      amount_bucket: '1000-5000',
      primary_topic_id: 't-1',
      primary_topic_label: 'Tema 1',
      alert_flags: [],
      data_quality_flags: [],
      near_threshold: false,
      topic_ids: [],
    },
    {
      record_id: 'r-2',
      award_date: '2024-02-10',
      source_year: 2024,
      expediente_key: 'exp-2',
      expediente_raw: 'exp-2',
      unit_id: 'u-2',
      unit_name: 'Unidad A',
      vendor_id: 'v-2',
      vendor_name: 'Proveedor A',
      type_normalized: 'Servicios',
      subject_raw: 'Alpha',
      importe_eur: 1000,
      licitadores_raw: 1,
      competition_bucket: '1',
      amount_bucket: '0-1000',
      primary_topic_id: 't-2',
      primary_topic_label: 'Tema 2',
      alert_flags: [],
      data_quality_flags: [],
      near_threshold: false,
      topic_ids: [],
    },
    {
      record_id: 'r-3',
      award_date: '2024-03-10',
      source_year: 2024,
      expediente_key: 'exp-3',
      expediente_raw: 'exp-3',
      unit_id: 'u-1',
      unit_name: 'Unidad C',
      vendor_id: 'v-3',
      vendor_name: 'Proveedor M',
      type_normalized: 'Suministros',
      subject_raw: 'Gamma',
      importe_eur: 3000,
      licitadores_raw: 3,
      competition_bucket: '3',
      amount_bucket: '1000-5000',
      primary_topic_id: 't-3',
      primary_topic_label: 'Tema 3',
      alert_flags: [],
      data_quality_flags: [],
      near_threshold: false,
      topic_ids: [],
    },
  ],
};

function getSubjectOrder() {
  return Array.from(document.querySelectorAll('tbody tr td:nth-child(2)')).map((cell) => cell.textContent);
}

describe('ExplorerApp', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/explorador');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/derived/meta.json')) {
        return new Response(JSON.stringify(meta), { status: 200 });
      }
      if (url.includes('/derived/explorer/2024.json')) {
        return new Response(JSON.stringify(explorerPayload), { status: 200 });
      }
      return new Response(null, { status: 404 });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sorts rows when a column header is clicked', async () => {
    render(<ExplorerApp />);

    await screen.findByText('Gamma');
    expect(getSubjectOrder()).toEqual(['Beta', 'Alpha', 'Gamma']);

    const subjectHeader = screen.getByRole('button', { name: /asunto/i });
    fireEvent.click(subjectHeader);

    await waitFor(() => {
      expect(getSubjectOrder()).toEqual(['Alpha', 'Beta', 'Gamma']);
    });
    expect(subjectHeader.closest('th')).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.click(subjectHeader);

    await waitFor(() => {
      expect(getSubjectOrder()).toEqual(['Gamma', 'Beta', 'Alpha']);
    });
    expect(subjectHeader.closest('th')).toHaveAttribute('aria-sort', 'descending');
  });
});
