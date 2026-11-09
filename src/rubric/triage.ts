// The triage rubric: facts about a placement in, tier 1-4 and a plain-English reason out.
/**
 * Business impact on the placement, including the worst outcome of any known exploit chain.
 * critical: control of the system, the most sensitive data, or a lasting outage of something the business cannot run without.
 * significant: a foothold, data of moderate value, or an essential service going down but recovering on its own.
 * limited: low-value information that does not help an attacker further, or a non-essential outage.
 */
export type TriageImpact = 'critical' | 'significant' | 'limited';

/** EPSS at or above this raises a call that rests on exploitation or a public exploit by one tier. Published on the rubric page. */
export const EPSS_ESCALATION_THRESHOLD = 0.5;

export type TriageFacts = {
  reachable?: boolean | 'unknown';
  /** Attacks are happening (CISA KEV or credible reports). */
  exploited?: boolean;
  /** A reliable exploit for the full outcome is public or circulating, or attackers are scanning for it: use is about to start. */
  exploitation_imminent?: boolean;
  /** Working exploit code is public, but it is a proof of concept, not known to be reliable. */
  public_exploit?: boolean;
  credible_researcher_claim?: boolean;
  /**
   * What the exploit evidence above actually achieves, when that is less than `impact`
   * (for example attacks or a proof of concept that only crash a service that could be taken over).
   * The evidence then counts against that lesser outcome, and the full outcome only as a researcher claim or no evidence.
   */
  exploit_achieves?: TriageImpact;
  no_login?: boolean;
  requires_login?: boolean;
  common_configuration?: boolean;
  rare_configuration?: boolean;
  /** The worst outcome the flaw allows on this placement. Not stated means assume the worst. */
  impact?: TriageImpact;
  vendor_stated_exposure_condition?: boolean;
  /** Other flaws in a known chain this rating relies on. The impact, evidence and login facts already describe the chain. */
  chained_with?: string[];
  /** Used one way only: it can raise a call by one tier, never lower one. */
  epss?: number;
};

export type Tier = 1 | 2 | 3 | 4;

type Evidence = 'exploited' | 'exploitation imminent' | 'public exploit' | 'credible researcher claim' | 'no evidence';

/** The three columns the rubric page shows, in table order. */
export const EVIDENCE_COLUMNS = [
  { key: 'attack', label: 'Exploited or imminent', description: 'Attacks are happening, a reliable exploit is public or circulating, or attackers are scanning for it.' },
  { key: 'demonstrated', label: 'Demonstrated', description: 'A proof of concept or a credible researcher claim, but no reliable exploit in use.' },
  { key: 'none', label: 'No evidence', description: 'Nothing shows it can be exploited yet.' }
] as const;

/** Impact levels, worst first. */
export const IMPACT_LEVELS: readonly TriageImpact[] = ['critical', 'significant', 'limited'];

/** Tier by impact level; each row follows EVIDENCE_COLUMNS order. The rubric page renders this table. */
export const IMPACT_TABLE: Record<TriageImpact, readonly Tier[]> = {
  critical: [1, 2, 3],
  significant: [2, 3, 4],
  limited: [3, 4, 4]
};

const COLUMN_OF: Record<Evidence, number> = {
  exploited: 0,
  'exploitation imminent': 0,
  'public exploit': 1,
  'credible researcher claim': 1,
  'no evidence': 2
};

function evidenceOf(facts: TriageFacts): Evidence {
  if (facts.exploited === true) return 'exploited';
  if (facts.exploitation_imminent === true) return 'exploitation imminent';
  if (facts.public_exploit === true) return 'public exploit';
  if (facts.credible_researcher_claim === true) return 'credible researcher claim';
  return 'no evidence';
}

const SEVERITY: Record<TriageImpact, number> = { critical: 3, significant: 2, limited: 1 };

export function triage(facts: TriageFacts): { tier: Tier; reason: string } {
  // Unknown counts as exposed: only an explicit false makes something unreachable or login-free.
  const reachable = facts.reachable !== false;
  const needsLogin = facts.no_login === false || facts.requires_login === true;
  const uncommonConfiguration = facts.rare_configuration === true || facts.common_configuration === false;

  // Gate: a vendor-stated exposure condition is false.
  if (facts.vendor_stated_exposure_condition === false) {
    return { tier: 4, reason: 'A vendor-stated exposure condition is false, so this is not exposed. Routine patching.' };
  }

  // Gate: not reachable from the internet. Routine patching; nothing special to do.
  if (!reachable) {
    return { tier: 4, reason: 'Not reachable from the internet. Routine patching.' };
  }

  const impact: TriageImpact = facts.impact ?? 'critical';
  const evidence = evidenceOf(facts);
  const attackEvidence = evidence === 'exploited' || evidence === 'exploitation imminent' || evidence === 'public exploit';
  const achieves = facts.exploit_achieves ?? impact;
  const partial = attackEvidence && SEVERITY[achieves] < SEVERITY[impact];

  let tier = IMPACT_TABLE[impact][COLUMN_OF[evidence]];
  let reason = `Reachable. Business impact: ${impact}${facts.impact ? '' : ' (not stated, so we assume the worst)'}. Evidence: ${evidence}.`;

  if (partial) {
    // The evidence only shows the lesser outcome. Rate that outcome on the evidence, and the full outcome as no more than demonstrated.
    const lesser = IMPACT_TABLE[achieves][COLUMN_OF[evidence]];
    const capability = IMPACT_TABLE[impact][facts.credible_researcher_claim ? 1 : 2];
    tier = Math.min(lesser, capability) as Tier;
    reason = `Reachable. Business impact: ${impact}. Evidence: ${evidence}, but it only achieves a ${achieves} outcome, so the ${impact} outcome counts as ${facts.credible_researcher_claim ? 'demonstrated' : 'unproven'}.`;
  }

  if (facts.chained_with && facts.chained_with.length > 0) {
    reason += ` Rated as part of a known chain with ${facts.chained_with.join(', ')}.`;
  }

  if (needsLogin || uncommonConfiguration) {
    // Harder to reach, so the call drops one tier. EPSS does not lift it back up.
    tier = Math.min(4, tier + 1) as Tier;
    reason += ' It needs a login or an uncommon configuration, so the call drops one tier.';
  } else if (
    typeof facts.epss === 'number' &&
    facts.epss >= EPSS_ESCALATION_THRESHOLD &&
    attackEvidence &&
    !partial &&
    tier > 1
  ) {
    tier = (tier - 1) as Tier;
    reason += ` EPSS is at or above ${EPSS_ESCALATION_THRESHOLD * 100}%, so the call rises one tier.`;
  }

  return { tier, reason };
}
