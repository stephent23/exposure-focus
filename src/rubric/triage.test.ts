import { describe, expect, it } from 'vitest';

import { triage, type TriageFacts } from './triage';

type Tier = 1 | 2 | 3 | 4;

// The published table: business impact on the placement (rows) by evidence of attack (columns).
const impacts = ['critical', 'significant', 'limited'] as const;

const evidence: Record<string, TriageFacts> = {
  exploited: { exploited: true },
  'public exploit': { public_exploit: true },
  'exploitation imminent': { exploitation_imminent: true },
  'credible claim': { credible_researcher_claim: true },
  none: {}
};

const table: Record<(typeof impacts)[number], Tier[]> = {
  critical: [1, 2, 3],
  significant: [2, 3, 4],
  limited: [3, 4, 4]
};

const column_of: Record<string, number> = { exploited: 0, 'exploitation imminent': 0, 'public exploit': 1, 'credible claim': 1, none: 2 };

const reachableNoLogin: TriageFacts = { reachable: true, no_login: true };

describe('triage: business impact by evidence', () => {
  for (const impact of impacts) {
    Object.keys(evidence).forEach((kind) => {
      const column = column_of[kind];
      it(`${impact} impact with ${kind} is Tier ${table[impact][column]}`, () => {
        expect(triage({ ...reachableNoLogin, impact, ...evidence[kind] }).tier).toBe(table[impact][column]);
      });
    });
  }

  it('assumes the worst when the impact is not stated', () => {
    expect(triage({ ...reachableNoLogin, exploited: true }).tier).toBe(1);
  });

  it('treats unknown reachability and unknown login as exposed', () => {
    expect(triage({ reachable: 'unknown', impact: 'critical', exploited: true }).tier).toBe(1);
    expect(triage({ impact: 'critical', public_exploit: true }).tier).toBe(2);
  });

  it('names the impact and evidence in the reason', () => {
    expect(triage({ ...reachableNoLogin, impact: 'significant', exploited: true }).reason).toMatch(/significant.*exploited/i);
  });
});

describe('triage: exploit chains', () => {
  it('rates a minor flaw by the worst outcome of a known chain', () => {
    const alone: TriageFacts = { ...reachableNoLogin, impact: 'limited' };
    const inChain: TriageFacts = { ...reachableNoLogin, impact: 'critical', exploited: true, chained_with: ['CVE-2024-0001'] };
    expect(triage(alone).tier).toBe(4);
    expect(triage(inChain).tier).toBe(1);
  });

  it('names the other links of the chain in the reason', () => {
    const { reason } = triage({ ...reachableNoLogin, impact: 'critical', exploited: true, chained_with: ['CVE-2024-0001', 'CVE-2024-0002'] });
    expect(reason).toContain('CVE-2024-0001');
    expect(reason).toContain('CVE-2024-0002');
  });

  it('does not let a chain change anything the facts do not say', () => {
    const facts: TriageFacts = { ...reachableNoLogin, impact: 'limited' };
    expect(triage({ ...facts, chained_with: ['CVE-2024-0001'] }).tier).toBe(triage(facts).tier);
  });
});

describe('triage: gates', () => {
  it('a false vendor-stated exposure condition is Tier 4, whatever else is true', () => {
    expect(triage({ vendor_stated_exposure_condition: false, exploited: true, no_login: true, impact: 'critical' }).tier).toBe(4);
  });

  it('not reachable is Tier 4 (Routine), whatever the evidence or impact', () => {
    for (const facts of Object.values(evidence)) {
      for (const impact of impacts) {
        expect(triage({ reachable: false, impact, ...facts }).tier).toBe(4);
      }
    }
  });

  it('explains an unreachable call as routine in its reason', () => {
    expect(triage({ reachable: false, impact: 'critical' }).reason).toMatch(/not reachable/i);
  });
});

describe('triage: needing a login or an uncommon configuration drops a call one tier', () => {
  it.each<[string, TriageFacts, Tier]>([
    ['exploited critical, login needed', { reachable: true, exploited: true, requires_login: true, impact: 'critical' }, 2],
    ['exploited critical, no_login false', { reachable: true, exploited: true, no_login: false, impact: 'critical' }, 2],
    ['exploited critical, rare configuration', { reachable: true, exploited: true, rare_configuration: true, impact: 'critical' }, 2],
    ['exploited critical, uncommon configuration', { reachable: true, exploited: true, common_configuration: false, impact: 'critical' }, 2],
    ['public-exploit critical, uncommon configuration', { reachable: true, public_exploit: true, common_configuration: false, impact: 'critical' }, 3],
    ['credible-claim critical, login needed', { reachable: true, credible_researcher_claim: true, requires_login: true, impact: 'critical' }, 3],
    ['critical with no evidence, login needed', { reachable: true, requires_login: true, impact: 'critical' }, 4],
    ['limited, exploited, login needed', { reachable: true, exploited: true, requires_login: true, impact: 'limited' }, 4]
  ])('%s', (_name, facts, expected) => {
    expect(triage(facts).tier).toBe(expected);
  });
});

