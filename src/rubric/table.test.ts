import { describe, expect, it } from 'vitest';
import { EVIDENCE_COLUMNS, IMPACT_LEVELS, IMPACT_TABLE, triage, type TriageFacts } from './triage';

const evidenceFacts: Record<(typeof EVIDENCE_COLUMNS)[number]['key'], TriageFacts> = {
  attack: { exploited: true },
  demonstrated: { public_exploit: true },
  none: {}
};

describe('impact table', () => {
  it('has 3 rows x 3 columns with tiers 1 to 4', () => {
    expect(IMPACT_LEVELS).toEqual(['critical', 'significant', 'limited']);
    expect(EVIDENCE_COLUMNS.map((c) => c.label)).toEqual(['Exploited or imminent', 'Demonstrated', 'No evidence']);
    expect(Object.keys(IMPACT_TABLE)).toHaveLength(3);
    for (const impact of IMPACT_LEVELS) {
      expect(IMPACT_TABLE[impact]).toHaveLength(3);
      for (const tier of IMPACT_TABLE[impact]) expect([1, 2, 3, 4]).toContain(tier);
    }
  });

  it('matches triage() for every impact x evidence cell', () => {
    for (const impact of IMPACT_LEVELS) {
      EVIDENCE_COLUMNS.forEach((column, index) => {
        const result = triage({ reachable: true, no_login: true, impact, ...evidenceFacts[column.key] });
        expect(result.tier, `${impact} x ${column.key}`).toBe(IMPACT_TABLE[impact][index]);
      });
    }
  });
});
