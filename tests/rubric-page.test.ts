import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TIERS, TIER_NUMBERS } from '../src/lib/tiers';
import { EPSS_ESCALATION_THRESHOLD, EVIDENCE_COLUMNS, IMPACT_LEVELS, IMPACT_TABLE } from '../src/rubric/triage';

const html = readFileSync(join(process.cwd(), 'dist-test', 'rubric', 'index.html'), 'utf-8');
const text = (s: string) => s.replace(/<(script|style)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->|<[^>]+>/gi, ' ').replace(/\s+/g, ' ');
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const plain = decode(text(html)).replace(/\s+/g, ' ');
const main = html.slice(html.indexOf('<main'));

describe('rubric page', () => {
  it('shows all four tiers with their names and meanings', () => {
    for (const tier of TIER_NUMBERS) {
      expect(plain).toContain(TIERS[tier].name);
      expect(plain).toContain(TIERS[tier].meaning);
      expect(main).toContain(`tiercard t${tier}`);
    }
  });

  it('has one grid cell per impact and evidence, each with the rubric tier', () => {
    const cells = [...main.matchAll(/<td\b[^>]*>/g)].map((m) => m[0]);
    expect(cells).toHaveLength(IMPACT_LEVELS.length * EVIDENCE_COLUMNS.length);
    for (const impact of IMPACT_LEVELS) {
      EVIDENCE_COLUMNS.forEach((column, i) => {
        const cell = cells.find((c) => c.includes(`data-impact="${impact}"`) && c.includes(`data-evidence="${column.key}"`));
        expect(cell, `${impact} x ${column.key}`).toBeDefined();
        expect(cell).toMatch(new RegExp(`class="[^"]*\\bt${IMPACT_TABLE[impact][i]}\\b`));
      });
    }
  });

  it('keeps every heading it had before', () => {
    for (const heading of [
      'How verdicts are decided',
      'The four tiers',
      'Step 1: the gates',
      'Step 2: business impact and evidence',
      'Impact rows',
      'Evidence columns',
      'Step 3: two adjustments',
      'Exploit chains',
      'Where CVSS fits'
    ]) {
      expect(plain, heading).toContain(heading);
      expect(main, heading).toMatch(new RegExp(`<h[1-3][^>]*>\\s*${heading}\\.?\\s*</h[1-3]>`));
    }
  });

  it('keeps every rule it stated before', () => {
    for (const rule of [
      'If the vendor states a condition for exposure is false, it is not exposed: Tier 4, Routine.',
      'If it is not reachable from the internet, it is Tier 4, Routine.',
      'If it is unclear whether something is exposed, it is treated as exposed.',
      'If it needs a login or an unusual configuration, the call drops one tier.',
      `If EPSS is at or above ${EPSS_ESCALATION_THRESHOLD * 100}%, a call that rests on exploitation or a public exploit rises one tier. EPSS never lowers a tier.`,
      'The call follows the lesser outcome',
      'A claim counts only when it is published.',
      '“Imminent” is a judgement.',
      'If you cannot tell how bad it would be, use the Critical row.',
      'A flaw is rated by the worst outcome of any known chain',
      'if the chain gets round a login, the login adjustment does not apply',
      'If you have already fixed the other link, rate the flaw on its own.',
      'The score never sets a tier.',
      'never gives a time frame'
    ]) {
      expect(plain, rule).toContain(rule);
    }
    for (const column of EVIDENCE_COLUMNS) {
      expect(plain).toContain(column.label);
      expect(plain).toContain(column.description);
    }
  });

  it('folds reference text into details and uses no inline styles', () => {
    expect(main).toContain('<details');
    expect(main).not.toMatch(/\sstyle=|<style/);
  });
});
