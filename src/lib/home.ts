// Groups published records by headline tier for the home page.
import { headlineTier, type RecordEntry } from '../schema/record';
import { TIERS } from './tiers';

/** Published records grouped by headline tier 1-3. Routine (tier 4) headlines are not listed. */
export function groupForHome(records: RecordEntry[]) {
  const published = records.filter((record) => record.status === 'published');
  return ([1, 2, 3] as const).map((tier) => ({
    tier,
    records: published.filter((record) => headlineTier(record) === tier)
  }));
}

export type Activity = { date: string; slug: string; name: string; kind: 'new' | 'moved' | 'updated'; detail: string };

/** What happened lately across all published verdicts: first publication and every logged change, newest first. */
export function recentActivity(records: RecordEntry[], limit = 6): Activity[] {
  const all = records
    .filter((r) => r.status === 'published')
    .flatMap((r): Activity[] => {
      const top = headlineTier(r);
      const base = { slug: r.slug, name: r.name };
      // Changes first, so on a shared date a change sorts above the first publication.
      return [
        ...(r.changes ?? []).map((c): Activity =>
          c.from_tier === undefined
            ? { ...base, date: c.date, kind: 'updated', detail: 'Verdict updated' }
            : { ...base, date: c.date, kind: 'moved', detail: `Tier ${c.from_tier} to Tier ${c.to_tier}: ${c.placement}` }
        ),
        { ...base, date: r.published, kind: 'new', detail: `New verdict: Tier ${top} (${TIERS[top].name})` }
      ];
    });
  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/** The date of the latest logged change, if the verdict has ever changed. */
export const lastChanged = (record: RecordEntry) => (record.changes ?? []).map((c) => c.date).sort().at(-1);

const daysBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86_400_000;

/** "new" or "changed" when that happened within the last week, so the home page can flag it. */
export function freshness(record: RecordEntry, today: string): 'new' | 'changed' | null {
  if (daysBetween(record.published, today) <= 7) return 'new';
  const changed = lastChanged(record);
  return changed && daysBetween(changed, today) <= 7 ? 'changed' : null;
}
