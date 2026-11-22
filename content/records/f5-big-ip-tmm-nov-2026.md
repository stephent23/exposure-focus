---
slug: f5-big-ip-tmm-nov-2026
name: F5 BIG-IP traffic engine overflows (November 2026)
aliases: []
cves: [CVE-2026-123637, CVE-2026-121805, CVE-2026-120292, CVE-2026-120285, CVE-2026-116953, CVE-2026-120722]
summary: "Six flaws in F5 BIG-IP's traffic engine let an outsider crash it, and possibly run code, but only where specific iRule commands or APM policies are in use. No attacks reported."
attack: rce
status: published
published: 2026-11-19
evidence_as_of: 2026-11-19
review_until: 2026-12-03

leadership_quote: "Risk: an outsider could knock F5 BIG-IP traffic offline, and possibly take over its traffic engine. Attacks: none reported, and each flaw needs an uncommon setup. Action: normal patching; check whether the affected features are used."
tier_reason: "Rated 9.8 by F5, but each flaw needs an uncommon iRule command or APM policy, and there is no exploit code or attack, so it is Routine; a confirmed affected setup deserves a quicker look."
would_change:
  - Urgent if exploit code is published, Emergency if attacks are reported, for set-ups that use the affected features
  - Higher if F5 widens the list of affected configurations

affected:
  - product: BIG-IP 21.1.x (all modules)
    vulnerable: 21.1.0 and later before the engineering hotfix
    fixed: Engineering hotfix BIGIP-21.1.0.4.0.19.3-ENG
  - product: BIG-IP 17.5.x (all modules)
    vulnerable: 17.5.0 and later before the engineering hotfixes
    fixed: "Engineering hotfix BIGIP-17.5.1.10.0.80.35-ENG or 17.5.1.11.0.61.12-ENG"
  - product: BIG-IP 17.1.x (all modules)
    vulnerable: 17.1.0 and later before the engineering hotfixes
    fixed: "Engineering hotfix BIGIP-17.1.3.6.0.14.20-ENG or 17.1.3.7.0.21.4-ENG"
  - product: BIG-IP Next for Kubernetes
    vulnerable: "2.2, 2.3 and 2.4 before the EHF1 builds (five of the six flaws)"
    fixed: "BNK-2.2.5-EHF1, BNK-2.3.4-EHF1, BNK-2.4.2-EHF1"
  - product: BIG-IP Next CNF
    vulnerable: "2.2, 2.3 and 2.4 (CVE-2026-121805, -120285, -120722 per CVE records)"
    fixed: "CNF-2.2.5-EHF1, 2.3.4-EHF1, 2.4.2-EHF1 named for two of the three (press)"
exposed_when:
  - "A virtual server's iRule uses PEM::subscriber, MR::message route, PSC::ip_address, GENERICMESSAGE::route or DNS::scrape"
  - "Or APM has a per-request policy with the Client Information and Endpoint Security agents on a virtual server"
  - An attacker can send traffic to that virtual server

applies_check:
  - question: Do any of your iRules use the affected commands?
    how_to_check: "Run `tmsh list ltm rule | grep -E 'PEM::subscriber|MR::message|PSC::ip_address|GENERICMESSAGE::route|DNS::scrape'`, then check which virtual servers use those iRules."
  - question: Does APM run a per-request policy with Client Information and Endpoint Security agents?
    how_to_check: "In the APM configuration, open each per-request policy attached to a virtual server and look for both agents."
  - question: Can outsiders send traffic to those virtual servers?
    how_to_check: "Check the listener address of each affected virtual server and whether firewall rules allow internet or partner traffic to it."

placements:
  - name: Internet-facing virtual server with an affected iRule or APM policy
    facts: { reachable: true, no_login: true, rare_configuration: true, impact: critical }
    why:
      - Reachable, and no login is needed (F5).
      - A crash stops the traffic engine; F5 says code execution may follow.
      - Each flaw needs a specific iRule command or APM policy that few deployments use.
      - No exploit code or attacks reported; CISA's assessment says no exploitation.
    tier: 4
    action: "Install F5's engineering hotfix after testing it, or take the affected iRule command out of use until you can."
  - name: BIG-IP without these iRule commands or APM policies
    facts: { vendor_stated_exposure_condition: false }
    why:
      - F5 lists each configuration as a condition; without it the flaw is not reachable.
    tier: 4
    action: Routine patching. Pick up the fixes in the next scheduled release.
  - name: Affected configuration reachable only from internal networks
    facts: { reachable: false, no_login: true, rare_configuration: true, impact: critical }
    why:
      - An outsider cannot reach the virtual server directly.
    tier: 4
    action: Routine patching. Move up if the virtual server becomes reachable from untrusted networks.

