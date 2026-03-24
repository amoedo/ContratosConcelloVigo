import { describe, expect, it } from 'vitest';

import { formatCompactDate, formatCurrency, formatDate, formatNumber, formatPercent } from '@/lib/format';

describe('formatCurrency', () => {
  it('formats a positive integer amount', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('1500');
    expect(result).toContain('€');
  });

  it('returns zero for null', () => {
    const result = formatCurrency(null);
    expect(result).toContain('0');
  });

  it('returns zero for undefined', () => {
    const result = formatCurrency(undefined);
    expect(result).toContain('0');
  });
});

describe('formatNumber', () => {
  it('formats a number with locale separators', () => {
    const result = formatNumber(1234567);
    expect(result).toMatch(/1[.\s]?234[.\s]?567/);
  });

  it('returns zero for null', () => {
    expect(formatNumber(null)).toContain('0');
  });
});

describe('formatPercent', () => {
  it('formats a percentage with one decimal', () => {
    const result = formatPercent(42.56);
    expect(result).toMatch(/42[,.]?6?%/);
  });

  it('returns Sin dato for null', () => {
    expect(formatPercent(null)).toBe('Sin dato');
  });

  it('returns Sin dato for undefined', () => {
    expect(formatPercent(undefined)).toBe('Sin dato');
  });
});

describe('formatDate', () => {
  it('formats a valid ISO date', () => {
    const result = formatDate('2024-03-15');
    expect(result).toContain('2024');
  });

  it('returns Sin fecha for null', () => {
    expect(formatDate(null)).toBe('Sin fecha');
  });

  it('returns Sin fecha for empty string', () => {
    expect(formatDate('')).toBe('Sin fecha');
  });

  it('returns raw value for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatCompactDate', () => {
  it('formats a valid date compactly', () => {
    const result = formatCompactDate('2024-06-01');
    expect(result).toContain('2024');
  });

  it('returns Sin fecha for null', () => {
    expect(formatCompactDate(null)).toBe('Sin fecha');
  });

  it('returns raw value for invalid date', () => {
    expect(formatCompactDate('bad')).toBe('bad');
  });
});
