import { describe, it, expect } from 'vitest';
import type { RecordEntry } from '../schema/record';
import { freshness, groupForHome, lastChanged, recentActivity } from './home';

function fake(slug: string, tier: number, status: 'draft' | 'published' | 'retired' = 'published'): RecordEntry {
  return { slug, status, placements: [{ tier }] } as unknown as RecordEntry;
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
