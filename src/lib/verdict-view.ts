// Small helpers shared by the verdict page components.
import type { RecordEntry } from '../schema/record';
import { EFFECT_LABELS } from './tiers';

type Status = keyof typeof EFFECT_LABELS;
type Event = NonNullable<RecordEntry['timeline']>[number];

/** Ways in are lettered A, B, C… */
export const letter = (index: number) => String.fromCharCode(65 + index);

/** Owner placeholders such as "[link to add]" stay visible and marked. */
export const isPlaceholder = (value: string) => value.includes('[');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 2026-10-05 → "5 Oct 2026". */
export const niceDate = (iso: string) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/** Key dates, oldest first; an event with a time sorts after one without on the same day. */
export const sortedTimeline = (timeline: Event[] | undefined) =>
  [...(timeline ?? [])].sort((a, b) => `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`));

/** What an option does to each way in, in letter order (A, B, C…), so the letters never appear out of order. */
export const effectByWay = (vectors: string[], effects: { vector: string; status: Status }[]) =>
  vectors.flatMap((vector, i) => {
    const effect = effects.find((e) => e.vector === vector);
    return effect ? [{ letter: letter(i), status: effect.status, label: EFFECT_LABELS[effect.status].text }] : [];
  });
