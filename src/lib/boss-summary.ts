// Builds the plain-text summary a leader can paste into an email or chat.
import { headlineTier, sortedPlacements, type RecordEntry } from '../schema/record';
import { TIERS } from './tiers';

/** Plain text a leader can paste into an email or chat. Adds no hour or day counts. */
export function bossSummary(record: RecordEntry, pageUrl: string): string {
  const top = headlineTier(record);
  const lines = [
    `${record.name} (${record.cves.join(', ')}): Tier ${top}, ${TIERS[top].name}`,
    record.summary,
    `For leadership: ${record.leadership_quote}`,
    ...sortedPlacements(record).map((p) => `Tier ${p.tier}: ${p.name}: ${p.action}`),
    `Evidence as of ${record.evidence_as_of} (UTC). Review by ${record.review_until}.`
  ];
  if (record.evidence.some((e) => e.confidence === 'reported')) lines.push('Some facts are not yet confirmed.');
  lines.push(pageUrl);
  return lines.join('\n');
}
