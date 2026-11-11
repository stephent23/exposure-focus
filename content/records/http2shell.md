---
slug: http2shell
name: HTTP2Shell
aliases: [Node2Shell, Broccoli2Shell]
cves: [CVE-2026-111497]
summary: A memory-corruption flaw in the Brotli decoder can let an attacker crash, read from or possibly run code in applications that decompress attacker-supplied Brotli data. CISA lists it as exploited, but no source reviewed reports code execution in the wild. It is rated Tier 3, an editorial call.
attack: rce
status: published
evidence_as_of: 2026-11-09
review_until: 2026-11-23
leadership_quote: A flaw in a widely used compression library can let an outsider crash applications that unpack untrusted compressed data, and in a research demonstration run code in them. CISA lists it as exploited, but the sources reviewed report no attackers taking over systems with it. Where an application unpacks untrusted compressed data, schedule the update ahead of normal patching.

applies_check:
  - question: Does any application you run decompress Brotli data that an outsider can influence?
    how_to_check: "Check Node.js (`node --version`) against the fixed releases 22.23.4, 24.22.1 and 26.12.1, and look for other products that bundle Google's Brotli decoder: Python's brotli package, other runtimes, proxies and container images. Receiving a Brotli body does not decode it; something in your code or middleware has to call the decoder, so also ask which services decompress request bodies or replies from servers you do not control."

placements:
  - name: Application that decodes untrusted Brotli data
    facts: { reachable: true, exploited: true, exploit_achieves: significant, credible_researcher_claim: true, no_login: true, impact: critical }
    why:
      - Reachable by an outsider who can supply Brotli data.
      - Listed in CISA KEV on 2026-10-27 (vendor-stated exploitation; the kind of exploitation is not described).
      - No login needed.
      - Memory corruption that can lead to code execution; a researcher demonstrated it on stock Node.js but needed multiple attempts.
      - Reported attacks are attempts or reconnaissance; what they achieve is treated as at most a crash, an inference.
    tier: 3
    override_reason: "Editorial judgment, not a sourced fact. The rubric gives Tier 2: CISA lists exploitation, but no source reviewed shows attacks achieving code execution, and Imperva's code execution counts as demonstrated only. It is rated Tier 3 because the one demonstrated code execution needed multiple attempts and no source reports code execution in the wild. Zscaler reports reconnaissance and exploitation attempts. Wiz says no self-contained remote exploit for code execution has been publicly confirmed. The call moves up if a reliable public exploit for code execution appears or code execution is reported in the wild."
    action: "Prioritised: sooner than your normal patching cycle, schedule it. Update every affected runtime and library, rebuild container images and restart processes. If you cannot soon, block Brotli-compressed input first."
  - name: Only decodes Brotli from sources you control
    facts: { reachable: false, exploited: true, no_login: true, impact: critical }
    why:
      - An outsider cannot supply the compressed data.
    tier: 4
    action: Update in your normal cycle. Move up if an outsider could influence that data.
  - name: Never decodes untrusted Brotli
    facts: { vendor_stated_exposure_condition: false }
    why:
      - Node.js states the condition for exposure is an attacker supplying Brotli data that the application decompresses.
    tier: 4
    action: No special action. Routine patching.

vectors:
  - Attacker sends compressed data to your server
  - Your application unpacks a compressed reply from an attacker-controlled server

