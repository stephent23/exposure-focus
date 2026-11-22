// Builds the plain-text summary a leader can paste into an email or chat.
import { headlineTier, type RecordEntry } from '../schema/record';
import { TIERS } from './tiers';

/** Plain text a leader can paste into an email or chat. Adds no hour or day counts. */
export function bossSummary(record: RecordEntry, pageUrl: string): string {
  const top = headlineTier(record);
  const lines = [
    `${record.name} (${record.cves.join(', ')}): Tier ${top}, ${TIERS[top].name}`,
    record.leadership_quote,
    `Evidence as of ${record.evidence_as_of} (UTC). Review by ${record.review_until}.`
  ];
  lines.push(pageUrl);
  return lines.join('\n');
}
