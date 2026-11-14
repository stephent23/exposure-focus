// Small helpers shared by the verdict page components.
import type { RecordEntry } from '../schema/record';
import { EFFECT_LABELS, TIERS, type TierNumber } from './tiers';

type Status = keyof typeof EFFECT_LABELS;
type Event = NonNullable<RecordEntry['timeline']>[number];

/** Ways in are lettered A, B, C… */
export const letter = (index: number) => String.fromCharCode(65 + index);

/** Owner placeholders such as "[link to add]" stay visible and marked. */
export const isPlaceholder = (value: string) => value.includes('[');

// Known source hosts. `official` is true only when the page comes from the maker of the affected
// product, the platform provider, or a government authority. Research blogs and news are named but not called official.
const SOURCES: Record<string, { name: string; official: boolean; kind?: string }> = {
  'aws.amazon.com': { name: 'AWS', official: true },
  'cloudflare.com': { name: 'Cloudflare', official: true },
  'redhat.com': { name: 'Red Hat', official: true },
  'cisco.com': { name: 'Cisco', official: true },
  'microsoft.com': { name: 'Microsoft', official: true },
  'broadcom.com': { name: 'Broadcom', official: true },
  'nodejs.org': { name: 'Node.js', official: true },
  'php.net': { name: 'PHP', official: true },
  'cisa.gov': { name: 'CISA', official: true },
  'fastly.com': { name: 'Fastly', official: true },
  'github.com': { name: 'GitHub', official: true },
  'akamai.com': { name: 'Akamai', official: false, kind: 'write-up' },
  'imperva.com': { name: 'Imperva', official: false, kind: 'write-up' },
  'sophos.com': { name: 'Sophos', official: false, kind: 'write-up' },
  'wiz.io': { name: 'Wiz', official: false, kind: 'write-up' },
  'zscaler.com': { name: 'Zscaler', official: false, kind: 'write-up' },
  'aikido.dev': { name: 'Aikido', official: false, kind: 'write-up' },
  'bleepingcomputer.com': { name: 'BleepingComputer', official: false, kind: 'report' },
  'seclists.org': { name: 'SecLists', official: false, kind: 'mailing list post' }
};

/** "AWS official guidance" for a vendor page; other sources are named but never called official. */
export const guideLabel = (url: string) => {
  const host = new URL(url).hostname.replace(/^www\./, '');
  const key = Object.keys(SOURCES).find((h) => host === h || host.endsWith(`.${h}`));
  const s = key && SOURCES[key];
  if (!s) return `${host} (source not checked)`;
  return s.official ? `${s.name} official guidance` : `${s.name} ${s.kind} (not official)`;
};

