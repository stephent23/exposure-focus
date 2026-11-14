import { describe, expect, it } from 'vitest';

import { CAPS, headlineTier, isStale, parseRecord, recordSchema, sortedPlacements } from './record';

function validRecord() {
  return {
    slug: 'sample',
    name: 'Sample',
    aliases: [],
    cves: ['[CVE to confirm]'],
    summary: 'A sample record.',
    attack: 'rce',
    status: 'published',
    published: '2026-11-01',
    evidence_as_of: '2026-11-08',
    review_until: '2026-12-08',
    leadership_quote: 'A sentence a boss can read.',
    affected: [{ product: 'Sample 1.x', vulnerable: 'below 1.2.3', fixed: '1.2.3' }],
    applies_check: [{ question: 'Is it exposed?', how_to_check: 'Check the listener.' }],
    placements: [
      {
        name: 'Internet-facing',
        facts: { reachable: true, exploited: true, no_login: true, impact: 'critical' },
        why: ['Reachable, exploited, no login, code execution.'],
        tier: 1,
        action: 'Mitigate first, then patch.'
      }
    ],
    vectors: ['Remote request'],
    mitigations: [
      {
        title: 'Block access',
        summary: 'Restrict the listener.',
        effect: [{ vector: 'Remote request', status: 'closed' }],
        takes: 'A firewall change.',
        might_break: 'Remote users lose access.',
        official_guides: ['[link to add]'],
        check_it_worked: 'Probe from outside.',
        undo: 'Remove the rule.',
        confidence: 'reported'
      }
    ],
    evidence: [
      {
        label: 'CVE record',
        text: 'Reported by the vendor.',
        as_of: '2026-11-08',
        source_url: '[link to add]',
        confidence: 'reported'
      }
    ],
    sources: [{ title: 'Advisory', url: '[link to add]', accessed: '2026-11-08' }]
  };
}

type Mutable = Omit<ReturnType<typeof validRecord>, 'placements'> &
  Record<string, unknown> & {
    placements: { name: string; facts: Record<string, unknown>; why: string[]; tier: number; action: string }[];
  };

function reject(mutate: (r: Mutable) => void) {
  const r = validRecord() as Mutable;
  mutate(r);
  expect(recordSchema.safeParse(r).success).toBe(false);
}

