// Loads every record file from content/records/.
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

import type { RecordEntry } from '../schema/record';
import { parseRecordFile } from './record-file';

// Relative to the project root, not to this file: Astro bundles pages before rendering them, so file URLs move.
const recordsDir = join(process.cwd(), 'content', 'records');

export async function getAllRecords(): Promise<RecordEntry[]> {
  const dirEntries = await fs.readdir(recordsDir, { withFileTypes: true });
  const files = dirEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    files.map(async (fileName) => parseRecordFile(await fs.readFile(join(recordsDir, fileName), 'utf-8'), fileName))
  );
}