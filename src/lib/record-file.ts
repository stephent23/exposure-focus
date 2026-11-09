// Reads a record markdown file: YAML front matter checked by the schema, free-form analysis below.
import { parse } from 'yaml';

import { parseRecord, type RecordEntry } from '../schema/record';

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

/** Split a markdown file into its parsed YAML front matter and the trimmed markdown below it. */
export function splitFrontMatter(source: string): { data: unknown; body: string } {
  const match = FRONT_MATTER.exec(source.charCodeAt(0) === 0xfeff ? source.slice(1) : source);
  if (!match) throw new Error('Expected YAML front matter between --- lines at the top of the file.');
  return { data: parse(match[1]), body: (match[2] ?? '').trim() };
}

/** A record is a markdown file: checked fields in the YAML front matter, free-form analysis below it. */
export function parseRecordFile(source: string, fileName: string): RecordEntry {
  try {
    const { data, body } = splitFrontMatter(source);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('The front matter must be a YAML mapping.');

    const record = parseRecord(body ? { ...data, analysis: body } : data);

    const expected = fileName.replace(/\.md$/, '');
    if (record.slug !== expected) throw new Error(`The slug "${record.slug}" must match the file name "${expected}".`);
    return record;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${fileName}: ${message}`);
  }
}
