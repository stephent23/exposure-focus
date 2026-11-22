// Groups published records by headline tier for the home page.
import { headlineTier, type RecordEntry } from '../schema/record';
import { freshLabel } from './fresh-dates';
import { TIERS } from './tiers';

const latestChange = (r: RecordEntry) => (r.changes ?? []).map((c) => c.date).sort().at(-1) ?? '';

/** Newest first: by first publication date, then by latest logged change, then by name. */
export const byNewest = (a: RecordEntry, b: RecordEntry) =>
  b.published.localeCompare(a.published) ||
  latestChange(b).localeCompare(latestChange(a)) ||
  a.name.localeCompare(b.name);

/** Published records grouped by headline tier 1-3, newest first within each tier. Routine (tier 4) headlines are not listed. */
export function groupForHome(records: RecordEntry[]) {
  const published = records.filter((record) => record.status === 'published');
  return ([1, 2, 3] as const).map((tier) => ({
    tier,
    records: published.filter((record) => headlineTier(record) === tier).sort(byNewest)
  }));
}

export type Activity = { date: string; slug: string; name: string; kind: 'new' | 'moved' | 'updated'; detail: string; reason?: string };

/** What happened lately across all published verdicts: first publication and every logged change, newest first. */
export function recentActivity(records: RecordEntry[], limit = 6): Activity[] {
  const all = records
    .filter((r) => r.status === 'published')
    .flatMap((r): Activity[] => {
      const top = headlineTier(r);
      const base = { slug: r.slug, name: r.name };
      // A change on the day of first publication is part of the new verdict, so it is not listed twice.
      return [
        ...(r.changes ?? [])
          .filter((c) => c.date !== r.published)
          .map((c): Activity =>
            c.from_tier === undefined
              ? { ...base, date: c.date, kind: 'updated', detail: 'Verdict updated', reason: c.reason }
              : { ...base, date: c.date, kind: 'moved', detail: `Tier ${c.from_tier} to Tier ${c.to_tier}: ${c.placement}`, reason: c.reason }
          ),
        { ...base, date: r.published, kind: 'new', detail: `New verdict: Tier ${top} (${TIERS[top].name})` }
      ];
    });
  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/** The date of the latest logged change, if the verdict has ever changed. */
export const lastChanged = (record: RecordEntry) => (record.changes ?? []).map((c) => c.date).sort().at(-1);

/** "new" or "changed" when that happened within the last week, so the home page can flag it. */
export function freshness(record: RecordEntry, today: string): 'new' | 'changed' | null {
  const latest = lastChanged(record);
  // A change on the publication day is part of the new verdict, so it does not count as a change.
  const changed = latest !== undefined && latest > record.published ? latest : undefined;
  const label = freshLabel(record.published, changed, today);
  return label === 'New' ? 'new' : label === 'Changed' ? 'changed' : null;
}

/** Title of the first mitigation that is a real fix (not a stopgap), if any. */
export const fixTitle = (record: RecordEntry) => record.mitigations.find((m) => m.role === 'fix')?.title;

/** The latest logged tier move, only when it happened after the verdict was published. */
export function lastTierMove(record: RecordEntry): { date: string; from: number; to: number } | undefined {
  const moves = (record.changes ?? [])
    .filter((c) => c.to_tier !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = moves.at(-1);
  if (!latest || latest.date <= record.published || latest.to_tier === undefined) return undefined;
  return { date: latest.date, from: latest.from_tier ?? latest.to_tier, to: latest.to_tier };
}
