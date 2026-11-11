import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { getAllRecords } from '../src/lib/records';
import { headlineTier, TIMEFRAME } from '../src/schema/record';

const dist = join(process.cwd(), 'dist-test');
const read = (...p: string[]) => readFileSync(join(dist, ...p), 'utf-8');
const files = (dir = dist): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
const count = (s: string, needle: string) => s.split(needle).length - 1;
const text = (html: string) =>
  html.replace(/<(script|style)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->|<[^>]+>/gi, ' ').replace(/\s+/g, ' ');
const external = (url: string) => /^(?:https?:)?\/\//i.test(url.trim());

const records = await getAllRecords();
const published = records.filter((r) => r.status === 'published');
const listed = published.filter((r) => headlineTier(r) !== 4);
const pages = files().filter((f) => f.endsWith('.html'));
const home = read('index.html');
const recordPage = (slug: string) => read('verdicts', slug, 'index.html');

describe('built site', () => {
  it('lists every published non-Tier-4 record on the home page exactly once, and no others', () => {
    expect(listed.length).toBeGreaterThan(0);
    for (const r of records) expect(count(home, `data-record="${r.slug}"`), r.slug).toBe(listed.includes(r) ? 1 : 0);
    expect(count(home, 'data-record="')).toBe(listed.length);
  });

  it('shows key dates, oldest first, each with its source, only where a record has them', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      expect(html.includes('id="dates-heading"'), `${r.slug} dates section`).toBe(Boolean(r.timeline?.length));
      if (!r.timeline) continue;
      const shown = [...html.matchAll(/<time datetime="([^"]+)"/g)].map((m) => m[1].slice(0, 10));
      expect(shown, `${r.slug} order`).toEqual(r.timeline.map((t) => t.date).sort());
      expect(count(html, 'class="date-row"'), `${r.slug} rows`).toBe(r.timeline.length);
    }
  });

  it('renders the required sections on every record page', () => {
    const ids = ['placement', 'evidence', 'protect', 'sources'];
    for (const r of published) {
      const html = recordPage(r.slug);
      for (const id of ids) expect(html, `${r.slug} ${id}`).toContain(`id="${id}-heading"`);
      expect(count(html, 'id="leadership-heading"'), `${r.slug} leadership`).toBe(1);
      expect(count(html, 'id="applies-heading"'), `${r.slug} applies`).toBe(1);
      expect(html.includes('id="analysis-heading"'), `${r.slug} analysis`).toBe(Boolean(r.analysis));
      expect(html.includes('id="hit-heading"'), `${r.slug} hit`).toBe(Boolean(r.were_you_hit));
    }
  });

  it('keeps the decision visible and folds supporting detail away on record pages', () => {
    const folded = (html: string, id: string) => new RegExp(`<details[^>]*>\\s*<summary[^>]*>\\s*<h2[^>]*id="${id}-heading"`).test(html);
    for (const r of published) {
      const html = recordPage(r.slug);
      for (const id of ['placement', 'applies', 'protect']) expect(folded(html, id), `${r.slug} ${id} visible`).toBe(false);
      for (const id of ['evidence', 'sources']) expect(folded(html, id), `${r.slug} ${id} folded`).toBe(true);
      expect(count(html, 'class="reasoning"'), `${r.slug} reasoning`).toBe(r.placements.length);
      expect(count(html, 'class="opt-more"'), `${r.slug} mitigation detail`).toBe(r.mitigations.length);
    }
  });

  it('shows "Overdue for review" on the home card and record page of every listed record', () => {
    for (const r of listed) {
      const start = home.indexOf(`data-record="${r.slug}"`);
      expect(home.slice(start, home.indexOf('</article>', start)), `${r.slug} card`).toContain('Overdue for review');
      expect(text(recordPage(r.slug)), `${r.slug} page`).toContain('Overdue for review');
    }
  });

  it('has no hour or day counts in visible text', () => {
    for (const f of pages) expect(TIMEFRAME.exec(text(readFileSync(f, 'utf-8')))?.[0], f).toBeUndefined();
  });

  it('makes no third-party requests', () => {
    const bad: string[] = [];
    for (const f of files().filter((f) => /\.(html|css)$/.test(f))) {
      const src = readFileSync(f, 'utf-8');
      for (const m of src.matchAll(/<(?:script|img|iframe|source)\b[^>]*?\ssrc\s*=\s*["']?([^"'\s>]+)/gi)) if (external(m[1])) bad.push(`${f} ${m[1]}`);
      for (const m of src.matchAll(/<link\b[^>]*?\shref\s*=\s*["']?([^"'\s>]+)/gi)) if (external(m[1])) bad.push(`${f} ${m[1]}`);
      for (const m of src.matchAll(/@import\s+(?:url\(\s*)?["']?([^"')\s;]+)|url\(\s*["']?([^"')]+)/gi)) if (external(m[1] ?? m[2])) bad.push(`${f} ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });

  it('has internal links that all resolve', () => {
    const all = new Set(files().map((f) => f.slice(dist.length).split(sep).join('/')));
    const broken: string[] = [];
    for (const f of pages) {
      for (const m of readFileSync(f, 'utf-8').matchAll(/<a\b[^>]*?\shref\s*=\s*["']([^"']+)["']/gi)) {
        if (!m[1].startsWith('/') || m[1].startsWith('//')) continue;
        const path = decodeURIComponent(m[1].split(/[?#]/)[0]);
        if (!all.has(path) && !all.has(path.replace(/\/?$/, '/index.html'))) broken.push(`${f} -> ${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('is compatible with the Content-Security-Policy: no inline script, style or event handler', () => {
    const problems: string[] = [];
    for (const f of pages) {
      const html = readFileSync(f, 'utf-8').replace(/<!--[\s\S]*?-->/g, '');
      if ([...html.matchAll(/<script\b([^>]*)>/gi)].some((m) => !/\bsrc\s*=/i.test(m[1]))) problems.push(`${f}: <script> without src`);
      if (/<style\b/i.test(html)) problems.push(`${f}: <style> tag`);
      if (/\sstyle\s*=/i.test(html)) problems.push(`${f}: style attribute`);
      if (/\son[a-z]+\s*=\s*["']/i.test(html)) problems.push(`${f}: inline event handler`);
    }
    expect(problems).toEqual([]);
  });

  it('ships a Content-Security-Policy without unsafe-inline or unsafe-eval', () => {
    const csp = readFileSync('public/_headers', 'utf-8').split('\n').find((l) => /^\s*Content-Security-Policy:/i.test(l));
    expect(csp).toBeDefined();
    expect(csp).not.toMatch(/'unsafe-(inline|eval)'/);
    expect(csp).toMatch(/script-src 'self'(;|$)/);
    expect(csp).toMatch(/style-src 'self'(;|$)/);
  });

  it('shows the change log, newest first, only where a record has one', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      expect(html.includes('id="changes-heading"'), `${r.slug} changes section`).toBe(Boolean(r.changes?.length));
      expect(count(html, 'class="change"'), `${r.slug} change rows`).toBe(r.changes?.length ?? 0);
      if (!r.changes) continue;
      const section = html.slice(html.indexOf('id="changes-heading"'));
      const shown = [...section.matchAll(/class="change"[^]*?<time datetime="([^"]+)"/g)].map((m) => m[1]);
      expect(shown, `${r.slug} order`).toEqual(r.changes.map((c) => c.date).sort().reverse());
    }
  });

  it('never speaks as "we" in visible text or the feed', () => {
    // URLs are left out: paths such as /en/us/ are not speech.
    const firstPerson = (s: string) => /\b(?:[Ww]e|[Oo]urs?|[Oo]urselves|us)\b/.exec(s.replace(/https?:\/\/\S+/g, ' '))?.[0];
    for (const f of pages) expect(firstPerson(text(readFileSync(f, 'utf-8'))), f).toBeUndefined();
    expect(firstPerson(read('feed.xml').replace(/<[^>]+>/g, ' '))).toBeUndefined();
  });

  it('has a feed with one entry per published record and one per change', () => {
    const xml = read('feed.xml');
    expect(count(xml, '<entry>')).toBe(published.reduce((n, r) => n + 1 + (r.changes?.length ?? 0), 0));
    for (const r of records.filter((x) => x.status !== 'published')) expect(xml).not.toContain(`/verdicts/${r.slug}/`);
  });
});
