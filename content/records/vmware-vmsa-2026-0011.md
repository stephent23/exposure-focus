---
slug: vmware-vmsa-2026-0011
name: VMware vCenter and ESX critical flaws (VMSA-2026-0011)
aliases: [VMSA-2026-0011]
cves: [CVE-2026-123903, CVE-2026-123910, CVE-2026-123911]
related_cves: [CVE-2026-123890, CVE-2026-123904, CVE-2026-123912]
summary: "A new vCenter flaw lets anyone who can reach it bypass login, and two ESX flaws allow host takeover over the network; fixes are out and no attacks are reported."
attack: auth-bypass
status: draft
published: 2026-11-25
evidence_as_of: 2026-11-25
review_until: 2026-12-09
leadership_quote: "Broadcom fixed a second critical vCenter login bypass and two critical ESX host flaws on 24 Nov 2026, shortly after an earlier vCenter flaw was exploited. No attacks or public exploit are reported. Update vCenter and every ESX host, starting with any reachable outside the management network."
tier_reason: "Full control with no login, but no attacks, exploit or published demonstration, so reachable systems are Prioritised, not Emergency; isolated ones are Routine."
would_change:
  - "Moves to Emergency for reachable systems if attacks or a working public exploit are reported"
  - "Management-network-only systems move to Prioritised if exploitation is reported"
affected:
  - product: vCenter Server 9.1 (VCF and vSphere Foundation 9.1)
    vulnerable: "Releases before 9.1.2 (reported; advisory not opened)"
    fixed: "9.1.2 (reported)"
  - product: vCenter Server 9.0
    vulnerable: "Releases before 9.0.2.0300 (reported)"
    fixed: "9.0.2.0300 (reported)"
  - product: vCenter Server 8.0 (also VCF 5.x and Telco Cloud)
    vulnerable: "Releases before 8.0 U3m; VCF 5.x before 5.2.5 (reported)"
    fixed: "8.0 U3m; VCF 5.2.5 (reported)"
  - product: vCenter Server 7.0
    vulnerable: "Fix only via Broadcom Support with extended support (reported)"
  - product: ESX 9.1, 9.0 and 8.0
    vulnerable: "Before ESXi-9.1.2.0, ESXi-9.0.2.0200, ESXi80U3m (reported)"
    fixed: "ESXi-9.1.2.0-25946735, ESXi-9.0.2.0200-25953133, ESXi80U3m-25926933 (reported)"
exposed_when:
  - "An attacker can reach vCenter over the network; no login is needed"
  - "For ESX, an attacker can reach the host's I/O filter service; no VM access needed (reported)"
applies_check:
  - question: Do you run VMware vCenter Server, ESX or VMware Cloud Foundation?
    how_to_check: "In the vSphere Client check each vCenter's Summary tab and each host's build number, and compare them with the affected table."
  - question: Who can reach your vCenter and ESX hosts?
    how_to_check: "Check firewall rules for vCenter (`443`, `5480`) and ESX management interfaces. Note whether user networks, VPN users or remote-access tools can reach them, not only the management network."
placements:
  - name: vCenter reachable from the internet or user networks
    facts: { reachable: true, no_login: true, impact: critical }
    why:
      - No login needed; the attacker gets past vCenter authentication.
      - No attacks, public exploit or published demonstration reported.
    tier: 3
    action: Update vCenter to a fixed build sooner than your normal cycle and limit access to a management network.
  - name: ESX hosts reachable beyond vCenter
    facts: { reachable: true, no_login: true, impact: critical }
    why:
      - Two network flaws in the I/O filter service can give code execution on the host (reported).
      - No attacks or public exploit reported.
    tier: 3
    action: Update every ESX host sooner than your normal cycle; until then allow only vCenter to reach it.
  - name: vCenter and ESX on a restricted management network only
    facts: { reachable: false, high_value_target: true, no_login: true, impact: critical }
    why:
      - Not reachable from outside, and not reported exploited.
    tier: 4
    action: Update vCenter and ESX in your normal cycle and keep management access restricted.
