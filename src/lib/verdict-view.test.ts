import { describe, expect, it } from 'vitest';

import { changeHeadline, effectByWay, guideLabel, isPlaceholder, letter, niceDate, sortedChanges, sortedTimeline } from './verdict-view';

describe('verdict view helpers', () => {
  it('letters ways in from A', () => {
    expect([0, 1, 25].map(letter)).toEqual(['A', 'B', 'Z']);
  });

  it('spots owner placeholders', () => {
    expect(isPlaceholder('[link to add]')).toBe(true);
    expect(isPlaceholder('Patch PHP')).toBe(false);
  });

  it('writes dates the way people read them', () => {
    expect(niceDate('2026-10-05')).toBe('5 Oct 2026');
    expect(niceDate('2026-12-31')).toBe('31 Dec 2026');
  });

  it('orders key dates oldest first, then by time', () => {
    const t = (date: string, time?: string) => ({ event: 'e', date, time, source_url: '[link to add]', confidence: 'reported' as const });
    expect(sortedTimeline([t('2026-10-29'), t('2026-10-28', '19:15'), t('2026-10-28')]).map((x) => `${x.date} ${x.time ?? ''}`)).toEqual([
      '2026-10-28 ',
      '2026-10-28 19:15',
      '2026-10-29 '
    ]);
    expect(sortedTimeline(undefined)).toEqual([]);
  });

  it('lists what an option does to each way in, always in letter order', () => {
    const vectors = ['Memory corruption', 'Stale state', 'Upload path'];
    const ways = effectByWay(vectors, [
      { vector: 'Stale state', status: 'weaker' },
      { vector: 'Upload path', status: 'closed_for_that_app' },
      { vector: 'Memory corruption', status: 'open' }
    ]);
    expect(ways).toEqual([
      { letter: 'A', status: 'open', label: 'Left open' },
      { letter: 'B', status: 'weaker', label: 'Partial mitigation' },
      { letter: 'C', status: 'closed_for_that_app', label: 'Closed for that app' }
    ]);
  });

  it('names the source of a guide, and only calls vendor or authority pages official', () => {
    expect(guideLabel('https://aws.amazon.com/security/x')).toBe('AWS official guidance');
    expect(guideLabel('https://developers.cloudflare.com/waf/')).toBe('Cloudflare official guidance');
    expect(guideLabel('https://access.redhat.com/security/x')).toBe('Red Hat official guidance');
    expect(guideLabel('https://www.cisa.gov/x')).toBe('CISA official guidance');
    expect(guideLabel('https://www.akamai.com/blog/x')).toBe('Akamai write-up (not official)');
    expect(guideLabel('https://www.bleepingcomputer.com/news/x')).toBe('BleepingComputer report (not official)');
    expect(guideLabel('https://example.org/x')).toBe('example.org (source not checked)');
  });
});

describe('sortedChanges', () => {
  it('puts the newest change first and keeps file order on the same day', () => {
    const c = (date: string, reason: string) => ({ date, reason, source_url: '[link to add]' });
    expect(sortedChanges([c('2026-10-01', 'a'), c('2026-11-01', 'b'), c('2026-11-01', 'c')]).map((x) => x.reason)).toEqual(['b', 'c', 'a']);
    expect(sortedChanges(undefined)).toEqual([]);
  });

  it('describes a tier move in words', () => {
    expect(changeHeadline({ date: '2026-11-01', placement: 'Edge', from_tier: 3, to_tier: 1, reason: 'r', source_url: 'x' })).toBe(
      'Edge: Tier 3 (Prioritised) to Tier 1 (Emergency)'
    );
    expect(changeHeadline({ date: '2026-11-01', reason: 'r', source_url: 'x' })).toBeNull();
  });
});
