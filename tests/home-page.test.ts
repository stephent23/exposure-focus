import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getAllRecords } from '../src/lib/records';
import { keyFacts, shortDate } from '../src/lib/verdict-view';
import { headlineTier } from '../src/schema/record';

const home = readFileSync(join(process.cwd(), 'dist-test', 'index.html'), 'utf-8');
const text = (html: string) => html.replace(/<(script|style)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->|<[^>]+>/gi, ' ').replace(/\s+/g, ' ');
const plain = (html: string) =>
  text(html).replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const count = (s: string, needle: string) => s.split(needle).length - 1;

const records = (await getAllRecords()).filter((r) => r.status === 'published' && headlineTier(r) !== 4);
const card = (slug: string) => {
  const start = home.lastIndexOf('<article', home.indexOf(`data-record="${slug}"`));
  return home.slice(start, home.indexOf('</article>', start));
};

describe('home triage rows', () => {
  it('lists records', () => expect(records.length).toBeGreaterThan(0));

  for (const r of records) {
    describe(r.slug, () => {
      const html = card(r.slug);
      const body = plain(html);

      it('carries the headline tier class on the article', () => {
        const tag = /<article\b[^>]*>/.exec(html)![0];
        const cls = /\bclass="([^"]*)"/.exec(tag)![1].split(/\s+/);
        expect(cls).toContain('card');
        expect(cls).toContain(`t${headlineTier(r)}`);
      });

      it('shows the fix line: first fix title, or No fix yet', () => {
        const fix = r.mitigations.find((m) => m.role === 'fix');
        if (fix) expect(body).toContain(`Fix: ${fix.title}`);
        else expect(body).toContain('No fix yet');
      });

      it('shows the fix-status flag from the key facts', () => {
        const status = keyFacts(r).find((f) => f.label === 'Fix')!.value;
        expect(body).toContain(`Fix: ${status.toLowerCase()}`);
      });

      it('shows the exploited flag exactly when a placement is exploited', () => {
        const exploited = r.placements.some((p) => p.facts.exploited === true);
        expect(count(html, 'class="tag-hot"')).toBe(exploited ? 1 : 0);
        expect(body.includes('Exploited in the wild')).toBe(exploited);
      });

      it('shows the tier-move tag exactly when a tier move follows publication', () => {
        const moves = (r.changes ?? []).filter((c) => c.to_tier !== undefined).sort((a, b) => a.date.localeCompare(b.date));
        const last = moves.at(-1);
        const expected = last && last.date > r.published ? last : undefined;
        expect(count(html, 'class="tier-move"')).toBe(expected ? 1 : 0);
        if (expected) expect(body).toContain(`Tier ${expected.from_tier} → ${expected.to_tier}, ${shortDate(expected.date)}`);
      });
    });
  }
});
