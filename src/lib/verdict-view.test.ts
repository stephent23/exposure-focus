import { describe, expect, it } from 'vitest';

import type { RecordEntry } from '../schema/record';
import { changeHeadline, coverageLine, effectByWay, keyFacts, guideLabel, isPlaceholder, letter, niceDate, sortedChanges, sortedTimeline } from './verdict-view';

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

type Facts = Record<string, boolean>;
const rec = (placements: Facts[], affected: { fixed?: string; vulnerable?: string }[]) =>
  ({
    placements: placements.map((facts) => ({ facts })),
    affected: affected.map((a) => ({ product: 'P', vulnerable: 'below 1', ...a }))
  }) as unknown as RecordEntry;
const fact = (r: RecordEntry, label: string) => keyFacts(r).find((f) => f.label === label)!;

describe('keyFacts', () => {
  it('always returns the four facts in order', () => {
    expect(keyFacts(rec([{}], [{}])).map((f) => f.label)).toEqual(['Exploited in attacks', 'Public exploit', 'Login needed', 'Fix']);
  });

  it('reads exploited and public exploit from any placement', () => {
    expect(fact(rec([{}, { exploited: true }], [{}]), 'Exploited in attacks')).toMatchObject({ value: 'Yes', tone: 'bad' });
    expect(fact(rec([{ exploited: false }], [{}]), 'Exploited in attacks')).toMatchObject({ value: 'Not known', tone: 'unknown' });
    expect(fact(rec([{}, { public_exploit: true }], [{}]), 'Public exploit')).toMatchObject({ value: 'Yes', tone: 'bad' });
    expect(fact(rec([{}], [{}]), 'Public exploit')).toMatchObject({ value: 'Not known', tone: 'unknown' });
  });

  it('reads login from the headline placement only', () => {
    expect(fact(rec([{ no_login: true }], [{}]), 'Login needed')).toMatchObject({ value: 'No', tone: 'bad' });
    expect(fact(rec([{ requires_login: true }], [{}]), 'Login needed')).toMatchObject({ value: 'Yes', tone: 'ok' });
    expect(fact(rec([{}, { no_login: true }], [{}]), 'Login needed')).toMatchObject({ value: 'Not stated', tone: 'unknown' });
  });

  it('summarises the fix across affected rows', () => {
    expect(fact(rec([{}], [{ fixed: '1.2' }, { fixed: '2.3' }]), 'Fix')).toMatchObject({ value: 'Available', tone: 'ok' });
    expect(fact(rec([{}], [{ fixed: '1.2' }, {}]), 'Fix')).toMatchObject({ value: 'Partial', tone: 'bad' });
    expect(fact(rec([{}], [{}]), 'Fix')).toMatchObject({ value: 'None yet', tone: 'bad' });
    expect(fact(rec([{}], [{ fixed: '[fix to confirm]' }]), 'Fix')).toMatchObject({ value: 'To confirm', tone: 'unknown' });
    expect(fact(rec([{}], [{ fixed: '1.2', vulnerable: '[versions to confirm]' }]), 'Fix')).toMatchObject({ value: 'Available', tone: 'ok' });
  });
});

describe('coverageLine', () => {
  type S = 'closed' | 'closed_for_that_app' | 'open' | 'weaker';
  const v = ['a', 'b', 'c'];
  const e = (...s: S[]) => s.map((status, i) => ({ vector: v[i], status }));

  it('says all ways in are closed', () => {
    expect(coverageLine(v, e('closed', 'closed_for_that_app', 'closed'))).toBe('Closes all 3 ways in');
    expect(coverageLine(['a'], e('closed'))).toBe('Closes the one way in');
  });

  it('counts closed, partial and open parts', () => {
    expect(coverageLine(v, e('closed', 'closed', 'open'))).toBe('Closes 2 of 3 ways in · 1 left open');
    expect(coverageLine(v, e('closed', 'weaker', 'open'))).toBe('Closes 1 of 3 ways in · partial for 1 · 1 left open');
    expect(coverageLine(v, e('closed', 'closed', 'weaker'))).toBe('Closes 2 of 3 ways in · partial for 1');
  });

  it('starts with a capital when nothing is closed', () => {
    expect(coverageLine(v, e('weaker', 'weaker', 'weaker'))).toBe('Partial for 3 of 3 ways in');
    expect(coverageLine(v, e('weaker', 'open', 'open'))).toBe('Partial for 1 of 3 ways in · 2 left open');
    expect(coverageLine(v, e('open', 'open', 'open'))).toBe('Leaves all 3 ways in open');
  });

  it('treats a way in with no effect entry as open, and uses the singular for one', () => {
    expect(coverageLine(v, e('closed'))).toBe('Closes 1 of 3 ways in · 2 left open');
    expect(coverageLine(['a'], [])).toBe('Leaves the one way in open');
    expect(coverageLine(['a'], e('weaker'))).toBe('Partial for 1 of 1 way in');
  });
});
