---
slug: http2shell
name: HTTP2Shell
aliases: [Node2Shell, Broccoli2Shell]
cves: [CVE-2026-111497]
summary: A Brotli decoder flaw may let attackers crash or possibly run code in apps that decode untrusted Brotli. CISA lists it as exploited; no source reports code execution in the wild. Tier 3 is editorial.
attack: rce
status: published
published: 2026-11-09
evidence_as_of: 2026-11-22
review_until: 2026-12-07
leadership_quote: A flaw in a widely used compression library can let an outsider crash applications that unpack untrusted compressed data, and in a research demonstration run code in them. CISA lists it as exploited, but sources reviewed report no takeovers. Update ahead of normal patching where untrusted data is unpacked.
tier_reason: "CISA lists it as exploited, which the rubric rates Tier 2. It is held at Tier 3 as an editorial call: no source reviewed reports code execution in the wild."
would_change:
  - Moves up if a reliable public exploit for code execution appears, or code execution is reported in the wild
affected:
  - product: Node.js 22.x, 24.x and 26.x
    vulnerable: "22.0.0-22.23.3, 24.0.0-24.22.0, 26.0.0-26.12.0 (per Zscaler and Wiz)"
    fixed: "22.23.4, 24.22.1, 26.12.1"
  - product: Google Brotli library
    vulnerable: "1.0.3 to 1.2.0 (per Wiz; Google states no range)"
    fixed: v1.2.1
  - product: Other products that bundle the Brotli decoder
    vulnerable: Depends on the bundled Brotli version; ask the vendor
exposed_when:
  - An application decompresses Brotli data that an attacker can supply
  - "Your code or middleware calls the decoder: receiving a Brotli body alone does not decode it"

applies_check:
  - question: Does any application you run decompress Brotli data that an outsider can influence?
    how_to_check: "Run `node --version`; look for other products that bundle Google's Brotli decoder: Python's brotli package, other runtimes, proxies, container images. Ask which services decompress request bodies or replies from servers you do not control."

placements:
  - name: Application that decodes untrusted Brotli data
    facts: { reachable: true, exploited: true, exploit_achieves: significant, credible_researcher_claim: true, no_login: true, impact: critical }
    why:
      - In CISA KEV since 2026-10-27; no login needed.
      - Code execution was demonstrated on stock Node.js, but needed multiple attempts.
      - Reported attacks are attempts or reconnaissance, treated as at most a crash (inference).
    tier: 3
    override_reason: "Editorial judgment: the rubric gives Tier 2 because CISA lists exploitation, but no source shows attacks achieving code execution, and the one demonstration needed multiple attempts."
    action: "Update sooner than your normal cycle: every runtime and library, rebuild images, restart. If you cannot soon, block Brotli input first."
  - name: Only decodes Brotli from sources you control
    facts: { reachable: false, exploited: true, no_login: true, impact: critical }
    why:
      - An outsider cannot supply the compressed data.
    tier: 4
    action: Update in your normal cycle.
mitigations:
  - title: "Update Node.js and Brotli, rebuild images, restart"
    limitation: "Each bundled product needs its own update; old runtimes get no fix"
    role: fix
    official_guides:
      - https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
      - https://github.com/google/brotli/releases/tag/v1.2.1
    confidence: vendor-stated
  - title: "Block Brotli uploads at the WAF"
    limitation: "Misses replies your app downloads; rejects Brotli uploads"
    role: stopgap
    official_guides:
      - https://techcommunity.microsoft.com/t5/azure-network-security-blog/protect-against-brotli-cve-2026-111497-with-azure-web/ba-p/4567288
      - https://www.imperva.com/blog/node2shell-from-brotli-data-to-remote-code-execution/
      - https://www.fastly.com/documentation/reference/changes/2026/10/added-virtual-patch-for-cve-2026-111497/
      - https://bleepingcomputer.com/news/security/critical-http2shell-brotli-vulnerability-triggers-emergency-patches
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
  - label: Affected versions
    text: "Node.js names only the affected lines (22.x, 24.x, 26.x) and the fixed releases, and says end-of-life versions are always affected. Zscaler lists 22.0.0 to 22.23.3, 24.0.0 to 24.22.0 and 26.0.0 to 26.12.0; Wiz says the same and gives Brotli 1.0.3 to 1.2.0, on a page it says was AI-generated."
    as_of: 2026-11-22
    source_url: https://www.zscaler.com/blogs/security-research/cve-2026-111497-node2shell-http2shell-vulnerability-may-allow-rce
    confidence: reported
  - label: Vendor report
    text: "Sophos describes a critical buffer overflow rated 9.2. The score's version and assigner are not confirmed; it is shown for reference only."
    as_of: 2026-11-09
    source_url: https://www.sophos.com/blog/node2shell-cve-2026-111497-in-active-exploitation
    confidence: reported

were_you_hit:
  assume_compromise_when: "An unfixed app that decodes untrusted Brotli crashed or misbehaved after compressed input, then spawned processes or made outbound connections."
  check:
    - "Unexpected crashes or segfaults in Node.js, Python, .NET, Envoy or service-mesh workloads after compressed requests (Zscaler)"
    - "Requests with `Content-Encoding: br` to endpoints that do not normally take compressed bodies"
    - "Unexpected child processes or outbound connections from those runtimes after a crash"
  rotate:
    - "Secrets and tokens the affected process could read, if code execution is suspected"
  guides:
    - { title: "Zscaler ThreatLabz: what to monitor, plus source IPs seen probing", url: "https://www.zscaler.com/blogs/security-research/cve-2026-111497-node2shell-http2shell-vulnerability-may-allow-rce" }

timeline:
  - { event: "Node.js releases fixed versions (22.23.4, 24.22.1, 26.12.1)", date: 2026-10-21, source_url: "https://nodejs.org/en/blog/vulnerability/october-2026-security-releases", confidence: vendor-stated }
  - { event: "Added to CISA's Known Exploited Vulnerabilities catalogue", date: 2026-10-27, source_url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", confidence: vendor-stated }

changes:
  - date: 2026-11-22
    reason: "Added affected version ranges and monitoring guidance; tiers unchanged."
    source_url: https://www.zscaler.com/blogs/security-research/cve-2026-111497-node2shell-http2shell-vulnerability-may-allow-rce

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

The "HTTP2" in the name is misleading: the flaw is in the shared Brotli decoder, not the HTTP/2 protocol, so every runtime, library and bundled copy needs its own update. The call is calmer than CISA's listing suggests because Zscaler reports only attempts and reconnaissance, and Wiz says no self-contained remote code-execution exploit has been publicly confirmed. For the WAF stopgap, Azure suggests starting the `Content-Encoding: br` block in log-only mode to spot legitimate Brotli uploads.