describe('record schema', () => {
  it('accepts a valid record', () => {
    expect(parseRecord(validRecord()).slug).toBe('sample');
  });

  it('rejects an evidence item without a date or source', () => {
    reject((r) => delete (r.evidence[0] as Record<string, unknown>).as_of);
    reject((r) => delete (r.evidence[0] as Record<string, unknown>).source_url);
  });

  it('rejects fake example.com sources', () => {
    reject((r) => (r.sources[0].url = 'https://example.com/advisory'));
    reject((r) => (r.evidence[0].source_url = 'https://www.example.com/x'));
  });

  it('requires confidence, check_it_worked and undo on every mitigation', () => {
    reject((r) => delete (r.mitigations[0] as Record<string, unknown>).confidence);
    reject((r) => delete (r.mitigations[0] as Record<string, unknown>).check_it_worked);
    reject((r) => delete (r.mitigations[0] as Record<string, unknown>).undo);
  });

  it('requires might_break or a stated cost on every mitigation', () => {
    reject((r) => delete (r.mitigations[0] as Record<string, unknown>).might_break);
    const r = validRecord() as Mutable;
    delete (r.mitigations[0] as Record<string, unknown>).might_break;
    (r.mitigations[0] as Record<string, unknown>).cost = 'Needs a maintenance window.';
    expect(recordSchema.safeParse(r).success).toBe(true);
  });

  it('fails when the declared tier disagrees with the rubric', () => {
    reject((r) => (r.placements[0].tier = 3));
  });

  it('allows a disagreeing tier only with a public override_reason', () => {
    const r = validRecord() as Mutable;
    r.placements[0].tier = 2;
    (r.placements[0] as Record<string, unknown>).override_reason = 'Compensating control verified by the owner.';
    expect(recordSchema.safeParse(r).success).toBe(true);
  });

  it('rejects CVSS or EPSS as placement inputs', () => {
    reject((r) => ((r.placements[0].facts as Record<string, unknown>).cvss = 9.8));
  });

  it('rejects hour or day counts for a tier anywhere in the record', () => {
    reject((r) => (r.placements[0].action = 'Patch within 48 hours.'));
    reject((r) => (r.leadership_quote = 'Do this in 7 days.'));
  });

  it('accepts only the placeholder or a real https link in link fields', () => {
    const setUrl = (url: string) => (r: Mutable) => ((r.evidence[0] as { source_url: string }).source_url = url);
    for (const bad of ['javascript:alert(1)', 'http://vendor.test/a', 'data:text/html,x', 'ftp://vendor.test/a', 'https://example.com/a', 'https://www.example.org/a']) {
      reject(setUrl(bad));
    }
    const ok = validRecord() as Mutable;
    setUrl('https://vendor.test/advisory')(ok);
    expect(recordSchema.safeParse(ok).success).toBe(true);
  });

  it('takes the headline tier from the first (primary) placement, not the most severe one', () => {
    const r = validRecord() as Mutable;
    r.placements = [
      { ...r.placements[0], name: 'Default host', facts: { reachable: true, public_exploit: true, no_login: true, impact: 'critical' }, tier: 2 },
      { ...r.placements[0], name: 'Exploited host', tier: 1 }
    ];
    const parsed = parseRecord(r);
    expect(headlineTier(parsed)).toBe(2);
  });

  describe('exploit chains', () => {
    const chained = () => {
      const r = validRecord() as Mutable;
      r.placements[0].facts = { reachable: true, exploited: true, no_login: true, impact: 'critical', chained_with: ['CVE-2024-0001'] };
      return r;
    };

    it('rejects a placement that relies on a chain the record does not cite', () => {
      expect(recordSchema.safeParse(chained()).success).toBe(false);
    });

    it('accepts it once an evidence item labelled as an exploit chain is present', () => {
      const r = chained();
      r.evidence.push({ label: 'Exploit chain', text: 'Chained with CVE-2024-0001.', as_of: '2026-11-08', source_url: '[link to add]', confidence: 'reported' });
      expect(recordSchema.safeParse(r).success).toBe(true);
    });

    it('rejects an empty chain list', () => {
      reject((r) => ((r.placements[0].facts as Record<string, unknown>).chained_with = []));
    });
  });

  describe('exploitation about to start', () => {
    const likely = () => {
      const r = validRecord() as Mutable;
      r.placements[0].facts = { reachable: true, exploitation_imminent: true, no_login: true, impact: 'critical' };
      r.placements[0].tier = 1;
      return r;
    };

    it('rejects the claim without an exploitation outlook evidence item', () => {
      expect(recordSchema.safeParse(likely()).success).toBe(false);
    });

    it('accepts it once the record explains why', () => {
      const r = likely();
      r.evidence.push({ label: 'Exploitation outlook', text: 'The patch is a one-line change.', as_of: '2026-11-08', source_url: '[link to add]', confidence: 'inference' });
      expect(recordSchema.safeParse(r).success).toBe(true);
    });
  });

  it('rejects an unknown attack type', () => {
    reject((r) => ((r as Record<string, unknown>).attack = 'harmful'));
  });

  it('rejects the retired impact values and business_critical input', () => {
    reject((r) => ((r.placements[0].facts as Record<string, unknown>).impact = 'high'));
    reject((r) => ((r.placements[0].facts as Record<string, unknown>).impact = 'denial-of-service'));
    reject((r) => ((r.placements[0].facts as Record<string, unknown>).business_critical = true));
  });

  describe('EPSS', () => {
    const publicExploit = { reachable: true, public_exploit: true, no_login: true, impact: 'critical' };
    const withEpss = (score: number, tier: number) => {
      const r = validRecord() as Mutable;
      r.placements[0].facts = publicExploit;
      r.placements[0].tier = tier;
      r.epss = { score, as_of: '2026-11-08', source_url: '[link to add]' };
      return r;
    };

    it('requires Tier 1 once EPSS reaches 50% with a public exploit', () => {
      expect(recordSchema.safeParse(withEpss(0.5, 1)).success).toBe(true);
      expect(recordSchema.safeParse(withEpss(0.5, 2)).success).toBe(false);
    });

    it('rejects an EPSS score without a date or a source', () => {
      const r = withEpss(0.2, 2);
      delete (r.epss as Record<string, unknown>).as_of;
      expect(recordSchema.safeParse(r).success).toBe(false);
      const s = withEpss(0.2, 2);
      delete (s.epss as Record<string, unknown>).source_url;
      expect(recordSchema.safeParse(s).success).toBe(false);
    });

    it('rejects EPSS typed into a placement, and the retired edge_device input', () => {
      reject((r) => ((r.placements[0].facts as Record<string, unknown>).epss = 0.9));
      reject((r) => ((r.placements[0].facts as Record<string, unknown>).edge_device = true));
    });
  });

  it('sorts placements for display with the most urgent first', () => {
    const r = validRecord() as Mutable;
    r.placements = [
      { ...r.placements[0], name: 'Default', facts: { reachable: true, public_exploit: true, no_login: true, impact: 'critical' }, tier: 2 },
      { ...r.placements[0], name: 'Exploited', tier: 1 }
    ];
    expect(sortedPlacements(parseRecord(r)).map((p) => p.tier)).toEqual([1, 2]);
  });

  it('marks a published record past review_until as stale', () => {
    const r = parseRecord(validRecord());
    expect(isStale(r, '2026-12-08')).toBe(false);
    expect(isStale(r, '2026-12-09')).toBe(true);
    expect(isStale({ ...r, status: 'draft' }, '2027-01-01')).toBe(false);
  });
});

