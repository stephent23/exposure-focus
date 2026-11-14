import { describe, expect, it } from 'vitest';

import { readFile } from 'node:fs/promises';

import { parseRecordFile } from '../src/lib/record-file';
import { getAllRecords } from '../src/lib/records';

describe('content/records', async () => {
  const records = await getAllRecords();

  it('publishes at least one record', () => {
    expect(records.some((r) => r.status === 'published')).toBe(true);
  });

  it('ships a template that is itself a valid record', async () => {
    const source = await readFile(new URL('../content/template.md', import.meta.url), 'utf-8');
    expect(parseRecordFile(source, 'template.md').status).toBe('draft');
  });

  it('only calls something vendor-stated when it links to a real source', () => {
    for (const record of records) {
      for (const e of record.evidence) {
        if (e.confidence === 'vendor-stated') expect(e.source_url, `${record.slug}: ${e.label}`).toMatch(/^https:\/\//);
      }
      for (const m of record.mitigations) {
        if (m.confidence === 'vendor-stated') {
          expect(m.official_guides.some((g) => g.startsWith('https://')), `${record.slug}: ${m.title}`).toBe(true);
        }
      }
    }
  });

  it('keeps placeholders visible: a record with a placeholder link is never presented as confirmed', () => {
    for (const record of records) {
      for (const e of record.evidence) {
        if (e.source_url.startsWith('[')) expect(e.confidence, `${record.slug}: ${e.label}`).not.toBe('vendor-stated');
      }
    }
  });

  it('gives every published record, and the template, at least one affected row', async () => {
    for (const record of records.filter((r) => r.status === 'published')) {
      expect(record.affected.length, record.slug).toBeGreaterThan(0);
    }
    const source = await readFile(new URL('../content/template.md', import.meta.url), 'utf-8');
    expect(parseRecordFile(source, 'template.md').affected.length).toBeGreaterThan(0);
  });

  it('gives every published record real sources', () => {
    for (const record of records.filter((r) => r.status === 'published')) {
      expect(record.sources.some((s) => s.url.startsWith('https://')), record.slug).toBe(true);
    }
  });
});
