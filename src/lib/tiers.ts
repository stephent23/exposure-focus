// Tier names and meanings. Deliberately no hour or day counts: readers set their own time frames.
export const TIERS = {
  1: { name: 'Emergency', meaning: 'Drop everything. Give up the evening or weekend if you have to.' },
  2: { name: 'Urgent', meaning: 'Get it done as soon as you can, ahead of everything planned.' },
  3: { name: 'Prioritised', meaning: 'Sooner than your normal patching cycle. Schedule it.' },
  4: { name: 'Routine', meaning: 'Normal patching. No special action, and we do not track it.' }
} as const;

export type TierNumber = keyof typeof TIERS;

export const TIER_NUMBERS: TierNumber[] = [1, 2, 3, 4];

export const EFFECT_LABELS = {
  closed: { text: 'Closed' },
  closed_for_that_app: { text: 'Closed for that app' },
  open: { text: 'Left open' },
  weaker: { text: 'Partial mitigation' }
} as const;

export const CONFIDENCE_LABELS = {
  'vendor-stated': 'Vendor-stated',
  reported: 'Reported, not yet confirmed',
  inference: 'Inference'
} as const;
