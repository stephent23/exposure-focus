// The record schema: every fact needs a source and date, and declared tiers must agree with the rubric.
import { z } from 'zod';

import { ATTACK_KEYS } from '../lib/attacks';
import { isRealUrl } from '../lib/site';
import { triage, type Tier } from '../rubric/triage';

/** Length caps in characters. Long detail belongs in folded sections, not in these fields. */
export const CAPS = {
  summary: 200,
  leadershipQuote: 320,
  placementName: 70,
  placementAction: 140,
  question: 100,
  howToCheck: 240,
  mitigationTitle: 80,
  mitigationTakes: 120,
  product: 60,
  vulnerable: 80,
  fixed: 80,
  exposedWhen: 140
} as const;

const LINK_PLACEHOLDER = '[link to add]';
const CVE_PLACEHOLDER = '[CVE to confirm]';

export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date (UTC).');
export const text = z.string().trim().min(1);
const capped = (max: number) => text.max(max, `Keep this to ${max} characters or fewer.`);

// Rule 6: placeholders stay until the owner fills them in. Only https links to real hosts pass.
export const link = z.union([
  z.literal(LINK_PLACEHOLDER),
  z.string().refine(isRealUrl, { message: `Use a real https link (not an example.* host), or "${LINK_PLACEHOLDER}".` })
]);
export const slug = z.string().regex(/^[a-z0-9-]+$/);

const cve = z.union([z.literal(CVE_PLACEHOLDER), z.string().regex(/^CVE-\d{4}-\d{4,}$/)]);

const confidence = z.enum(['vendor-stated', 'reported', 'inference']);

const appliesCheckSchema = z.object({
  question: capped(CAPS.question),
  how_to_check: capped(CAPS.howToCheck),
});

// One row of the "Are you affected?" table. Omit fixed when no fix exists.
const affectedSchema = z
  .object({
    product: capped(CAPS.product),
    vulnerable: capped(CAPS.vulnerable),
    fixed: capped(CAPS.fixed).optional()
  })
  .strict();

// Mirrors TriageFacts. EPSS is not accepted here; it is a dated, sourced record-level field.
const triageFactsSchema = z
  .object({
    reachable: z.union([z.boolean(), z.literal('unknown')]).optional(),
    exploited: z.boolean().optional(),
    public_exploit: z.boolean().optional(),
    no_login: z.boolean().optional(),
    requires_login: z.boolean().optional(),
    common_configuration: z.boolean().optional(),
    rare_configuration: z.boolean().optional(),
    // Business impact on this placement, including the worst outcome of a known chain. Not stated means assume the worst.
    impact: z.enum(['critical', 'significant', 'limited']).optional(),
    chained_with: z.array(text).min(1).optional(),
    vendor_stated_exposure_condition: z.boolean().optional(),
    credible_researcher_claim: z.boolean().optional(),
    exploitation_imminent: z.boolean().optional(),
    exploit_achieves: z.enum(['critical', 'significant', 'limited']).optional()
  })
  .strict();

const placementSchema = z.object({
  name: capped(CAPS.placementName),
  facts: triageFactsSchema,
  why: z.array(text).min(1),
  tier: z.number().int().min(1).max(4),
  action: capped(CAPS.placementAction),
  override_reason: text.optional()
});

const mitigationSchema = z
  .object({
    title: capped(CAPS.mitigationTitle),
    summary: text,
    effect: z
      .array(
        z.object({
          vector: text,
          status: z.enum(['closed', 'closed_for_that_app', 'open', 'weaker'])
        })
      )
      .min(1),
    takes: capped(CAPS.mitigationTakes),
    might_break: text.optional(),
    cost: text.optional(),
    official_guides: z.array(link),
    check_it_worked: text,
    undo: text,
    confidence
  })
  .refine((m) => Boolean(m.might_break || m.cost), {
    message: 'A mitigation must say what it might break or what it costs.'
  });

const evidenceSchema = z.object({
  label: text,
  text,
  as_of: dateString,
  source_url: link,
  confidence
});

// A dated event with its own source and label, e.g. "Fix released". Time is optional and UTC.
const timelineSchema = z.object({
  event: text,
  date: dateString,
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM (UTC).').optional(),
  source_url: link,
  confidence
});

// One dated entry in a verdict's public change log. A tier move names the placement and both tiers.
const tierNumber = z.number().int().min(1).max(4);
const changeSchema = z
  .object({
    date: dateString,
    placement: text.optional(),
    from_tier: tierNumber.optional(),
    to_tier: tierNumber.optional(),
    reason: text,
    source_url: link
  })
  .strict()
  .refine((c) => new Set([c.placement, c.from_tier, c.to_tier].map((v) => v === undefined)).size === 1, {
    message: 'A tier move needs placement, from_tier and to_tier together.'
  })
  .refine((c) => c.from_tier === undefined || c.from_tier !== c.to_tier, { message: 'from_tier and to_tier must differ.' });

const sourceSchema = z.object({
  title: text,
  url: link,
  accessed: dateString
});

// EPSS can only raise a call by one tier (see triage.ts). It needs a date and a source like any fact.
const epssSchema = z.object({
  score: z.number().min(0).max(1),
  as_of: dateString,
  source_url: link
});

const wereYouHitSchema = z.object({
  assume_compromise_when: text,
  check: z.array(text),
  rotate: z.array(text)
});

