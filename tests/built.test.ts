import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { byNewest, recentActivity } from '../src/lib/home';
import { getWatching } from '../src/lib/watching';
import { getAllRecords } from '../src/lib/records';
import { CONFIDENCE_LABELS } from '../src/lib/tiers';
import { keyFacts, REPORTED_VALUE } from '../src/lib/verdict-view';
import { headlineTier, placementResult, TIMEFRAME } from '../src/schema/record';

const dist = join(process.cwd(), 'dist-test');
const read = (...p: string[]) => readFileSync(join(dist, ...p), 'utf-8');
const files = (dir = dist): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
const count = (s: string, needle: string) => s.split(needle).length - 1;
const text = (html: string) =>
  html.replace(/<(script|style)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->|<[^>]+>/gi, ' ').replace(/\s+/g, ' ');
// Absolute URLs are third-party unless they point at this site itself (the canonical link does).
const external = (url: string) => /^(?:https?:)?\/\//i.test(url.trim()) && !url.trim().startsWith('https://exposure.infosecuriosity.co.uk/');
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
// The page is a dashboard, not a report. Everything above "What to do" (summary, key facts, briefing, affected table,
// checks, placements) must stay short; "What to do" is capped per option instead, so a longer list does not break it.
// The key-dates list beside it is counted separately: at most eight dated events.
const VISIBLE_WORD_BUDGET = 480;
// The What to do section of a verdict page, up to the end of its <section>.
const protectSection = (html: string) => {
  const start = html.indexOf('id="protect-heading"');
  return html.slice(start, html.indexOf('</section>', start));
};
// A home card shows badges, a name, dates, flags, a summary, a fix line and placement rows only.
const CARD_WORD_BUDGET = 120;

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
      expect(html, `${r.slug} has no folded mitigation detail`).not.toContain('class="opt-more"');
    }
  });

  it('keeps the visible text of a record page within the word budget', () => {
    for (const r of published) {
      const body = withoutDetails(recordBody(recordPage(r.slug))).replace(/<aside[\s\S]*?<\/aside>/g, ' ');
      const start = body.indexOf('id="protect-heading"');
      const visible = plain(body.slice(0, start) + body.slice(body.indexOf('</section>', start)));
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

  // Each option is an action, one short limit, a confidence label and a guide link. Cap it so the list reads at a glance.
  const OPTION_WORD_BUDGET = 30;
  it('shows each option as its action, a short limit, a confidence label and one guide link', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      const section = protectSection(html);
      const items = [...section.matchAll(/<li class="opt">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
      const ordered = [...r.mitigations.filter((m) => m.role === 'fix'), ...r.mitigations.filter((m) => m.role === 'stopgap')];
      expect(items.length, `${r.slug} options`).toBe(ordered.length);
      ordered.forEach((m, i) => {
        const text = plain(items[i]);
        // Inline code adds spacing and drops its backticks, so compare with spaces and backticks removed.
        const squash = (x: string) => x.replace(/[\s`]/g, '');
        expect(squash(text), `${r.slug} ${m.title} limit`).toContain(squash(m.limitation));
        expect(text, `${r.slug} ${m.title} confidence`).toContain(CONFIDENCE_LABELS[m.confidence]);
        // One implementation link per option: the first guide.
        const guide = m.official_guides[0];
        if (guide?.startsWith('http')) expect(items[i], `${r.slug} ${m.title} guide`).toContain(`href="${guide.replace(/&/g, '&amp;')}"`);
        expect(count(items[i], 'href='), `${r.slug} ${m.title} links`).toBe(1);
        // Count what is seen: screen-reader-only text (the guide link repeats the title for context) is left out.
        const seen = plain(items[i].replace(/<span class="sr-only">[\s\S]*?<\/span>/g, ' '));
        expect(words(seen), `${r.slug} ${m.title} words`).toBeLessThanOrEqual(OPTION_WORD_BUDGET);
      });
    }
  });

  it('leads What to do with the recommended fix, then the stopgaps for when patching has to wait', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      const section = protectSection(html);
      const fixes = r.mitigations.filter((m) => m.role === 'fix');
      const stopgaps = r.mitigations.filter((m) => m.role === 'stopgap');
      expect(html, `${r.slug} has no coverage table`).not.toContain('class="coverage"');
      if (fixes.length) {
        const rec = /<div class="rec">[\s\S]*?<\/ol>/.exec(section)?.[0] ?? '';
        expect(plain(rec), `${r.slug} recommended`).toContain('Recommended');
        for (const m of fixes) expect(plain(rec), `${r.slug} fix ${m.title}`).toContain(m.title);
      } else {
        expect(plain(section), `${r.slug} says there is no fix`).toContain('No fix yet');
      }
      if (stopgaps.length) {
        const list = /<ul class="opts stopgaps">[\s\S]*?<\/ul>/.exec(section)?.[0] ?? '';
        expect(plain(section), `${r.slug} stopgap heading`).toContain(fixes.length ? 'If you can’t patch yet' : 'In the meantime');
        for (const m of stopgaps) expect(plain(list), `${r.slug} stopgap ${m.title}`).toContain(m.title);
        if (fixes.length) expect(section.indexOf('class="rec"'), `${r.slug} fix first`).toBeLessThan(section.indexOf('class="opts stopgaps"'));
      }
    }
  });

  it('puts the decision first: where it matters, then what to do, then whether you are affected, then why', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      const at = ['placement', 'protect', 'applies', 'leadership', 'evidence'].map((id) => html.indexOf(`id="${id}-heading"`));
      expect(at.every((x) => x > 0), `${r.slug} all sections`).toBe(true);
      expect([...at].sort((x, y) => x - y), `${r.slug} order`).toEqual(at);
    }
  });

  it('folds the check commands away but keeps each question and the versions table visible', () => {
    const squash = (x: string) => x.replace(/[\s`]/g, '');
    for (const r of published) {
      const html = recordPage(r.slug);
      const shown = squash(plain(withoutDetails(recordBody(html))));
      for (const c of r.applies_check) {
        expect(shown, `${r.slug} question`).toContain(squash(c.question));
        expect(shown, `${r.slug} how to check is folded`).not.toContain(squash(c.how_to_check));
        expect(squash(plain(html)), `${r.slug} how to check is on the page`).toContain(squash(c.how_to_check));
      }
    }
  });

  it('names the latest tier move in the header when a verdict has one', () => {
    for (const r of published) {
      const move = [...(r.changes ?? [])].filter((c) => c.to_tier !== undefined).sort((a, b) => b.date.localeCompare(a.date))[0];
      const header = /<header\b[^>]*class="[^"]*\bsummary\b[^"]*"[\s\S]*?<\/header>/.exec(recordPage(r.slug))?.[0] ?? '';
      if (move) expect(header, `${r.slug} last change`).toContain('class="last-change"');
      else expect(header, `${r.slug} no change line`).not.toContain('class="last-change"');
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

  it('explains the tier in Why this tier, and keeps the board summary one click away', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      const start = html.indexOf('id="leadership-heading"');
      const why = html.slice(start, html.indexOf('</section>', start));
      expect(plain(why), `${r.slug} heading`).toContain('Why this tier');
      expect(plain(withoutDetails(why)), `${r.slug} tier reason`).toContain(r.tier_reason);
      for (const w of r.would_change) expect(plain(withoutDetails(why)), `${r.slug} trigger`).toContain(w);
      expect(why, `${r.slug} copy button`).toContain('id="boss-copy"');
      expect(plain(why), `${r.slug} quote on the page`).toContain(r.leadership_quote);
      expect(plain(withoutDetails(why)), `${r.slug} quote folded`).not.toContain(r.leadership_quote);
      const header = /<header\b[^>]*class="[^"]*\bsummary\b[^"]*"[\s\S]*?<\/header>/.exec(html)?.[0] ?? '';
      expect(header, `${r.slug} summary header`).not.toBe('');
      expect(plain(header), `${r.slug} header repeats the reason`).not.toContain(r.tier_reason);
    }
  });

  it('has one section nav on each verdict page, linking five sections that exist', () => {
    const expected = ['placement', 'protect', 'applies', 'leadership', 'evidence'].map((id) => `#${id}-heading`);
    for (const r of published) {
      const html = recordPage(r.slug);
      expect(count(html, 'class="section-nav"'), `${r.slug} nav count`).toBe(1);
      const nav = /<nav\b[^>]*class="section-nav"[\s\S]*?<\/nav>/.exec(html)?.[0] ?? '';
      // The nav is named by its visible "Jump to" label.
      expect(nav).toContain('aria-labelledby="section-nav-label"');
      expect(plain(nav)).toContain('Jump to');
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

  it('lines the Tier 4 summary up with the placement rows above it', () => {
    // Same two-column structure as a placement row: the badge, then the text in its own element.
    for (const r of published.filter((x) => x.placements.some((p) => p.tier === 4))) {
      expect(recordPage(r.slug), r.slug).toMatch(/<p class="routine-rest"><span class="badge t4">[^<]*<\/span> <span>/);
    }
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

  it('keeps related CVEs out of the headline list, says they are related, and still finds them by search', () => {
    for (const r of published.filter((x) => x.related_cves?.length)) {
      const header = /<header\b[^>]*class="[^"]*\bsummary\b[^"]*"[\s\S]*?<\/header>/.exec(recordPage(r.slug))?.[0] ?? '';
      const headline = /<span class="cve">([\s\S]*?)<\/span>/.exec(header)?.[1] ?? '';
      for (const id of r.cves) expect(headline, `${r.slug} headline ${id}`).toContain(id);
      for (const id of r.related_cves!) {
        expect(headline, `${r.slug} related ${id} not in headline`).not.toContain(id);
        expect(plain(header), `${r.slug} related line`).toMatch(new RegExp(`Related[^.]*${id}`));
        const card = home.slice(home.indexOf(`data-record="${r.slug}"`));
        expect(card.slice(0, card.indexOf('>')), `${r.slug} search finds ${id}`).toContain(id.toLowerCase());
      }
    }
    expect(published.some((x) => x.related_cves?.length), 'at least one record uses related CVEs').toBe(true);
  });

  it('shows when each verdict was published and last checked', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      for (const d of [r.published, r.evidence_as_of, r.review_until]) expect(html, `${r.slug} ${d}`).toContain(`<time datetime="${d}">`);
    }
  });
});

describe('answer box, evidence badges and plain language', () => {
  it('says Yes for exploitation or a public exploit only when a vendor or authority states it', () => {
    for (const r of published) {
      for (const f of keyFacts(r).filter((x) => x.label === 'Exploited in the wild' || x.label === 'Public exploit code')) {
        if (f.value !== 'Yes' || !f.source) continue;
        const backing = r.evidence.find((e) => e.source_url === f.source!.url && e.as_of === f.source!.as_of);
        expect(backing?.confidence, `${r.slug} ${f.label}`).toBe('vendor-stated');
      }
      for (const f of keyFacts(r).filter((x) => x.unconfirmed)) expect(plain(recordPage(r.slug)), `${r.slug} ${f.label}`).toContain(REPORTED_VALUE);
    }
  });

  it('puts the tier for each placement in one answer box straight after the header, with terms defined', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      const start = html.indexOf('class="sec where answer"');
      expect(start, `${r.slug} answer box`).toBeGreaterThan(html.indexOf('</header>'));
      const box = html.slice(start, html.indexOf('</section>', start));
      expect(box, `${r.slug} terms`).toContain('Terms on this page');
      expect(box, `${r.slug} rules link`).toContain('href="/rubric/"');
      for (const p of r.placements.filter((x) => x.tier <= 3)) expect(plain(box), `${r.slug} ${p.name}`).toContain(p.name);
    }
  });

  it('explains every editorial call in one visible sentence on its row', () => {
    for (const r of published) {
      const shown = plain(withoutDetails(recordBody(recordPage(r.slug))));
      for (const p of r.placements.filter((x) => x.tier <= 3 && x.override_reason)) {
        const rubric = placementResult(r, p).tier;
        if (rubric === p.tier) continue;
        expect(shown, `${r.slug} ${p.name}`).toContain(`Editorial call: the rules give Tier ${rubric}; this page shows Tier ${p.tier}.`);
      }
    }
  });

  it('offers the board summary and the plain text as copy buttons', () => {
    for (const r of published) {
      const html = recordPage(r.slug);
      expect(html, `${r.slug} board button`).toContain('data-copy="boss-quote"');
      expect(html, `${r.slug} text button`).toContain('data-copy="boss-text"');
    }
  });

  it('lists home cards newest first within each tier', () => {
    for (const tier of [1, 2, 3]) {
      const expected = listed.filter((r) => headlineTier(r) === tier).sort(byNewest).map((r) => r.slug);
      const shown = [...home.matchAll(/data-record="([^"]+)"/g)].map((m) => m[1]).filter((s) => expected.includes(s));
      expect(shown, `tier ${tier}`).toEqual(expected);
    }
  });
});
