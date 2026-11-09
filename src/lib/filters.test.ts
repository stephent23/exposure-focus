import { describe, it, expect } from 'vitest';
import { matchesFilters, type CardData } from './filters';

const card: CardData = { text: 'log4shell cve-2021-44228', tiers: '1 3', kind: 'rce' };
const none = { text: '', tiers: [], kind: '' };

describe('matchesFilters', () => {
  it('matches everything when no filter is set', () => {
    expect(matchesFilters(card, none)).toBe(true);
  });
  it('matches text case-insensitively as a substring, trimmed', () => {
    expect(matchesFilters(card, { ...none, text: '  LOG4' })).toBe(true);
    expect(matchesFilters(card, { ...none, text: 'heartbleed' })).toBe(false);
  });
  it('matches when any selected tier is present, whole numbers only', () => {
    expect(matchesFilters(card, { ...none, tiers: ['3'] })).toBe(true);
    expect(matchesFilters(card, { ...none, tiers: ['2', '1'] })).toBe(true);
    expect(matchesFilters(card, { ...none, tiers: ['2'] })).toBe(false);
    expect(matchesFilters({ ...card, tiers: '12' }, { ...none, tiers: ['1'] })).toBe(false);
  });
  it('matches kind exactly', () => {
    expect(matchesFilters(card, { ...none, kind: 'rce' })).toBe(true);
    expect(matchesFilters(card, { ...none, kind: 'dos' })).toBe(false);
  });
  it('requires all filters together', () => {
    expect(matchesFilters(card, { text: 'log4', tiers: ['2'], kind: 'rce' })).toBe(false);
  });
});