describe('key dates (timeline)', () => {
  const entry = { event: 'Fix released', date: '2026-10-20', source_url: 'https://vendor.test/advisory', confidence: 'vendor-stated' };
  const withTimeline = (timeline: unknown) => ({ ...validRecord(), timeline });

  it('is optional', () => {
    expect(parseRecord(validRecord()).timeline).toBeUndefined();
  });

  it('accepts dated, sourced events with an optional UTC time', () => {
    expect(parseRecord(withTimeline([entry, { ...entry, event: 'Exploitation seen', time: '14:05' }])).timeline).toHaveLength(2);
  });

  it('rejects an event with no source, a bad date or time, or no confidence label', () => {
    for (const bad of [
      { ...entry, source_url: undefined },
      { ...entry, source_url: 'http://vendor.test/a' },
      { ...entry, date: '20 Oct 2026' },
      { ...entry, time: '2pm' },
      { ...entry, confidence: undefined }
    ]) {
      expect(recordSchema.safeParse(withTimeline([bad])).success).toBe(false);
    }
  });
});

describe('change log', () => {
  const move = { date: '2026-11-01', placement: 'Internet-facing', from_tier: 2, to_tier: 1, reason: 'CISA added it to KEV.', source_url: 'https://vendor.test/kev' };
  const note = { date: '2026-10-30', reason: 'Added a WAF mitigation.', source_url: 'https://vendor.test/waf' };
  const withChanges = (changes: unknown) => ({ ...validRecord(), changes });

  it('is optional', () => {
    expect(parseRecord(validRecord()).changes).toBeUndefined();
  });

  it('accepts dated, sourced tier moves and plain notes', () => {
    expect(parseRecord(withChanges([note, move])).changes).toHaveLength(2);
  });

  it('rejects an entry with no source, a bad date or no reason', () => {
    for (const bad of [{ ...note, source_url: undefined }, { ...note, date: 'Oct 30' }, { ...note, reason: '' }]) {
      expect(recordSchema.safeParse(withChanges([bad])).success).toBe(false);
    }
  });

  it('needs placement, from_tier and to_tier together, with different tiers', () => {
    for (const bad of [
      { ...move, from_tier: undefined },
      { ...move, to_tier: undefined },
      { ...move, placement: undefined },
      { ...move, from_tier: 1 }
    ]) {
      expect(recordSchema.safeParse(withChanges([bad])).success).toBe(false);
    }
  });

  it('rejects a move for a placement the record does not have', () => {
    expect(recordSchema.safeParse(withChanges([{ ...move, placement: 'Nowhere' }])).success).toBe(false);
  });

  it('rejects a change dated after the evidence date', () => {
    expect(recordSchema.safeParse(withChanges([{ ...note, date: '2026-11-09' }])).success).toBe(false);
  });

  it('requires the latest move for a placement to end on its current tier', () => {
    const older = { ...move, date: '2026-10-20', from_tier: 3, to_tier: 2 };
    expect(recordSchema.safeParse(withChanges([older, move])).success).toBe(true);
    expect(recordSchema.safeParse(withChanges([older])).success).toBe(false);
  });
});

