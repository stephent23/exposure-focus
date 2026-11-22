// Plain-language definitions for the terms a verdict page uses. The page lists the ones that appear on it.
import type { RecordEntry } from '../schema/record';

export type Term = { term: string; definition: string; link?: { href: string; text: string } };

type Entry = Term & { pattern?: RegExp };

// Always shown: the words the page itself is built from.
const CORE: Entry[] = [
  {
    term: 'Tier',
    definition: 'How soon to act: Tier 1 Emergency, Tier 2 Urgent, Tier 3 Prioritised (sooner than your normal cycle), Tier 4 Routine (your normal cycle). Each organisation sets its own time frames.'
  },
  {
    term: 'Where it runs',
    definition: 'Where the software sits in your setup, for example reachable from the internet or on an internal network only. Each case gets its own tier, because the same flaw is more urgent where attackers can reach it.'
  },
  {
    term: 'The rules (rubric)',
    definition: 'The published rules that turn the facts (can attackers reach it, is it exploited, do they need a login, how bad is the outcome) into a tier.',
    link: { href: '/rubric/', text: 'Read the rules' }
  }
];

// Shown only when the record uses the term.
const OPTIONAL: Entry[] = [
  {
    term: 'Capped at Tier 3',
    pattern: /"used_internally":true|"chained_with"/,
    definition: 'Software that outsiders cannot reach is rated as if they could when attackers are reported using the flaw from inside networks, or it is part of a known attack chain, but never above Tier 3 (Prioritised).'
  },
  {
    term: 'Editorial call',
    pattern: /override_reason/,
    definition: 'The tier shown differs from the one the rules give. The reason is written out beside it and is a judgement, not a sourced fact.'
  },
  { term: 'KEV', pattern: /\bKEV\b|Known Exploited/, definition: "CISA's Known Exploited Vulnerabilities catalog: the US government's list of flaws it has evidence attackers are using." },
  { term: 'CISA', pattern: /\bCISA\b/, definition: 'The US Cybersecurity and Infrastructure Security Agency.' },
  { term: 'CVE', pattern: /\bCVE-/, definition: 'Common Vulnerabilities and Exposures: the public ID given to a known flaw, such as CVE-2026-12345.' },
  { term: 'CVSS', pattern: /\bCVSS\b/, definition: 'A general severity score from 0 to 10. Shown for reference only; it never sets a tier here.' },
  { term: 'EPSS', pattern: /\bEPSS\b/, definition: 'Exploit Prediction Scoring System: an estimate of how likely a flaw is to be exploited soon.' },
  { term: 'Proof of concept (PoC)', pattern: /\bPoC\b|proof of concept|proof-of-concept/i, definition: 'Code that shows a flaw can be triggered. It is not always a reliable attack tool.' },
  { term: 'RCE', pattern: /\bRCE\b|remote code execution/i, definition: 'Remote code execution: an attacker can run their own commands on the system.' },
  { term: 'WAF', pattern: /\bWAF\b/, definition: 'Web application firewall: a filter in front of web traffic that can block known attack patterns.' },
  { term: 'SSO', pattern: /\bSSO\b/, definition: 'Single sign-on: one login that grants access to many systems.' },
  { term: 'VCF', pattern: /\bVCF\b/, definition: "VMware Cloud Foundation: Broadcom's bundle of vSphere, vCenter and related products." },
  { term: 'IOC', pattern: /\bIOCs?\b|indicators? of compromise/i, definition: 'Indicator of compromise: a file, address or log entry that suggests an attacker has been on a system.' },
  { term: 'Stopgap', pattern: /role:\s*stopgap|"role":"stopgap"/, definition: 'A measure that reduces the risk until you can install the fix. It does not remove the flaw.' }
];

/** The terms a record's page needs, in a stable order: the core three, then any optional term the record uses. */
export function termsFor(record: RecordEntry): Term[] {
  const haystack = JSON.stringify(record);
  return [...CORE, ...OPTIONAL.filter((t) => t.pattern?.test(haystack))].map(({ term, definition, link }) =>
    link ? { term, definition, link } : { term, definition }
  );
}
