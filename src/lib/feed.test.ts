import { describe, expect, it } from 'vitest';

import type { RecordEntry } from '../schema/record';
import { buildFeed } from './feed';

function rec(over: Partial<RecordEntry> = {}): RecordEntry {
  return {
    slug: 'alpha',
    name: 'Alpha',
    status: 'published',
    summary: 'Now exploited in the wild.',
    evidence_as_of: '2026-11-09',
    placements: [{ name: 'Main', facts: {}, why: ['x'], tier: 1, action: 'Act' }],
    evidence: [{ label: 'L', text: 'T', as_of: '2026-11-09', source_url: '[link to add]', confidence: 'vendor-stated' }],
    ...over
  } as RecordEntry;
}

const SITE = 'https://feeds.test/base/';

/** A tiny well-formedness check: balanced tags, no raw ampersands or angle brackets in text. */
function assertWellFormed(xml: string) {
  expect(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
  const body = xml.replace(/^<\?xml[^>]*\?>/, '');
  const stack: string[] = [];
  const re = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>|([^<]+)/g;
  let consumed = 0;
  for (const m of body.matchAll(re)) {
    expect(m.index).toBe(consumed);
    consumed += m[0].length;
    if (m[5] !== undefined) {
      expect(m[5]).not.toMatch(/&(?!(?:amp|lt|gt|quot|apos|#\d+);)/);
      expect(m[5]).not.toMatch(/>/);
      continue;
    }
    if (m[4]) continue;
    if (m[1]) expect(stack.pop()).toBe(m[2]);
    else stack.push(m[2]);
  }
  expect(consumed).toBe(body.length);
  expect(stack).toEqual([]);
  // eslint-disable-next-line no-control-regex
  expect(xml).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/);
}

const entries = (xml: string) => [...xml.matchAll(/<entry>[\s\S]*?<\/entry>/g)].map((m) => m[0]);

describe('buildFeed', () => {
  it('produces well-formed Atom with one entry per published record', () => {
    const xml = buildFeed([rec()], SITE);
    assertWellFormed(xml);
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(entries(xml)).toHaveLength(1);
    expect(xml).toContain('<name>Exposure Focus</name>');
  });

  it('orders entries newest first and sets feed updated to the newest date', () => {
    const xml = buildFeed([rec(), rec({ slug: 'beta', name: 'Beta', evidence_as_of: '2026-10-15' })], SITE);
    const dates = entries(xml).map((e) => e.match(/<updated>([^<]+)</)![1]);
    expect(dates).toEqual(['2026-11-09T00:00:00Z', '2026-10-15T00:00:00Z']);
    expect(xml.match(/<\/title>\s*(?:<subtitle>[^]*?<\/subtitle>\s*)?<updated>([^<]+)</)![1]).toBe('2026-11-09T00:00:00Z');
  });

  it('gives unique ids that are stable across runs and independent of the site URL', () => {
    const ids = (x: string) => [...x.matchAll(/<id>([^<]+)<\/id>/g)].map((m) => m[1]);
    const a = ids(buildFeed([rec()], SITE));
    const b = ids(buildFeed([rec()], 'https://other.test/'));
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
    expect(a).toContain('tag:exposure-focus,2026:alpha');
  });

  it('excludes draft and retired records', () => {
    const xml = buildFeed([rec({ slug: 'd', name: 'Drafty', status: 'draft' }), rec({ slug: 'r', name: 'Retiry', status: 'retired' }), rec()], SITE);
    expect(xml).not.toContain('Drafty');
    expect(xml).not.toContain('Retiry');
    expect(entries(xml)).toHaveLength(1);
  });

  it('uses the given base URL for every link', () => {
    for (const base of ['https://feeds.test/base/', 'https://a.example.org', 'http://localhost:4321/']) {
      const xml = buildFeed([rec()], base);
      const origin = new URL(base).origin;
      const hrefs = [...xml.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      expect(hrefs.length).toBeGreaterThanOrEqual(3);
      for (const h of hrefs) expect(h.startsWith(origin)).toBe(true);
      expect(hrefs).toContain(new URL('verdicts/alpha/', base.endsWith('/') ? base : base + '/').href);
      expect(hrefs).toContain(new URL('feed.xml', base.endsWith('/') ? base : base + '/').href);
    }
  });

  it('escapes & < > " \' in names and summaries', () => {
    const xml = buildFeed(
      [rec({ name: 'AT&T <b>"x"</b> \'y\'', summary: 'A & B a<script>&"q"\'' })],
      SITE
    );
    assertWellFormed(xml);
    expect(xml).toContain('AT&amp;T &lt;b&gt;&quot;x&quot;&lt;/b&gt; &apos;y&apos;');
    expect(xml).toContain('A &amp; B');
    expect(xml).not.toContain('<script>');
    expect(xml).not.toContain('<b>');
  });

  it('strips characters that are invalid in XML 1.0', () => {
    const xml = buildFeed([rec({ name: 'Bad\u0000\u0008name\u000B\uFFFE', summary: 'ok\u001Fok tab\there\u0007' })], SITE);
    assertWellFormed(xml);
    expect(xml).toContain('Badname');
    expect(xml).toContain('okok');
    expect(xml).toContain('tab\there');
  });

  it('puts the summary, current tier name and evidence date in the entry', () => {
    const xml = buildFeed([rec()], SITE);
    const first = entries(xml)[0];
    expect(first).toContain('<title>Alpha</title>');
    expect(first).toMatch(/<summary type="text">[^]*Now exploited in the wild\.[^]*Emergency[^]*Evidence as of 2026-11-09[^]*<\/summary>/);
    expect(first).not.toContain('not yet confirmed');
  });

  it('says so when any evidence is only reported', () => {
    const r = rec({ evidence: [{ label: 'L', text: 'T', as_of: '2026-11-09', source_url: '[link to add]', confidence: 'reported' }] });
    for (const e of entries(buildFeed([r], SITE))) expect(e).toContain('Some facts are not yet confirmed.');
  });

  it('is a valid empty feed when nothing is published', () => {
    assertWellFormed(buildFeed([], SITE));
  });
});
