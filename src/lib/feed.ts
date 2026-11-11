// Builds the Atom feed of published records.
import { headlineTier, type RecordEntry } from '../schema/record';
import { TIERS } from './tiers';
import { changeHeadline } from './verdict-view';

const AUTHOR = 'Exposure Focus';
const TAG_AUTHORITY = 'exposure-focus';

// Characters XML 1.0 forbids: C0 controls except tab, LF and CR, plus U+FFFE/U+FFFF and lone surrogates.
// eslint-disable-next-line no-control-regex
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** Strip invalid characters, then escape the five XML specials. Safe for text and attribute values. */
function xmlEscape(value: string): string {
  return value
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const tagPart = (value: string) => value.replace(INVALID_XML, '').replace(/[^A-Za-z0-9._-]+/g, '-');

interface FeedEntry {
  id: string;
  title: string;
  date: string;
  href: string;
  summary: string;
}

function entriesFor(records: RecordEntry[], base: URL): FeedEntry[] {
  const out: FeedEntry[] = [];
  for (const record of records) {
    if (record.status !== 'published') continue;
    const tierName = TIERS[headlineTier(record)].name;
    const unconfirmed = record.evidence.some((e) => e.confidence === 'reported');
    const href = new URL(`verdicts/${record.slug}/`, base).href;
    const lines = [record.summary, `Current headline tier: ${tierName}.`, `Evidence as of ${record.evidence_as_of}`];
    if (unconfirmed) lines.push('Some facts are not yet confirmed.');
    out.push({
      id: `tag:${TAG_AUTHORITY},2026:${tagPart(record.slug)}`,
      title: record.name,
      date: `${record.evidence_as_of}T00:00:00Z`,
      href,
      summary: lines.join('\n')
    });
    // Each change gets its own entry so feed readers flag it as new. The id counts same-day changes, so it stays stable as the log grows.
    const perDay = new Map<string, number>();
    for (const change of record.changes ?? []) {
      const n = perDay.get(change.date) ?? 0;
      perDay.set(change.date, n + 1);
      out.push({
        id: `tag:${TAG_AUTHORITY},2026:${tagPart(record.slug)}:change:${change.date}:${n}`,
        title: `${record.name}: ${changeHeadline(change) ?? 'verdict updated'}`,
        date: `${change.date}T00:00:00Z`,
        href: `${href}#changes-heading`,
        summary: [change.reason, change.source_url.startsWith('http') ? `Source: ${change.source_url}` : 'Source to be added.'].join('\n')
      });
    }
  }
  // Newest first. Array.sort is stable, so ties keep file order.
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/** Atom 1.0 feed with one entry per published record, updated on its evidence date. Pure: records and a site URL in, XML out. */
export function buildFeed(records: RecordEntry[], site: string): string {
  const base = new URL(site.endsWith('/') ? site : `${site}/`);
  const entries = entriesFor(records, base);
  const home = base.href;
  const self = new URL('feed.xml', base).href;
  const updated = entries[0]?.date ?? '1970-01-01T00:00:00Z';

  const lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    '<title>Exposure Focus: verdicts</title>',
    '<subtitle>Published vulnerability verdicts and every change to them, newest first.</subtitle>',
    `<updated>${updated}</updated>`,
    `<id>tag:${TAG_AUTHORITY},2026:feed</id>`,
    `<link rel="self" type="application/atom+xml" href="${xmlEscape(self)}"/>`,
    `<link rel="alternate" type="text/html" href="${xmlEscape(home)}"/>`,
    `<author><name>${AUTHOR}</name></author>`
  ];
  for (const e of entries) {
    lines.push(
      '<entry>',
      `<id>${xmlEscape(e.id)}</id>`,
      `<title>${xmlEscape(e.title)}</title>`,
      `<updated>${e.date}</updated>`,
      `<link rel="alternate" type="text/html" href="${xmlEscape(e.href)}"/>`,
      `<summary type="text">${xmlEscape(e.summary)}</summary>`,
      '</entry>'
    );
  }
  lines.push('</feed>', '');
  return lines.join('\n');
}
