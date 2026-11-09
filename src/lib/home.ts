// Groups published records by headline tier for the home page.
import { headlineTier, type RecordEntry } from '../schema/record';

/** Published records grouped by headline tier 1-3. Routine (tier 4) headlines are not listed. */
export function groupForHome(records: RecordEntry[]) {
  const published = records.filter((record) => record.status === 'published');
  return ([1, 2, 3] as const).map((tier) => ({
    tier,
    records: published.filter((record) => headlineTier(record) === tier)
  }));
}
