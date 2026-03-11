import { describe, expect, it } from 'vitest';

import { buildSearch, readFilters } from '@/lib/filters';

describe('filters', () => {
  it('reads query params into filter state', () => {
    const filters = readFilters('?year=2024&type=servicio&q=hosting');
    expect(filters.year).toBe('2024');
    expect(filters.type).toBe('servicio');
    expect(filters.q).toBe('hosting');
  });

  it('builds compact search strings', () => {
    expect(buildSearch({ year: '2025', q: 'prensa', type: '' })).toBe('?year=2025&q=prensa');
  });
});