describe('affected and exposed_when', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a loose fixture the tests mutate
  const base = () => validRecord() as Record<string, any>;
  const ok = (r: unknown) => expect(recordSchema.safeParse(r).success).toBe(true);
  const bad = (r: unknown) => expect(recordSchema.safeParse(r).success).toBe(false);

  it('requires at least one affected row', () => {
    const missing = base();
    delete missing.affected;
    bad(missing);
    bad({ ...base(), affected: [] });
  });

  it('allows a row with no fix, and rejects unknown keys', () => {
    ok({ ...base(), affected: [{ product: 'Sample', vulnerable: '[versions to confirm]' }] });
    bad({ ...base(), affected: [{ product: 'Sample', vulnerable: 'all', extra: 'x' }] });
  });

  it('caps product, vulnerable and fixed', () => {
    for (const [key, max] of [['product', CAPS.product], ['vulnerable', CAPS.vulnerable], ['fixed', CAPS.fixed]] as const) {
      const row = (n: number) => ({ product: 'P', vulnerable: 'all', fixed: '1', [key]: 'a'.repeat(n) });
      ok({ ...base(), affected: [row(max)] });
      bad({ ...base(), affected: [row(max + 1)] });
    }
  });

  it('limits exposed_when to 1 to 4 items of at most the cap', () => {
    ok({ ...base(), exposed_when: ['a'.repeat(CAPS.exposedWhen), 'b', 'c', 'd'] });
    bad({ ...base(), exposed_when: [] });
    bad({ ...base(), exposed_when: ['a', 'b', 'c', 'd', 'e'] });
    bad({ ...base(), exposed_when: ['a'.repeat(CAPS.exposedWhen + 1)] });
  });
});

describe('length caps', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a loose fixture the tests mutate
  type Rec = Record<string, any>;
  const cases: [keyof typeof CAPS, (r: Rec, v: string) => void][] = [
    ['summary', (r, v) => (r.summary = v)],
    ['leadershipQuote', (r, v) => (r.leadership_quote = v)],
    ['placementName', (r, v) => (r.placements[0].name = v)],
    ['placementAction', (r, v) => (r.placements[0].action = v)],
    ['question', (r, v) => (r.applies_check[0].question = v)],
    ['howToCheck', (r, v) => (r.applies_check[0].how_to_check = v)],
    ['mitigationTitle', (r, v) => (r.mitigations[0].title = v)],
    ['mitigationTakes', (r, v) => (r.mitigations[0].takes = v)]
  ];
  for (const [name, apply] of cases) {
    it(`${name}: passes at the cap, fails one over and names the cap`, () => {
      const cap = CAPS[name];
      const atCap = validRecord() as Rec;
      apply(atCap, 'a'.repeat(cap));
      expect(recordSchema.safeParse(atCap).success).toBe(true);
      const over = validRecord() as Rec;
      apply(over, 'a'.repeat(cap + 1));
      const result = recordSchema.safeParse(over);
      expect(result.success).toBe(false);
      expect(JSON.stringify(result.error?.issues)).toContain(`${cap}`);
    });
  }
});

describe('published date', () => {
  it('is required', () => {
    const rest = { ...validRecord() } as Record<string, unknown>;
    delete rest.published;
    expect(recordSchema.safeParse(rest).success).toBe(false);
  });
  it('cannot be after evidence_as_of', () => {
    expect(recordSchema.safeParse({ ...validRecord(), published: '2026-11-08' }).success).toBe(true);
    expect(recordSchema.safeParse({ ...validRecord(), published: '2026-11-09' }).success).toBe(false);
  });
});
