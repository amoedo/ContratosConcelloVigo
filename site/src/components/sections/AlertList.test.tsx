import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AlertList } from '@/components/sections/AlertList';
import type { AlertItem } from '@/lib/types';

function buildAlert(index: number): AlertItem {
  return {
    alert_id: `alert-${index}`,
    kind: 'fragmentation-pattern',
    severity: 'alta',
    sort_date: `2024-01-${String(index).padStart(2, '0')}`,
    title: `Alerta ${index}`,
    summary: `Resumen ${index}`,
    evidence: {},
    filters: { year: '2024', unit: `unit-${index}` },
    related_record_ids: [],
  };
}

describe('AlertList', () => {
  it('limits the list and renders the title link when requested', () => {
    render(<AlertList alerts={Array.from({ length: 12 }, (_, index) => buildAlert(index + 1))} maxItems={10} titleLink="/patrones" />);

    expect(screen.getByRole('link', { name: 'Hallazgos automáticos' })).toHaveAttribute('href', '/patrones');
    expect(document.querySelectorAll('.alert-item')).toHaveLength(10);
  });
});