mitigations:
  - title: Install F5's engineering hotfix for your release
    limitation: "Hotfixes get less testing than scheduled releases; no scheduled fix yet"
    role: fix
    official_guides:
      - https://thehackernews.com/2026/11/f5-warns-6-critical-big-ip-flaws-can.html
      - https://cveawg.mitre.org/api/cve/CVE-2026-120292
    confidence: vendor-stated
  - title: Take the affected iRule commands or APM agents out of use
    limitation: "F5 lists no workaround; breaks whatever the iRule or policy does"
    role: stopgap
    official_guides: [https://cveawg.mitre.org/api/cve/CVE-2026-120292]
    confidence: inference

evidence:
  - label: Vendor advisory
    text: "F5's CVE records (published 18 Nov 2026) describe six stack-based buffer overflows (CWE-121) in which 'undisclosed requests can cause the Traffic Management Microkernel (TMM) to terminate', with possible remote code execution. Each needs a stated configuration. F5 says there is no control plane exposure and lists no workaround. CVSS 3.1 9.8 and 4.0 9.3 (reference only). F5's K-articles (K000163937 to K000163946, notice K000164058) did not render, so their text was not read."
    as_of: 2026-11-19
    source_url: https://cveawg.mitre.org/api/cve/CVE-2026-120292
    confidence: vendor-stated
  - label: Fixed releases
    text: "The CVE records list fixed engineering builds for BIG-IP 21.1, 17.5 and 17.1 and EHF1 builds for BIG-IP Next for Kubernetes. The Hacker News reports F5 offers engineering hotfixes only, with no scheduled release listed as a fix, and quotes F5 that such hotfixes 'do not undergo the extensive QA assessment of scheduled software releases'. It names CNF EHF1 builds for CVE-2026-121805 and -120285. End-of-support versions were not evaluated."
    as_of: 2026-11-19
    source_url: https://thehackernews.com/2026/11/f5-warns-6-critical-big-ip-flaws-can.html
    confidence: reported
  - label: Observed attacker activity
    text: "CISA's assessment attached to each CVE record (18 Nov) gives exploitation 'none', automatable 'yes', technical impact 'total'. The Hacker News says none of F5's advisories report exploitation. No KEV listing was seen; the KEV catalogue itself was not checked for these CVEs."
    as_of: 2026-11-19
    source_url: https://cveawg.mitre.org/api/cve/CVE-2026-123637
    confidence: vendor-stated
  - label: Public exploit code
    text: "No public exploit code, write-up or demonstration was found. The CVE records credit four flaws to Sina Kheirkhah of watchTowr and two to F5's own testing; no watchTowr write-up was found on 19 Nov."
    as_of: 2026-11-19
    source_url: https://cveawg.mitre.org/api/cve/CVE-2026-120285
    confidence: reported

timeline:
  - { event: "F5 publishes the advisories and engineering hotfixes", date: 2026-11-18, time: "15:00", source_url: "https://cveawg.mitre.org/api/cve/CVE-2026-120292", confidence: vendor-stated }
  - { event: "CVE records updated", date: 2026-11-19, time: "04:56", source_url: "https://cveawg.mitre.org/api/cve/CVE-2026-120292", confidence: vendor-stated }

sources:
  - { title: "CVE-2026-123637 record (F5)", url: "https://cveawg.mitre.org/api/cve/CVE-2026-123637", accessed: 2026-11-19 }
  - { title: "CVE-2026-121805 record (F5)", url: "https://cveawg.mitre.org/api/cve/CVE-2026-121805", accessed: 2026-11-19 }
  - { title: "CVE-2026-120292 record (F5)", url: "https://cveawg.mitre.org/api/cve/CVE-2026-120292", accessed: 2026-11-19 }
  - { title: "CVE-2026-120285 record (F5)", url: "https://cveawg.mitre.org/api/cve/CVE-2026-120285", accessed: 2026-11-19 }
  - { title: "CVE-2026-116953 record (F5)", url: "https://cveawg.mitre.org/api/cve/CVE-2026-116953", accessed: 2026-11-19 }
  - { title: "CVE-2026-120722 record (F5)", url: "https://cveawg.mitre.org/api/cve/CVE-2026-120722", accessed: 2026-11-19 }
  - { title: "The Hacker News: F5 warns 6 critical BIG-IP flaws can crash traffic in specific setups", url: "https://thehackernews.com/2026/11/f5-warns-6-critical-big-ip-flaws-can.html", accessed: 2026-11-19 }
---

## Why Routine, despite a 9.8

Each flaw is reachable only through one configuration: an iRule using PEM::subscriber, MR::message route, PSC::ip_address, GENERICMESSAGE::route or DNS::scrape on client traffic, or an APM per-request policy combining the Client Information and Endpoint Security agents. Most BIG-IP deployments use none of these, so the rubric drops the call one tier, from Prioritised to Routine. There is no exploit code, no published demonstration and no reported attack. If your check finds one of these configurations on an internet-facing virtual server, treat it as more pressing than Routine: a crash of TMM stops all traffic through that BIG-IP until it restarts.

The fixes are engineering hotfixes, which F5 says get less testing than scheduled releases, so test them first. F5 lists no workaround. Taking the affected iRule command or APM agent out of use removes the trigger, but that is an inference, not F5's advice, and it stops whatever that iRule or policy does. No WAF or CDN rule was found; these requests reach the BIG-IP itself, which is often the WAF.

F5's K-articles could not be read here, so the configuration list and fixed builds come from F5's own CVE records, with the CNF fixes from The Hacker News. One record (CVE-2026-121805) lists BIG-IP Next CNF under a DNS::scrape module name, which looks like a copying error by F5. The same release also fixed lower-rated iControl REST, iControl SOAP and APM SAML flaws, which are not rated here.
