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
