// The "watching, not yet rated" list on the home page: publicised items that have no verdict yet.
// Deliberately only a name, CVE IDs and a date. No tier and no claims: those need a verdict with sources.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

import { dateString, text } from '../schema/record';

const itemSchema = z
  .object({
    name: text.max(80),
    cves: z.array(z.string().regex(/^CVE-\d{4}-\d{4,}$/)).min(1),
    noted: dateString
  })
  .strict();

export type WatchItem = z.infer<typeof itemSchema>;

export function parseWatching(source: string): WatchItem[] {
  const items = z.array(itemSchema).parse(parse(source) ?? []);
  return items.sort((a, b) => b.noted.localeCompare(a.noted));
}

export async function getWatching(): Promise<WatchItem[]> {
  return parseWatching(await readFile(join(process.cwd(), 'content', 'watching.yaml'), 'utf-8'));
}

/** The public CVE record for an ID. */
export const cveLink = (id: string) => `https://www.cve.org/CVERecord?id=${id}`;