mitigations:
  - title: Update vCenter and every ESX host to fixed builds
    limitation: "Some ESX 9.0 medium flaws have no fix yet; vCenter 7.0 needs Broadcom Support"
    role: fix
    official_guides: ["https://www.rescana.com/post/vmware-vcenter-cve-2026-123903-auth-bypass-and-esx-code-execution-patch-now"]
    confidence: reported
  - title: Allow only vCenter to reach ESX hosts (KB 463535)
    limitation: "Broadcom says it only partly addresses the ESX flaws; no vCenter workaround"
    role: stopgap
    official_guides: ["https://www.rescana.com/post/vmware-vcenter-cve-2026-123903-auth-bypass-and-esx-code-execution-patch-now"]
    confidence: reported
  - title: Limit vCenter access to a management network
    limitation: "Attackers already inside the network can still reach it"
    role: stopgap
    official_guides: ["https://thehackernews.com/2026/11/vmware-vcenter-hit-by-another-critical.html"]
    confidence: inference
evidence:
  - label: Vendor advisory
    text: "Per The Hacker News (24 Nov), Broadcom's VMSA-2026-0011 fixes 23 flaws across ESX, vCenter, Workstation, Fusion and Avi. CVE-2026-123903 (CVSS 9.8) is an authentication bypass in the vCenter Directory Service exploitable by anyone with network access to vCenter; Broadcom says it is distinct from CVE-2026-123890. No workaround is listed for vCenter. Broadcom's advisory could not be opened, so this is reported."
    as_of: 2026-11-25
    source_url: https://thehackernews.com/2026/11/vmware-vcenter-hit-by-another-critical.html
    confidence: reported
  - label: ESX flaws
    text: "Rescana (24 Nov) says CVE-2026-123910 and CVE-2026-123911 (both CVSS 9.8) are a heap out-of-bounds write and a use-after-free in the ESX I/O filter service. Broadcom's ESX 8 interim workaround, KB 463535, is a firewall rule letting only vCenter reach that service, which Broadcom says only partly addresses the issues. Not confirmed from Broadcom."
    as_of: 2026-11-25
    source_url: https://www.rescana.com/post/vmware-vcenter-cve-2026-123903-auth-bypass-and-esx-code-execution-patch-now
    confidence: reported
  - label: Exploit evidence
    text: "Broadcom does not mention exploitation of any of the new flaws (The Hacker News, 24 Nov). Rescana says none of the three 9.8 flaws was in CISA KEV on 24 Nov and mentions no proof of concept. CISA's catalog could not be opened."
    as_of: 2026-11-25
    source_url: https://thehackernews.com/2026/11/vmware-vcenter-hit-by-another-critical.html
    confidence: reported
  - label: High-value target
    text: "vCenter and ESX run the virtual estate, so they count as virtualisation management. The earlier vCenter flaw CVE-2026-123890 was exploited by a state-backed group after it got inside networks (see the VMSA-2026-0009 verdict)."
    as_of: 2026-11-25
    source_url: https://thehackernews.com/2026/11/vmware-vcenter-hit-by-another-critical.html
    confidence: reported
timeline:
  - { event: "Broadcom publishes VMSA-2026-0011 with fixes", date: 2026-11-24, source_url: "https://www.rescana.com/post/vmware-vcenter-cve-2026-123903-auth-bypass-and-esx-code-execution-patch-now", confidence: reported }
sources:
  - { title: "The Hacker News: VMware vCenter hit by another critical 9.8-rated auth bypass flaw", url: "https://thehackernews.com/2026/11/vmware-vcenter-hit-by-another-critical.html", accessed: 2026-11-25 }
  - { title: "Rescana: VMware vCenter auth bypass CVE-2026-123903 and ESX code execution flaws", url: "https://www.rescana.com/post/vmware-vcenter-cve-2026-123903-auth-bypass-and-esx-code-execution-patch-now", accessed: 2026-11-25 }
  - { title: "Cohash: VMSA-2026-0011, vCenter and every ESX host need patching", url: "https://cohash.com/blog/vmware-vmsa-2026-0011-vcenter-esx-cve-2026-123903", accessed: 2026-11-25 }
---

Broadcom's advisory, the CVE record, NVD and CISA's catalog could not be opened, so every fact here comes from press and research blogs and is marked reported. Cohash agrees on the vCenter fixes but gives no ESX 9.0 build number.

The 9.8 score does not set the tier: with no attacks or exploit reported, reachable systems are Prioritised. The earlier vCenter flaw was exploited, so this call may move quickly. No WAF or CDN rule applies, and none was found.