describe('triage: golden cases', () => {
  it.each<[string, TriageFacts, Tier]>([
    ['PHP2Shell, internet-facing', { reachable: true, exploited: true, no_login: true, impact: 'critical' }, 1],
    ['PHP2Shell, internal-only', { reachable: false, no_login: true, impact: 'critical' }, 4],
    ['HTTP2Shell before KEV', { reachable: true, no_login: true, impact: 'critical', credible_researcher_claim: true }, 2],
    ['HTTP2Shell after KEV', { reachable: true, exploited: true, no_login: true, impact: 'critical', credible_researcher_claim: true }, 1],
    ['HTTP2Shell, never decodes untrusted Brotli', { vendor_stated_exposure_condition: false }, 4],
    ['Cisco ASA, business-critical VPN (device restarts)', { reachable: true, exploited: true, no_login: true, impact: 'significant' }, 2],
    ['Cisco ASA, backup VPN', { reachable: true, exploited: true, no_login: true, impact: 'limited' }, 3],
    ['Cisco ASA, a condition false', { vendor_stated_exposure_condition: false, exploited: true, no_login: true }, 4],
    ['Check Point CVE-2024-24919, blades on (reads credentials)', { reachable: true, exploited: true, no_login: true, impact: 'critical' }, 1],
    ['Check Point CVE-2024-24919, blades off', { vendor_stated_exposure_condition: false, exploited: true, no_login: true, impact: 'critical' }, 4],
    ['Linux TCP UAF, MPTCP listener', { reachable: true, no_login: true, impact: 'critical', credible_researcher_claim: true }, 2],
    ['Linux TCP UAF, internal only', { reachable: false, no_login: true, impact: 'critical' }, 4]
  ])('%s', (_name, facts, expected) => {
    expect(triage(facts).tier).toBe(expected);
  });
});

describe('triage: EPSS', () => {
  const publicExploit: TriageFacts = { ...reachableNoLogin, impact: 'critical', public_exploit: true, common_configuration: true };

  it('raises a call that rests on a public exploit from Tier 2 to Tier 1 at the threshold', () => {
    expect(triage({ ...publicExploit, epss: 0.49 }).tier).toBe(2);
    expect(triage({ ...publicExploit, epss: 0.5 }).tier).toBe(1);
  });

  it('raises every row that rests on exploitation or a public exploit by one tier, but not past Tier 1', () => {
    for (const impact of impacts) {
      for (const [column, kind] of [[0, 'exploited'], [1, 'public exploit']] as const) {
        const facts = { ...reachableNoLogin, impact, ...evidence[kind], epss: 0.9 };
        expect(triage(facts).tier, `${impact} / ${kind}`).toBe(Math.max(1, table[impact][column] - 1));
      }
    }
  });

  it('states the EPSS escalation in the reason', () => {
    expect(triage({ ...publicExploit, epss: 0.6 }).reason).toMatch(/EPSS/);
  });

  it('never lowers a tier, whatever the EPSS value', () => {
    const cases: TriageFacts[] = [
      publicExploit,
      { ...publicExploit, exploited: true },
      { ...reachableNoLogin, impact: 'critical', credible_researcher_claim: true },
      { reachable: false, impact: 'critical' },
      { vendor_stated_exposure_condition: false }
    ];
    for (const facts of cases) {
      const baseline = triage(facts).tier;
      for (const epss of [0, 0.01, 0.2, 0.49]) {
        expect(triage({ ...facts, epss }).tier).toBe(baseline);
      }
    }
  });

  it('does not escalate on EPSS without exploit evidence, outside exposure, or with a login or uncommon configuration', () => {
    expect(triage({ ...reachableNoLogin, impact: 'critical', credible_researcher_claim: true, epss: 0.9 }).tier).toBe(2);
    expect(triage({ ...reachableNoLogin, impact: 'critical', epss: 0.9 }).tier).toBe(3);
    expect(triage({ reachable: false, no_login: true, impact: 'critical', public_exploit: true, epss: 0.9 }).tier).toBe(4);
    expect(triage({ ...publicExploit, vendor_stated_exposure_condition: false, epss: 0.9 }).tier).toBe(4);
    expect(triage({ ...publicExploit, common_configuration: false, epss: 0.9 }).tier).toBe(3);
    expect(triage({ ...publicExploit, requires_login: true, epss: 0.9 }).tier).toBe(3);
  });
});

describe('triage: what the evidence actually achieves', () => {
  const base = { reachable: true, no_login: true, impact: 'critical' as const };

  it('imminent exploitation of the full outcome is as urgent as attacks', () => {
    expect(triage({ ...base, exploitation_imminent: true }).tier).toBe(1);
    expect(triage({ ...base, impact: 'significant', exploitation_imminent: true }).tier).toBe(2);
  });

  it('a proof of concept that only crashes a service that could be taken over is not an emergency', () => {
    expect(triage({ ...base, public_exploit: true }).tier).toBe(2);
    expect(triage({ ...base, public_exploit: true, exploit_achieves: 'limited' }).tier).toBe(3);
    expect(triage({ ...base, public_exploit: true, exploit_achieves: 'significant' }).tier).toBe(3);
  });

  it('attacks that only achieve a lesser outcome are rated on that outcome', () => {
    expect(triage({ ...base, exploited: true, exploit_achieves: 'significant' }).tier).toBe(2);
    expect(triage({ ...base, exploited: true, exploit_achieves: 'limited' }).tier).toBe(3);
  });

  it('the full outcome is still counted as demonstrated when researchers have shown it', () => {
    expect(triage({ ...base, exploited: true, exploit_achieves: 'limited', credible_researcher_claim: true }).tier).toBe(2);
  });

  it('does nothing when the evidence achieves the full outcome, and never lowers below the lesser outcome', () => {
    expect(triage({ ...base, exploited: true, exploit_achieves: 'critical' }).tier).toBe(1);
    expect(triage({ ...base, impact: 'limited', exploited: true, exploit_achieves: 'critical' }).tier).toBe(3);
  });

  it('does not escalate on EPSS when the evidence only achieves a lesser outcome', () => {
    expect(triage({ ...base, public_exploit: true, exploit_achieves: 'limited', epss: 0.9 }).tier).toBe(3);
  });
});
