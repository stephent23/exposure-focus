import { describe, it, expect } from 'vitest';
import type { RecordEntry } from '../schema/record';
import { groupForHome } from './home';

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
