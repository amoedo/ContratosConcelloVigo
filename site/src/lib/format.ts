export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('es-ES').format(value ?? 0);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'Sin dato';
  }
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'Sin fecha';
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatCompactDate(value: string | null | undefined): string {
  if (!value) {
    return 'Sin fecha';
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }
  return new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(date);
}
