import { describe, expect, it } from 'vitest';

import { parseCorrectionsFile } from './corrections';

const slugs = ['cisco-asa', 'php2shell'];

const entry = `  - date: 2026-11-10
    record: cisco-asa
    what_we_said: We said the call was Tier 3.
    what_was_wrong: We missed a reported exploit.
    what_we_changed: Moved the call to Tier 2.
    source_url: https://vendor.test/advisory`;

const file = (list: string, body = '') => `---\n${list}\n---\n${body}`;

describe('parseCorrectionsFile', () => {
  it('reads a valid correction', () => {
    const result = parseCorrectionsFile(file(`corrections:\n${entry}`), slugs);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-11-10');
    expect(result[0].record).toBe('cisco-asa');
  });

  it('accepts an empty list', () => {
    expect(parseCorrectionsFile(file('corrections: []'), slugs)).toEqual([]);
  });

  it('accepts the link placeholder', () => {
    const source = file(`corrections:\n${entry.replace('https://vendor.test/advisory', '"[link to add]"')}`);
    expect(parseCorrectionsFile(source, slugs)[0].source_url).toBe('[link to add]');
  });

  it('lists the newest correction first', () => {
    const older = entry.replace('2026-11-10', '2026-01-01');
    const result = parseCorrectionsFile(file(`corrections:
${older}
${entry}`), slugs);
    expect(result.map((c) => c.date)).toEqual(['2026-11-10', '2026-01-01']);
  });

  it('rejects an invalid date', () => {
    const source = file(`corrections:\n${entry.replace('2026-11-10', '10/11/2026')}`);
    expect(() => parseCorrectionsFile(source, slugs)).toThrow(/YYYY-MM-DD/);
  });

  it('rejects a record that does not exist', () => {
    const source = file(`corrections:\n${entry.replace('cisco-asa', 'no-such-record')}`);
    expect(() => parseCorrectionsFile(source, slugs)).toThrow(/no-such-record/);
  });

  it('rejects an example host or a plain http link', () => {
    expect(() => parseCorrectionsFile(file(`corrections:\n${entry.replace('vendor.test', 'example.com')}`), slugs)).toThrow();
    expect(() => parseCorrectionsFile(file(`corrections:\n${entry.replace('https://', 'http://')}`), slugs)).toThrow();
  });

  it('rejects a file without front matter or without the list', () => {
    expect(() => parseCorrectionsFile('nothing here', slugs)).toThrow(/front matter/);
    expect(() => parseCorrectionsFile(file('other: []'), slugs)).toThrow();
  });
});