const MONTHS =['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 2026-10-05 → "5 Oct 2026". */
export const niceDate = (iso: string) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** Key dates, oldest first; an event with a time sorts after one without on the same day. */
export const sortedTimeline = (timeline: Event[] | undefined) =>
  [...(timeline ?? [])].sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`));

type Change = NonNullable<RecordEntry['changes']>[number];

/** The change log, newest first. Same-day entries keep file order. */
export const sortedChanges = (changes: Change[] | undefined) => [...(changes ?? [])].sort((a, b) => b.date.localeCompare(a.date));

/** "Edge: Tier 3 (Prioritised) to Tier 1 (Emergency)", or null when the change did not move a tier. */
export const changeHeadline = (c: Change) => {
  if (c.placement === undefined || c.from_tier === undefined || c.to_tier === undefined) return null;
  const tier = (n: number) => `Tier ${n} (${TIERS[n as TierNumber].name})`;
  return `${c.placement}: ${tier(c.from_tier)} to ${tier(c.to_tier)}`;
};

/** What an option does to each way in, in letter order (A, B, C…), so the letters never appear out of order. */
export const effectByWay = (vectors: string[], effects: { vector: string; status: Status }[]) =>
  vectors.flatMap((vector, i) => {
    const effect = effects.find((e) => e.vector === vector);
    return effect ? [{ letter: letter(i), status: effect.status, label: EFFECT_LABELS[effect.status].text }] : [];
  });

export type KeyFact = { label: string; value: string; tone: 'bad' | 'ok' | 'unknown'; source?: { url: string; as_of: string } };

// Which evidence item backs each key fact, matched on its label. The first item with a real link wins.
const FACT_EVIDENCE = {
  exploited: /KEV|exploitation|attacker activity|exploit evidence/i,
  publicExploit: /public exploit|proof of concept|exploit evidence/i,
  vendor: /vendor (advisory|bulletin)|distribution advisory/i
};

/** Four facts for the strip under the summary, always in this order. Derived, never typed by hand; each definite answer carries the evidence behind it. */
export function keyFacts(record: RecordEntry): KeyFact[] {
  const any = (key: 'exploited' | 'public_exploit') => record.placements.some((p) => p.facts[key] === true);
  const backing = (pattern: RegExp) => {
    const e = (record.evidence ?? []).find((x) => pattern.test(x.label) && x.source_url.startsWith('http'));
    return e && { url: e.source_url, as_of: e.as_of };
  };
  const yesOrUnknown = (label: string, yes: boolean, pattern: RegExp): KeyFact =>
    yes ? { label, value: 'Yes', tone: 'bad', source: backing(pattern) } : { label, value: 'Not known', tone: 'unknown' };
  const vendor = backing(FACT_EVIDENCE.vendor);

  const headline = record.placements[0].facts;
  const label = 'Attacker needs a login';
  const login: KeyFact = headline.no_login
    ? { label, value: 'No', tone: 'bad', source: vendor }
    : headline.requires_login
      ? { label, value: 'Yes', tone: 'ok', source: vendor }
      : { label, value: 'Not stated', tone: 'unknown' };

  const rows = record.affected;
  const fixed = rows.filter((r) => r.fixed).length;
  const fix: KeyFact = rows.some((r) => isPlaceholder(r.fixed ?? ''))
    ? { label: 'Fix', value: 'To confirm', tone: 'unknown' }
    : fixed === rows.length
      ? { label: 'Fix', value: 'Available', tone: 'ok', source: vendor }
      : fixed > 0
        ? { label: 'Fix', value: 'For some versions', tone: 'bad', source: vendor }
        : { label: 'Fix', value: 'None yet', tone: 'bad', source: vendor };

  return [
    yesOrUnknown('Exploited in attacks', any('exploited'), FACT_EVIDENCE.exploited),
    yesOrUnknown('Public exploit code', any('public_exploit'), FACT_EVIDENCE.publicExploit),
    login,
    fix
  ];
}

/** One line for a mitigation: "Closes all 3 ways in" / "Closes 2 of 3 ways in · 1 left open" / "Partial for 3 of 3 ways in". */
export function coverageLine(vectors: string[], effects: { vector: string; status: Status }[]): string {
  const n = vectors.length;
  const statuses = vectors.map((v) => effects.find((e) => e.vector === v)?.status ?? 'open');
  const closed = statuses.filter((s) => s === 'closed' || s === 'closed_for_that_app').length;
  const partial = statuses.filter((s) => s === 'weaker').length;
  const open = n - closed - partial;
  const ways = n === 1 ? 'way in' : 'ways in';

  if (closed === n) return n === 1 ? 'Closes the one way in' : `Closes all ${n} ways in`;
  if (open === n) return n === 1 ? 'Leaves the one way in open' : `Leaves all ${n} ways in open`;
  const parts = [
    closed > 0 ? `Closes ${closed} of ${n} ${ways}` : '',
    partial > 0 ? (closed > 0 ? `partial for ${partial}` : `Partial for ${partial} of ${n} ${ways}`) : '',
    open > 0 ? `${open} left open` : ''
  ];
  return parts.filter(Boolean).join(' · ');
}

/** 2026-10-05 → "5 Oct", for dense lists where the year is obvious. */
export const shortDate = (iso: string) => niceDate(iso).slice(0, -5);
