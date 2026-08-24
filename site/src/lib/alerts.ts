import type { AlertItem } from '@/lib/types';

function alertSortDateValue(alert: AlertItem): number {
  const sortDate = alert.sort_date ?? (alert.filters.year ? `${alert.filters.year}-12-31` : null);
  if (!sortDate) {
    return 0;
  }

  const parsed = Date.parse(sortDate);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function sortAlertsByRecency(alerts: AlertItem[]): AlertItem[] {
  return [...alerts].sort((left, right) => {
    const dateDiff = alertSortDateValue(right) - alertSortDateValue(left);
    if (dateDiff !== 0) {
      return dateDiff;
    }
    return right.alert_id.localeCompare(left.alert_id);
  });
}
