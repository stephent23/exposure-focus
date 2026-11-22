import { describe, expect, it } from 'vitest';

import type { RecordEntry } from '../schema/record';
import { termsFor } from './glossary';

const record = (extra: Record<string, unknown>) => ({ name: 'X', placements: [], evidence: [], ...extra }) as unknown as RecordEntry;
const terms = (r: RecordEntry) => termsFor(r).map((t) => t.term);

describe('termsFor', () => {
  it('always defines tier, where it runs and the rules, and links the rules page', () => {
    const t = termsFor(record({}));
    expect(t.map((x) => x.term)).toEqual(['Tier', 'Where it runs', 'The rules (rubric)']);
    expect(t[2].link?.href).toBe('/rubric/');
  });

  it('adds only the optional terms the record uses', () => {
    const r = record({ cves: ['CVE-2026-1'], evidence: [{ label: 'CISA KEV', text: 'Listed in KEV.' }] });
    expect(terms(r)).toContain('KEV');
    expect(terms(r)).toContain('CISA');
    expect(terms(r)).toContain('CVE');
    expect(terms(r)).not.toContain('SSO');
    expect(terms(r)).not.toContain('Editorial call');
  });

  it('explains the Tier 3 cap and editorial calls when a placement uses them', () => {
    const r = record({ placements: [{ facts: { reachable: false, exploited: true }, override_reason: 'Editorial judgement.' }] });
    expect(terms(r)).toContain('Capped at Tier 3');
    expect(terms(r)).toContain('Editorial call');
  });
});