const baseRecordSchema = z.object({
  slug,
  name: text,
  aliases: z.array(text),
  cves: z.array(cve).min(1),
  summary: capped(CAPS.summary),
  attack: z.enum(ATTACK_KEYS),
  status: z.enum(['draft', 'published', 'retired']),
  /** UTC date the verdict was first published. */
  published: dateString,
  evidence_as_of: dateString,
  review_until: dateString,
  leadership_quote: capped(CAPS.leadershipQuote),
  affected: z.array(affectedSchema).min(1),
  exposed_when: z.array(capped(CAPS.exposedWhen)).min(1).max(4).optional(),
  applies_check: z.array(appliesCheckSchema).min(1),
  placements: z.array(placementSchema).min(1),
  vectors: z.array(text).min(1),
  mitigations: z.array(mitigationSchema).min(1),
  evidence: z.array(evidenceSchema).min(1),
  timeline: z.array(timelineSchema).optional(),
  changes: z.array(changeSchema).optional(),
  epss: epssSchema.optional(),
  were_you_hit: wereYouHitSchema.optional(),
  sources: z.array(sourceSchema).min(1),
  /** Free-form markdown from below the front matter. */
  analysis: z.string().optional()
});

// Rule: the site names tiers but never gives an hour or day count for one.
export const TIMEFRAME = /\b\d+\s*(?:-|to|–)?\s*\d*\s*(?:hours?|hrs?|days?|weeks?)\b/i;

function findTimeframes(value: unknown, path = ''): string[] {
  if (typeof value === 'string') {
    const hit = value.match(TIMEFRAME);
    return hit ? [`${path}: "${hit[0].trim()}"`] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item, i) => findTimeframes(item, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => findTimeframes(item, path ? `${path}.${key}` : key));
  }
  return [];
}

export const recordSchema = baseRecordSchema.superRefine((record, ctx) => {
  record.placements.forEach((placement, i) => {
    const computed = placementResult(record, placement);
    if (computed.tier !== placement.tier && !placement.override_reason) {
      ctx.addIssue({
        code: 'custom',
        path: ['placements', i, 'tier'],
        message: `Declared tier ${placement.tier} disagrees with the rubric (tier ${computed.tier}: ${computed.reason}) and has no override_reason.`
      });
    }
  });

  // A rating that relies on an exploit chain must cite the chain like any other fact.
  const usesChain = record.placements.some((p) => p.facts.chained_with && p.facts.chained_with.length > 0);
  if (usesChain && !record.evidence.some((e) => /chain/i.test(e.label))) {
    ctx.addIssue({
      code: 'custom',
      path: ['evidence'],
      message: 'A placement relies on an exploit chain, so the evidence must include an item labelled "Exploit chain" with its source.'
    });
  }

  // "Exploitation about to start" is a judgement, so the record must say why and cite it.
  const usesImminent = record.placements.some((p) => p.facts.exploitation_imminent === true);
  if (usesImminent && !record.evidence.some((e) => /exploitation outlook/i.test(e.label))) {
    ctx.addIssue({
      code: 'custom',
      path: ['evidence'],
      message: 'A placement relies on "exploitation about to start", so the evidence must include an item labelled "Exploitation outlook" saying why, with its source.'
    });
  }

  if (record.published > record.evidence_as_of) {
    ctx.addIssue({ code: 'custom', path: ['published'], message: 'published cannot be after evidence_as_of.' });
  }

  // The change log must agree with the verdict: real placements, no future dates, and each placement's latest move ends on its tier.
  const latestMove = new Map<string, { date: string; to: number }>();
  (record.changes ?? []).forEach((change, i) => {
    if (change.date > record.evidence_as_of) {
      ctx.addIssue({ code: 'custom', path: ['changes', i, 'date'], message: 'A change cannot be dated after evidence_as_of.' });
    }
    if (change.placement === undefined || change.to_tier === undefined) return;
    if (!record.placements.some((p) => p.name === change.placement)) {
      ctx.addIssue({ code: 'custom', path: ['changes', i, 'placement'], message: `No placement is named "${change.placement}".` });
      return;
    }
    const seen = latestMove.get(change.placement);
    if (!seen || change.date >= seen.date) latestMove.set(change.placement, { date: change.date, to: change.to_tier });
  });
  for (const [name, move] of latestMove) {
    const tier = record.placements.find((p) => p.name === name)?.tier;
    if (tier !== move.to) {
      ctx.addIssue({ code: 'custom', path: ['changes'], message: `The latest change for "${name}" moves it to Tier ${move.to}, but its tier is ${tier}.` });
    }
  }

  for (const hit of findTimeframes(record)) {
    ctx.addIssue({ code: 'custom', message: `Tiers never carry hour or day counts: ${hit}` });
  }
});

export type RecordEntry = z.infer<typeof baseRecordSchema>;
type Placement = RecordEntry['placements'][number];

export function parseRecord(input: unknown): RecordEntry {
  return recordSchema.parse(input);
}

/** The rubric result for one placement, using the record's dated EPSS score if it has one. */
export function placementResult(record: Pick<RecordEntry, 'epss'>, placement: Placement) {
  return triage({ ...placement.facts, epss: record.epss?.score });
}

/** The first placement is the primary one. Its tier is the record's headline; conditional cases (edge device, exploited) come after it. */
export function headlinePlacement(record: RecordEntry): Placement {
  return record.placements[0];
}

export function headlineTier(record: RecordEntry): Tier {
  return headlinePlacement(record).tier as Tier;
}

/** For display only: most urgent first. The headline still comes from the first placement in the file. */
export function sortedPlacements(record: RecordEntry): Placement[] {
  return [...record.placements].sort((a, b) => a.tier - b.tier);
}

/** A published record past review_until is stale. Dates are UTC YYYY-MM-DD. */
export function isStale(record: RecordEntry, today: string): boolean {
  return record.status === 'published' && today > record.review_until;
}
