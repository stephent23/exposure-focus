import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { recentActivity } from '../src/lib/home';
import { getAllRecords } from '../src/lib/records';
import { coverageLine, keyFacts } from '../src/lib/verdict-view';
import { headlineTier, TIMEFRAME } from '../src/schema/record';

const dist = join(process.cwd(), 'dist-test');
const read = (...p: string[]) => readFileSync(join(dist, ...p), 'utf-8');
const files = (dir = dist): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
const count = (s: string, needle: string) => s.split(needle).length - 1;
const text = (html: string) =>
  html.replace(/<(script|style)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->|<[^>]+>/gi, ' ').replace(/\s+/g, ' ');
const external = (url: string) => /^(?:https?:)?\/\//i.test(url.trim());
// Astro escapes & < > and quotes; decode them so text from the page can be compared with record data.
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const plain = (html: string) => decode(text(html)).replace(/\s+/g, ' ');
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
// Details are never nested on a record page, so a lazy match removes each folded block whole.
const withoutDetails = (html: string) => html.replace(/<details\b[\s\S]*?<\/details>/gi, ' ');
// The record body: from the record wrapper to the end of main.
const recordBody = (html: string) => {
  const start = html.indexOf('class="record"');
  const end = html.indexOf('</main>', start);
  return html.slice(start, end === -1 ? undefined : end);
};
// The page is a dashboard, not a report: the main column, without opening a fold, must stay short.
// The key-dates list beside it is counted separately: at most eight dated events.
const VISIBLE_WORD_BUDGET = 450;
// A home card shows badges, a name, a summary and placement rows only.
const CARD_WORD_BUDGET = 90;

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
      // Only the key-dates list: the change log on the same page has its own <time> elements.
      const shown = [...html.matchAll(/class="date-row"[^>]*>\s*<time datetime="([^"]+)"/g)].map((m) => m[1].slice(0, 10));
      expect(shown, `${r.slug} order`).toEqual(r.timeline.map((t) => t.date).sort());
      expect(count(html, 'class="date-row"'), `${r.slug} rows`).toBe(r.timeline.length);
    }
  });

  it('renders the required sections on every record page', () => {
    const ids = ['placement', 'applies', 'leadership', 'protect', 'evidence', 'sources'];
    for (const r of published) {
      const html = recordPage(r.slug);
      for (const id of ids) expect(count(html, `id="${id}-heading"`), `${r.slug} ${id}`).toBe(1);
      expect(html.includes('id="analysis-heading"'), `${r.slug} analysis`).toBe(Boolean(r.analysis));
      expect(html.includes('id="hit-heading"'), `${r.slug} hit`).toBe(Boolean(r.were_you_hit));
    }
  });

  it('keeps the decision visible and folds supporting detail away on record pages', () => {
    const folded = (html: string, id: string) => new RegExp(`<details[^>]*>\\s*<summary[^>]*>\\s*<h2[^>]*id="${id}-heading"`).test(html);
    for (const r of published) {
      const html = recordPage(r.slug);
      for (const id of ['leadership', 'applies', 'placement', 'protect']) expect(folded(html, id), `${r.slug} ${id} visible`).toBe(false);
      const foldedIds = ['evidence', 'sources'];
      if (r.timeline?.length) expect(folded(html, 'dates'), `${r.slug} key dates visible`).toBe(false);
      if (r.changes?.length) foldedIds.push('changes');
      if (r.were_you_hit) foldedIds.push('hit');
      if (r.analysis) foldedIds.push('analysis');
      for (const id of foldedIds) expect(folded(html, id), `${r.slug} ${id} folded`).toBe(true);
      expect(count(html, 'class="reasoning"'), `${r.slug} reasoning`).toBe(r.placements.length);
      expect(count(html, 'class="opt-more"'), `${r.slug} mitigation detail`).toBe(r.mitigations.length);
    }
  });

  it('keeps the visible text of a record page within the word budget', () => {
    for (const r of published) {
      const visible = plain(withoutDetails(recordBody(recordPage(r.slug))).replace(/<aside[\s\S]*?<\/aside>/g, ' '));
      expect(r.timeline?.length ?? 0, `${r.slug} key dates`).toBeLessThanOrEqual(8);
      expect(words(visible), `${r.slug} visible words`).toBeLessThanOrEqual(VISIBLE_WORD_BUDGET);
    }
  });

  it('never nests <details> on a record page', () => {
    for (const r of published) {
      let depth = 0;
      let max = 0;
      for (const m of recordPage(r.slug).matchAll(/<(\/?)details\b/gi)) {
        depth += m[1] ? -1 : 1;
        max = Math.max(max, depth);
      }
      expect(depth, `${r.slug} balanced`).toBe(0);
      expect(max, `${r.slug} nesting`).toBeLessThanOrEqual(1);
    }
  });

  it('shows four key facts, derived from the record', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      expect(html.match(/class="keyfact[ "]/g)?.length ?? 0, `${r.slug} key fact blocks`).toBe(4);
      const shown = plain(html);
      for (const f of keyFacts(r)) {
        expect(shown, `${r.slug} label ${f.label}`).toContain(f.label);
        expect(shown, `${r.slug} value ${f.label}`).toContain(f.value);
      }
    }
  });

  it('lists every affected product in the affected table, and says when there is no fix', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      expect(count(html, 'class="affected-row"'), `${r.slug} affected rows`).toBe(r.affected.length);
      const shown = plain(html);
      for (const a of r.affected) expect(shown, `${r.slug} ${a.product}`).toContain(a.product);
      const noFix = r.affected.filter((a) => !a.fixed).length;
      expect(count(shown, 'No fix yet'), `${r.slug} no-fix rows`).toBeGreaterThanOrEqual(noFix);
    }
  });

  it('shows one coverage line per mitigation outside the folds', () => {
    for (const r of published) {
      const visible = plain(withoutDetails(recordBody(recordPage(r.slug))));
      for (const m of r.mitigations) expect(visible, `${r.slug} ${m.title}`).toContain(coverageLine(r.vectors, m.effect));
    }
  });

  it('has no sidebar and no "On this page" list', () => {
    for (const f of pages) {
      const html = readFileSync(f, 'utf-8');
      expect(html, f).not.toContain('class="sidebar"');
      expect(text(html), f).not.toContain('On this page');
    }
  });

  it('keeps home cards short and free of action lines', () => {
    expect(home).not.toContain('class="todo"');
    const cards = [...home.matchAll(/<article\b[^>]*\bclass="[^"]*\bcard\b[^"]*"[^>]*>[\s\S]*?<\/article>/g)].map((m) => m[0]);
    expect(cards.length).toBe(listed.length);
    for (const card of cards) {
      expect(card).not.toContain('class="todo"');
      expect(words(plain(card)), card.slice(0, 80)).toBeLessThanOrEqual(CARD_WORD_BUDGET);
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

  it('leads the home page with the latest changes and dates every card', () => {
    const activity = recentActivity(listed);
    expect(count(home, 'class="activity-row"')).toBe(activity.length);
    expect(home.indexOf('id="activity-heading"')).toBeLessThan(home.indexOf('data-record="'));
    for (const a of activity) expect(home, a.slug).toContain(`<time datetime="${a.date}">`);
    for (const r of listed) {
      const start = home.indexOf(`data-record="${r.slug}"`);
      expect(home.slice(start, home.indexOf('</article>', start)), `${r.slug} added date`).toContain(`<time datetime="${r.published}">`);
    }
  });

  it('shows when each verdict was published and last checked', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      for (const d of [r.published, r.evidence_as_of, r.review_until]) expect(html, `${r.slug} ${d}`).toContain(`<time datetime="${d}">`);
    }
  });
});
