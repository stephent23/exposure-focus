import { describe, expect, it } from 'vitest';

import { parseRecordFile } from './record-file';

const frontMatter = `slug: sample
name: Sample
aliases: []
cves: ["[CVE to confirm]"]
summary: A sample record.
attack: rce
status: draft
published: 2026-11-01
evidence_as_of: 2026-11-08
review_until: 2026-12-08
leadership_quote: A sentence a boss can read.
affected:
  - { product: Sample 1.x, vulnerable: below 1.2.3, fixed: 1.2.3 }
applies_check:
  - question: Is it exposed?
    how_to_check: Check the listener.
placements:
  - name: Internet-facing
    facts: { reachable: true, exploited: true, no_login: true, impact: critical }
    why: [Reachable and exploited.]
    tier: 1
    action: Look to mitigate first, then patch.
vectors: [Remote request]
mitigations:
  - title: Block access
    summary: Restrict the listener.
    effect: [{ vector: Remote request, status: closed }]
    takes: A firewall change.
    might_break: Remote users lose access.
    official_guides: ["[link to add]"]
    check_it_worked: Probe from outside.
    undo: Remove the rule.
    confidence: reported
evidence:
  - label: CVE record
    text: Reported.
    as_of: 2026-11-08
    source_url: "[link to add]"
    confidence: reported
sources:
  - { title: Advisory, url: "[link to add]", accessed: 2026-11-08 }`;

const file = (body = '') => `---\n${frontMatter}\n---\n${body}`;

describe('parseRecordFile', () => {
  it('reads front matter into a validated record', () => {
    const record = parseRecordFile(file(), 'sample.md');
    expect(record.slug).toBe('sample');
    expect(record.evidence_as_of).toBe('2026-11-08');
    expect(record.placements[0].tier).toBe(1);
  });

  it('uses the markdown below the front matter as the analysis', () => {
    const record = parseRecordFile(file('\n## Why this matters\n\nSome notes.\n'), 'sample.md');
    expect(record.analysis).toBe('## Why this matters\n\nSome notes.');
  });

  it('has no analysis when the body is empty', () => {
    expect(parseRecordFile(file('\n\n'), 'sample.md').analysis).toBeUndefined();
  });

  it('applies the no-time-frames rule to the body too', () => {
    expect(() => parseRecordFile(file('\nPatch within 48 hours.\n'), 'sample.md')).toThrow(/hour or day/);
  });

  it('names the file when something is wrong', () => {
    expect(() => parseRecordFile('no front matter here', 'broken.md')).toThrow(/broken\.md/);
    expect(() => parseRecordFile('---\nslug: [unclosed\n---\n', 'bad-yaml.md')).toThrow(/bad-yaml\.md/);
    expect(() => parseRecordFile('---\nslug: Sample\n---\n', 'short.md')).toThrow(/short\.md/);
  });

  it('requires the slug to match the file name', () => {
    expect(() => parseRecordFile(file(), 'other-name.md')).toThrow(/slug/);
  });
});