mitigations:
  - title: Update every affected runtime and library
    summary: "Node.js has released 22.23.4, 24.22.1 and 26.12.1. CISA points to Brotli release v1.2.1 for the library. Other products that bundle the decoder need their own update. Patching one runtime does not fix the others. Rebuild container images and restart every process, or the old code keeps running."
    effect:
      - { vector: Attacker sends compressed data to your server, status: closed }
      - { vector: Your application unpacks a compressed reply from an attacker-controlled server, status: closed }
    takes: An update, a rebuild and a restart for each affected product.
    might_break: No breakage is reported. Test first anyway. Old versions of runtimes that are out of support will not get a fix and need upgrading.
    official_guides:
      - https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
      - https://github.com/google/brotli/releases/tag/v1.2.1
    check_it_worked: "Ask the running service, not the image tag. Inside the container run `node --version` or the equivalent for each runtime, and confirm the process started after the update."
    undo: Redeploy the previous image. This reopens the flaw, so put the block below in place first.
    confidence: vendor-stated
  - title: Block Brotli-compressed requests at your WAF, proxy or firewall
    summary: "Microsoft's Azure WAF guidance is a custom rule that blocks requests whose `Content-Encoding` header contains `br`. Imperva has added WAF rules for this CVE and Fastly has a virtual patch for it; check whether your own WAF vendor has one. This protects applications behind the WAF but does nothing for replies your application downloads from other servers, so it is a stopgap until you update."
    effect:
      - { vector: Attacker sends compressed data to your server, status: closed_for_that_app }
      - { vector: Your application unpacks a compressed reply from an attacker-controlled server, status: open }
    takes: Turn on your vendor's rule or virtual patch, or add one header rule that covers every application behind the WAF.
    might_break: Clients that send Brotli-compressed uploads will be rejected. Azure suggests starting in log-only mode and checking the logs for legitimate compressed uploads before blocking.
    official_guides:
      - https://techcommunity.microsoft.com/t5/azure-network-security-blog/protect-against-brotli-cve-2026-111497-with-azure-web/ba-p/4567288
      - https://www.imperva.com/blog/node2shell-from-brotli-data-to-remote-code-execution/
      - https://www.fastly.com/documentation/reference/changes/2026/10/added-virtual-patch-for-cve-2026-111497/
      - https://bleepingcomputer.com/news/security/critical-http2shell-brotli-vulnerability-triggers-emergency-patches
    check_it_worked: "Send a harmless request with a `Content-Encoding: br` header and confirm the WAF logs or rejects it. Then confirm the rule applies to every hostname that serves your applications."
    undo: Disable the rule or virtual patch. Its log shows which clients it blocked.
    confidence: vendor-stated

evidence:
  - label: CISA KEV
    text: "Listed in the Known Exploited Vulnerabilities catalog as a Google Brotli unchecked return value flaw. Added 2026-10-27, federal due date 2026-11-10. CISA's description says a remote, unauthenticated attacker can use a crafted Brotli stream to corrupt decoder memory, leak memory, cause denial of service, or possibly execute code."
    as_of: 2026-11-09
    source_url: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
    confidence: vendor-stated
  - label: Vendor advisory
    text: "Node.js: malformed compressed input can write past the end of an internal decoder buffer, leading to a crash, disclosure of process memory or remote code execution. Affects 26.x, 24.x and 22.x; fixed in 22.23.4, 24.22.1 and 26.12.1. Node.js labels it high."
    as_of: 2026-11-09
    source_url: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
    confidence: vendor-stated
  - label: Exploit evidence
    text: "BleepingComputer reports CISA confirmed attackers have begun exploiting it. The article gives no detail on who, how widely or what the attackers achieved, and does not say whether public exploit code exists."
    as_of: 2026-11-09
    source_url: https://www.bleepingcomputer.com/news/security/cisa-warns-of-hackers-now-exploiting-critical-node2shell-flaw/
    confidence: reported
  - label: Research proof of concept
    text: "Imperva reports a proof of concept that ran code carried in a Brotli response or request body on the official Node.js 24.22.0 Linux arm64 image, with no debugger or instrumented binary. It says the proof did not succeed on every attempt and execution took multiple attempts in their setup. It tested only the listed Linux arm64 builds and application setups. Node.js 24.22.1 rejected the same inputs."
    as_of: 2026-11-09
    source_url: https://www.imperva.com/blog/node2shell-from-brotli-data-to-remote-code-execution/
    confidence: reported
  - label: Public exploit code
    text: "Wiz states multiple public proof-of-concept repositories on GitHub demonstrate denial of service and memory corruption, that one demonstrates local code execution while requiring a deterministic memory layout, and that no self-contained remote RCE exploit has been publicly confirmed. Those repositories were not inspected. BleepingComputer separately says proof-of-concept exploits have been published."
    as_of: 2026-11-09
    source_url: https://www.wiz.io/vulnerability-database/cve/cve-2026-111497
    confidence: reported
  - label: Observed attacker activity
    text: "Zscaler ThreatLabz reports its deception systems recorded reconnaissance and exploitation attempts after disclosure (40% reconnaissance, 60% exploitation attempts). The post does not report confirmed code execution; it lists crashes only as indicators to monitor. Aikido cited The Hacker News reporting no exploitation in the wild as of October 22, before CISA's listing. No source reviewed reports code execution achieved in the wild."
    as_of: 2026-11-09
    source_url: https://www.zscaler.com/blogs/security-research/cve-2026-111497-node2shell-http2shell-vulnerability-may-allow-rce
    confidence: reported
  - label: Cause of the flaw
    text: "Node.js says an invalid block switch was reported as a temporary need for more input instead of a permanent format error, so the streaming decoder kept appending input bytes to an eight-byte internal buffer. Node.js does not say how reliable code execution is."
    as_of: 2026-11-09
    source_url: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
    confidence: vendor-stated
  - label: Vendor report
    text: "Sophos describes a critical buffer overflow rated 9.2. The score's version and assigner are not confirmed; it is shown for reference only."
    as_of: 2026-11-09
    source_url: https://www.sophos.com/blog/node2shell-cve-2026-111497-in-active-exploitation
    confidence: reported

