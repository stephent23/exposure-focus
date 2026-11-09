// Reads and checks the public corrections log (content/corrections.md).
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { dateString, link, slug, text } from '../schema/record';
import { splitFrontMatter } from './record-file';
import { getAllRecords } from './records';

const correctionSchema = z.object({
  date: dateString,
  record: slug,
  what_we_said: text,
  what_was_wrong: text,
  what_we_changed: text,
  source_url: link
});

type Correction = z.infer<typeof correctionSchema>;

/** The corrections file is one markdown file; the list lives in its front matter. */
export function parseCorrectionsFile(source: string, knownSlugs: string[]): Correction[] {
  try {
    const list = z.object({ corrections: z.array(correctionSchema) }).parse(splitFrontMatter(source).data);

    for (const item of list.corrections) {
      if (!knownSlugs.includes(item.record)) throw new Error(`The record "${item.record}" does not exist.`);
    }
    // Newest first.
    return [...list.corrections].sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`corrections.md: ${message}`);
  }
}

// Relative to the project root, not to this file (see records.ts).
const file = join(process.cwd(), 'content', 'corrections.md');

export async function getCorrections(): Promise<Correction[]> {
  const slugs = (await getAllRecords()).map((record) => record.slug);
  return parseCorrectionsFile(await fs.readFile(file, 'utf-8'), slugs);
}
