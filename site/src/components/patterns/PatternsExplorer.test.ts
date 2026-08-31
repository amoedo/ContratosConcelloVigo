import { describe, expect, it } from 'vitest';
import { groupAlertsNewestFirst } from './PatternsExplorer';
import { RULES, ruleName } from '@/lib/rules';
import type { AlertItem } from '@/lib/types';

function alert(id: string, family: string, observedTo: string): AlertItem {
  return { alert_id: id, family_id: family, kind: 'unit-concentration', severity: 'media', title: id, summary: id, evidence: {}, filters: {}, related_record_ids: [id], observed_to: observedTo };
}

describe('pattern presentation', () => {
  it('keeps the newest occurrence and sorts cases newest first', () => {
    const grouped = groupAlertsNewestFirst([
      alert('old-a', 'a', '2024-03-01'), alert('new-a', 'a', '2026-02-01'), alert('b', 'b', '2025-12-01'),
    ]);
    expect(grouped.map((item) => item.alert.alert_id)).toEqual(['new-a', 'b']);
    expect(grouped[0].occurrences).toBe(2);
  });

  it('publishes eight descriptive names in both languages', () => {
    expect(RULES).toHaveLength(8);
    RULES.forEach((rule) => {
      expect(ruleName(rule.id, 'es')).not.toBe(rule.id);
      expect(ruleName(rule.id, 'gl')).not.toBe(rule.id);
    });
  });
});