timeline:
  - { event: "Node.js releases fixed versions (22.23.4, 24.22.1, 26.12.1)", date: 2026-10-21, source_url: "https://nodejs.org/en/blog/vulnerability/october-2026-security-releases", confidence: vendor-stated }
  - { event: "Added to CISA's Known Exploited Vulnerabilities catalogue", date: 2026-10-27, source_url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", confidence: vendor-stated }

sources:
  - title: Node.js October 2026 security releases
    url: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
    accessed: 2026-11-09
  - title: CISA Known Exploited Vulnerabilities catalog
    url: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
    accessed: 2026-11-09
  - title: Azure WAF guidance for CVE-2026-111497
    url: https://techcommunity.microsoft.com/t5/azure-network-security-blog/protect-against-brotli-cve-2026-111497-with-azure-web/ba-p/4567288
    accessed: 2026-11-09
  - title: Fastly virtual patch for CVE-2026-111497
    url: https://www.fastly.com/documentation/reference/changes/2026/10/added-virtual-patch-for-cve-2026-111497/
    accessed: 2026-11-09
  - title: Google Brotli release v1.2.1
    url: https://github.com/google/brotli/releases/tag/v1.2.1
    accessed: 2026-11-09
  - title: "BleepingComputer: CISA warns of hackers now exploiting critical Node2Shell flaw"
    url: https://www.bleepingcomputer.com/news/security/cisa-warns-of-hackers-now-exploiting-critical-node2shell-flaw/
    accessed: 2026-11-09
  - title: "Sophos: Node2Shell (CVE-2026-111497) in active exploitation"
    url: https://www.sophos.com/blog/node2shell-cve-2026-111497-in-active-exploitation
    accessed: 2026-11-09
  - title: "Imperva: Node2Shell, from Brotli data to remote code execution"
    url: https://www.imperva.com/blog/node2shell-from-brotli-data-to-remote-code-execution/
    accessed: 2026-11-09
  - title: "Aikido: Python packages vulnerable to Node2Shell (CVE-2026-111497)"
    url: https://www.aikido.dev/blog/python-packages-vulnerable-node2shell-brotli-cve-2026-111497
    accessed: 2026-11-09
  - title: "Zscaler ThreatLabz: CVE-2026-111497 Node2Shell / HTTP2Shell"
    url: https://www.zscaler.com/blogs/security-research/cve-2026-111497-node2shell-http2shell-vulnerability-may-allow-rce
    accessed: 2026-11-09
  - title: "Wiz vulnerability database: CVE-2026-111497"
    url: https://www.wiz.io/vulnerability-database/cve/cve-2026-111497
    accessed: 2026-11-09
  - title: "BleepingComputer: Critical HTTP2Shell Brotli vulnerability triggers emergency patches"
    url: https://bleepingcomputer.com/news/security/critical-http2shell-brotli-vulnerability-triggers-emergency-patches
    accessed: 2026-11-09
---

The "HTTP2" in the name is misleading: the flaw is in the shared Brotli decoder and has nothing to do with the HTTP/2 protocol. That is why one patch is not enough.

Affected Brotli library versions and the CVSS vector are not stated here. The Node.js advisory and the CISA catalogue entry are the main sources.

## Why this call is calmer than CISA's

This section is an editorial judgment. It is not a sourced fact, and it overrides the rubric's Tier 2.

- CISA lists the flaw as exploited without saying what attackers achieved.
- Zscaler reports reconnaissance and exploitation attempts, not confirmed code execution.
- Imperva demonstrated code execution on stock Node.js 24.22.0 (Linux arm64), but only after multiple attempts.
- Wiz says the one public code-execution proof of concept is local and needs a deterministic memory layout, and that no self-contained remote exploit has been publicly confirmed.
- No source reviewed reports code execution in the wild. That is not proof there has been none.

The call moves up if a reliable public exploit for code execution appears or code execution is reported in the wild.
