import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { recentActivity } from '../src/lib/home';
import { getWatching } from '../src/lib/watching';
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
// 520 leaves room for the "why this tier" and "what would change it" lines (up to about 90 words together).
// The key-dates list beside it is counted separately: at most eight dated events.
const VISIBLE_WORD_BUDGET = 520;
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
      const rated = r.placements.filter((p) => p.tier <= 3);
      const routine = r.placements.filter((p) => p.tier === 4);
      expect(count(html, 'class="reasoning"'), `${r.slug} reasoning`).toBe(rated.length);
      expect(count(html, 'class="routine-rest"'), `${r.slug} routine line`).toBe(routine.length ? 1 : 0);
      if (routine.length) {
        const line = html.slice(html.indexOf('class="routine-rest"'));
        const shown = plain(line.slice(0, line.indexOf('</p>')));
        for (const p of routine) expect(shown, `${r.slug} routine ${p.name}`).toContain(p.name);
      }
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

  // The test build date is 2099, so every record is past review (stale visible) and nothing is fresh (fresh hidden).
  const spans = (html: string, cls: string) =>
    [...html.matchAll(new RegExp(`<span\\b[^>]*\\bclass="[^"]*\\b${cls}\\b[^"]*"[^>]*>`, 'g'))].map((m) => m[0]);
  const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
  const hidden = (tag: string) => /\shidden(?:[\s=>]|$)/.test(tag);
  const card = (slug: string) => {
    const start = home.indexOf(`data-record="${slug}"`);
    return home.slice(start, home.indexOf('</article>', start));
  };

  it('shows "Overdue for review" on the home card and record page of every listed record', () => {
    for (const r of listed) {
      for (const [where, html] of [['card', card(r.slug)], ['page', recordBody(recordPage(r.slug))]] as const) {
        const stale = spans(html, 'tag-stale');
        expect(stale.length, `${r.slug} ${where} stale span`).toBe(1);
        expect(hidden(stale[0]), `${r.slug} ${where} stale visible`).toBe(false);
        expect(attr(stale[0], 'data-review-until'), `${r.slug} ${where} review date`).toBe(r.review_until);
        expect(text(html), `${r.slug} ${where}`).toContain('Overdue for review');
      }
    }
  });

  // The New and Changed flag lives on home cards only. A change on the publication day is part of the new verdict.
  it('renders the freshness markup on every home card, hidden when nothing is fresh', () => {
    for (const r of listed) {
      const latest = (r.changes ?? []).map((c) => c.date).sort().at(-1);
      const last = latest && latest > r.published ? latest : undefined;
      for (const [where, html] of [['card', card(r.slug)]] as const) {
        const fresh = spans(html, 'fresh');
        expect(fresh.length, `${r.slug} ${where} fresh span`).toBe(1);
        expect(hidden(fresh[0]), `${r.slug} ${where} fresh hidden`).toBe(true);
        expect(attr(fresh[0], 'data-published'), `${r.slug} ${where} published`).toBe(r.published);
        expect(attr(fresh[0], 'data-changed'), `${r.slug} ${where} changed`).toBe(last);
      }
    }
  });

  it('puts the tier reason, triggers and leadership quote in the briefing, not the summary header', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      const start = html.indexOf('id="leadership-heading"');
      const briefing = plain(html.slice(start, html.indexOf('id="applies-heading"', start)));
      expect(briefing, `${r.slug} tier reason`).toContain(r.tier_reason);
      for (const w of r.would_change) expect(briefing, `${r.slug} trigger`).toContain(w);
      expect(briefing, `${r.slug} quote`).toContain(r.leadership_quote);
      const header = /<header\b[^>]*class="[^"]*\bsummary\b[^"]*"[\s\S]*?<\/header>/.exec(html)?.[0] ?? '';
      expect(header, `${r.slug} summary header`).not.toBe('');
      expect(plain(header), `${r.slug} header repeats the reason`).not.toContain(r.tier_reason);
    }
  });

  it('has one section nav on each verdict page, linking five sections that exist', () => {
    const expected = ['leadership', 'applies', 'placement', 'protect', 'evidence'].map((id) => `#${id}-heading`);
    for (const r of published) {
      const html = recordPage(r.slug);
      expect(count(html, 'class="section-nav"'), `${r.slug} nav count`).toBe(1);
      const nav = /<nav\b[^>]*class="section-nav"[\s\S]*?<\/nav>/.exec(html)?.[0] ?? '';
      expect(nav).toContain('aria-label="Sections"');
      const hrefs = [...nav.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => m[1]);
      expect(hrefs, `${r.slug} nav links`).toEqual(expected);
      for (const h of hrefs) expect(count(html, `id="${h.slice(1)}"`), `${r.slug} ${h}`).toBe(1);
    }
  });

  it('collapses Tier 4 placements into one routine line and lists no other Tier 4 rows', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      const rows = [...html.matchAll(/<li\b[^>]*class="place (t\d)"/g)].map((m) => m[1]);
      expect(rows.length, `${r.slug} placement rows`).toBe(r.placements.filter((p) => p.tier <= 3).length);
      expect(rows, `${r.slug} no t4 rows`).not.toContain('t4');
    }
  });

  it('keeps the home latest-changes list short, and keeps every reason on the page', () => {
    expect(count(home, 'class="activity-row"')).toBeLessThanOrEqual(5);
    expect(count(home, 'class="activity-row"')).toBe(Math.min(5, recentActivity(listed).length));
    for (const a of recentActivity(listed).slice(0, 5)) if (a.reason) expect(plain(home), a.slug).toContain(a.reason);
  });

  it('shows no tier or attack filters on the home page while there are 15 or fewer verdicts', () => {
    if (listed.length > 15) return;
    expect(home).not.toMatch(/<input\b[^>]*type="checkbox"/);
    expect(home).not.toMatch(/<select\b/);
  });

  it('puts no tier badge in a home band header', () => {
    const bands = [...home.matchAll(/<header\b[^>]*class="[^"]*\bband[^"]*"[\s\S]*?<\/header>/g)].map((m) => m[0]);
    for (const b of bands) expect(b).not.toContain('class="badge');
  });

  it('names each card\'s Tier 1-3 placements, highest first, and no Tier 4', () => {
    for (const r of listed) {
      const act = /<p\b[^>]*class="act"[^>]*>([\s\S]*?)<\/p>/.exec(card(r.slug))?.[1] ?? '';
      const shown = plain(act);
      const rated = [...r.placements].filter((p) => p.tier <= 3).sort((a, b) => a.tier - b.tier);
      let at = -1;
      for (const p of rated) {
        const i = shown.indexOf(`Tier ${p.tier}: ${p.name}`);
        expect(i, `${r.slug} ${p.name}`).toBeGreaterThan(-1);
        expect(i, `${r.slug} order`).toBeGreaterThan(at);
        at = i;
      }
      for (const p of r.placements.filter((p) => p.tier === 4)) expect(shown, `${r.slug} ${p.name}`).not.toContain(p.name);
    }
  });

  it('uses only the three type sizes in the built stylesheets', () => {
    const css = files(join(dist, '_astro')).filter((f) => f.endsWith('.css'));
    expect(css.length).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const f of css) {
      for (const m of readFileSync(f, 'utf-8').matchAll(/(?<![-\w])font-size\s*:\s*([^;}]+)/g)) {
        const v = m[1].trim().replace(/\s*!important$/, '');
        const ok = /^var\(--fs-(?:s|m|l)\)$/.test(v) || /em$/.test(v) || v === 'inherit' || /^clamp\(/.test(v);
        if (!ok) bad.push(`${f}: ${v}`);
      }
    }
    expect(bad).toEqual([]);
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
    const activity = recentActivity(listed).slice(0, 5);
    expect(home.indexOf('id="activity-heading"')).toBeLessThan(home.indexOf('data-record="'));
    for (const a of activity) expect(home, a.slug).toContain(`<time datetime="${a.date}">`);
    for (const r of listed) {
      const start = home.indexOf(`data-record="${r.slug}"`);
      // One date per card: the latest change if it came after publication, otherwise the publication date.
      const latest = (r.changes ?? []).map((c) => c.date).sort().at(-1);
      const shown = latest && latest > r.published ? latest : r.published;
      expect(home.slice(start, home.indexOf('</article>', start)), `${r.slug} date`).toContain(`<time datetime="${shown}">`);
    }
  });

  it('says why each tier moved, right on the home page', () => {
    for (const a of recentActivity(listed).slice(0, 5)) if (a.reason) expect(plain(home), a.slug).toContain(a.reason);
  });

  it('lists what is being watched but not yet rated, without repeating a published verdict', async () => {
    const rated = new Set(published.flatMap((r) => r.cves));
    const watching = (await getWatching()).filter((w) => !w.cves.some((id) => rated.has(id)));
    expect(count(home, 'class="watch-row"')).toBe(watching.length);
    for (const w of watching) expect(home, w.name).toContain(`${w.cves[0]}</a>`);
  });

  it('shows why the tier was chosen and what would change it, without opening a fold', () => {
    for (const r of published) {
      const visible = plain(withoutDetails(recordBody(recordPage(r.slug))));
      expect(visible, `${r.slug} tier reason`).toContain(r.tier_reason);
      for (const w of r.would_change) expect(visible, `${r.slug} trigger`).toContain(w);
    }
  });

  it('backs every definite key fact with a source and date', () => {
    for (const r of published) {
      for (const f of keyFacts(r)) {
        if (f.tone === 'unknown') continue;
        expect(f.source, `${r.slug}: ${f.label} needs an evidence item it can cite`).toBeDefined();
        expect(recordPage(r.slug), `${r.slug}: ${f.label}`).toContain(`href="${f.source!.url.replace(/&/g, '&amp;')}"`);
      }
    }
  });

  it('never publishes a placeholder in an affected table', () => {
    for (const r of published) for (const a of r.affected) expect(`${a.product} ${a.vulnerable} ${a.fixed ?? ''}`, r.slug).not.toContain('[');
  });

  it('links the feed and the leadership summaries to the real site, never a placeholder host', () => {
    const origin = 'https://exposure.infosecuriosity.co.uk';
    expect(read('feed.xml')).not.toContain('example.com');
    for (const r of published) {
      expect(read('feed.xml'), r.slug).toContain(`${origin}/verdicts/${r.slug}/`);
      expect(recordPage(r.slug), r.slug).toContain(`${origin}/verdicts/${r.slug}/`);
      expect(recordPage(r.slug), r.slug).not.toContain('example.com');
    }
  });

  it('shows when each verdict was published and last checked', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      for (const d of [r.published, r.evidence_as_of, r.review_until]) expect(html, `${r.slug} ${d}`).toContain(`<time datetime="${d}">`);
    }
  });
});
