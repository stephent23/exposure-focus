import { describe, it, expect } from 'vitest';
import type { RecordEntry } from '../schema/record';
import { fixTitle, freshness, groupForHome, lastChanged, lastTierMove, recentActivity } from './home';

function fake(slug: string, tier: number, status: 'draft' | 'published' | 'retired' = 'published', published = '2026-11-01'): RecordEntry {
  return { slug, name: slug, status, published, placements: [{ tier }] } as unknown as RecordEntry;
}

describe('groupForHome', () => {
  it('always returns tiers 1, 2 and 3 in order, even when empty', () => {
    const groups = groupForHome([]);
    expect(groups.map((g) => g.tier)).toEqual([1, 2, 3]);
    expect(groups.every((g) => g.records.length === 0)).toBe(true);
  });

  it('places each published record once under its headline tier', () => {
    const groups = groupForHome([fake('a', 1), fake('b', 2), fake('c', 3), fake('d', 3)]);
    expect(groups.map((g) => g.records.map((r) => r.slug))).toEqual([['a'], ['b'], ['c', 'd']]);
  });

  it('lists the newest verdict first within a tier, not alphabetically', () => {
    const groups = groupForHome([
      fake('alpha', 1, 'published', '2026-11-09'),
      fake('zulu', 1, 'published', '2026-11-20'),
      fake('mike', 1, 'published', '2026-11-13')
    ]);
    expect(groups[0].records.map((r) => r.slug)).toEqual(['zulu', 'mike', 'alpha']);
  });

  it('drops records headlined at Routine (tier 4)', () => {
    const slugs = groupForHome([fake('routine', 4), fake('a', 2)]).flatMap((g) => g.records.map((r) => r.slug));
    expect(slugs).toEqual(['a']);
  });

  it('never includes draft or retired records', () => {
    const slugs = groupForHome([fake('d', 1, 'draft'), fake('r', 2, 'retired'), fake('p', 1)]).flatMap((g) =>
      g.records.map((r) => r.slug)
    );
    expect(slugs).toEqual(['p']);
  });
});

const rec = (over: Record<string, unknown>) =>
  ({ slug: 'a', name: 'Alpha', status: 'published', published: '2026-11-01', placements: [{ name: 'Edge', tier: 2 }], ...over }) as unknown as RecordEntry;

describe('recentActivity', () => {
  it('lists new verdicts and every change, newest first, published records only', () => {
    const a = rec({
      changes: [
        { date: '2026-11-05', placement: 'Edge', from_tier: 3, to_tier: 2, reason: 'r', source_url: 'x' },
        { date: '2026-11-03', reason: 'r', source_url: 'x' }
      ]
    });
    const b = rec({ slug: 'b', name: 'Beta', published: '2026-11-04' });
    const draft = rec({ slug: 'd', status: 'draft', published: '2026-11-09' });
    expect(recentActivity([a, b, draft]).map((x) => [x.date, x.slug, x.kind, x.detail])).toEqual([
      ['2026-11-05', 'a', 'moved', 'Tier 3 to Tier 2: Edge'],
      ['2026-11-04', 'b', 'new', 'New verdict: Tier 2 (Urgent)'],
      ['2026-11-03', 'a', 'updated', 'Verdict updated'],
      ['2026-11-01', 'a', 'new', 'New verdict: Tier 2 (Urgent)']
    ]);
  });

  it('keeps only the newest entries up to the limit', () => {
    expect(recentActivity([rec({}), rec({ slug: 'b', published: '2026-11-02' })], 1).map((x) => x.slug)).toEqual(['b']);
  });
});

describe('lastChanged and freshness', () => {
  const changed = rec({ changes: [{ date: '2026-11-03' }, { date: '2026-11-06' }] });
  it('gives the latest change date, or nothing when the verdict never changed', () => {
    expect(lastChanged(changed)).toBe('2026-11-06');
    expect(lastChanged(rec({}))).toBeUndefined();
  });
  it('marks a verdict changed or new only within a week of today', () => {
    expect(freshness(changed, '2026-11-13')).toBe('changed');
    expect(freshness(changed, '2026-11-14')).toBeNull();
    expect(freshness(rec({}), '2026-11-08')).toBe('new');
    expect(freshness(rec({}), '2026-11-09')).toBeNull();
    expect(freshness(rec({ published: '2026-11-10', changes: [{ date: '2026-11-11' }] }), '2026-11-12')).toBe('new');
  });
});

describe('recentActivity order', () => {
  it('orders same-day items by verdict name, whatever order the records come in', () => {
    const z = rec({ slug: 'z', name: 'Zulu', published: '2026-11-05' });
    const a = rec({ slug: 'a', name: 'Alpha', published: '2026-11-05' });
    expect(recentActivity([z, a]).map((x) => x.slug)).toEqual(['a', 'z']);
    expect(recentActivity([a, z]).map((x) => x.slug)).toEqual(['a', 'z']);
  });
});

describe('recentActivity reasons', () => {
  it('carries the reason for a change and folds a publication-day change into the new verdict', () => {
    const a = rec({
      changes: [
        { date: '2026-11-01', placement: 'Edge', from_tier: 1, to_tier: 2, reason: 'same day', source_url: 'x' },
        { date: '2026-11-04', placement: 'Edge', from_tier: 3, to_tier: 2, reason: 'Now exploited.', source_url: 'x' }
      ]
    });
    expect(recentActivity([a]).map((x) => [x.date, x.kind, x.reason])).toEqual([
      ['2026-11-04', 'moved', 'Now exploited.'],
      ['2026-11-01', 'new', undefined]
    ]);
  });
});

describe('fixTitle', () => {
  it('gives the first fix mitigation title, skipping stopgaps, or undefined', () => {
    const r = rec({ mitigations: [{ role: 'stopgap', title: 'Block it' }, { role: 'fix', title: 'Patch it' }, { role: 'fix', title: 'Other' }] });
    expect(fixTitle(r)).toBe('Patch it');
    expect(fixTitle(rec({ mitigations: [{ role: 'stopgap', title: 'Block it' }] }))).toBeUndefined();
  });
});

describe('lastTierMove', () => {
  it('gives the latest tier move only when it is after publication', () => {
    const r = rec({ changes: [
      { date: '2026-11-03', from_tier: 3, to_tier: 2 },
      { date: '2026-11-09', from_tier: 2, to_tier: 3 },
      { date: '2026-11-12' }
    ] });
    expect(lastTierMove(r)).toEqual({ date: '2026-11-09', from: 2, to: 3 });
    expect(lastTierMove(rec({ changes: [{ date: '2026-11-01', from_tier: 1, to_tier: 2 }] }))).toBeUndefined();
    expect(lastTierMove(rec({}))).toBeUndefined();
  });
});
