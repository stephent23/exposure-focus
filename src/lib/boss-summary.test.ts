import { describe, it, expect } from 'vitest';
import type { RecordEntry } from '../schema/record';
import { bossSummary } from './boss-summary';

function fake(confidences: string[] = ['vendor-stated']): RecordEntry {
  return {
    name: 'Example Bug',
    cves: ['CVE-2026-0001', 'CVE-2026-0002'],
    summary: 'A flaw in Example.',
    leadership_quote: 'Patch the edge first.',
    evidence_as_of: '2026-11-01',
    review_until: '2026-12-01',
    evidence: confidences.map((confidence) => ({ confidence })),
    placements: [
      { name: 'Internet-facing', tier: 2, action: 'Patch now.' },
      { name: 'Internal', tier: 3, action: 'Schedule it.' }
    ]
  } as unknown as RecordEntry;
}

const URL = 'https://example.com/verdicts/example-bug/';

describe('bossSummary', () => {
  it('has the parts in order, ending with the URL', () => {
    const lines = bossSummary(fake(), URL).split('\n').filter(Boolean);
    expect(lines).toEqual([
      'Example Bug (CVE-2026-0001, CVE-2026-0002): Tier 2, Urgent',
      'Patch the edge first.',
      'Evidence as of 2026-11-01 (UTC). Review by 2026-12-01.',
      URL
    ]);
  });

  it('never adds an unconfirmed line: confidence is shown on the page, not repeated', () => {
    expect(bossSummary(fake(['vendor-stated', 'reported']), URL)).not.toContain('not yet confirmed');
  });

});
