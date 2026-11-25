---
slug: vmware-vmsa-2026-0011
name: VMware vCenter and ESX critical flaws (VMSA-2026-0011)
aliases: [VMSA-2026-0011]
cves: [CVE-2026-123903, CVE-2026-123910, CVE-2026-123911]
related_cves: [CVE-2026-123890]
summary: "A new vCenter flaw lets anyone who can reach it skip the login, and two ESX flaws allow host takeover over the network. Fixes are out; no attacks are reported."
attack: auth-bypass
status: draft
published: 2026-11-25
evidence_as_of: 2026-11-25
review_until: 2026-12-09
leadership_quote: "Broadcom fixed a critical vCenter login bypass and two critical ESX host flaws on 24 Nov 2026. No attacks are reported. Update vCenter and every ESX host, and keep both off the internet and user networks."
tier_reason: "Full control with no login, but no attacks or exploit are reported, so reachable systems are Prioritised, not Emergency."
would_change:
  - "Moves up if attacks or a working public exploit are reported"
affected:
  - product: vCenter Server 9.1 and 9.0
    vulnerable: "Before 9.1.2 and 9.0.2.0300 (reported)"
    fixed: "9.1.2, 9.0.2.0300"
  - product: vCenter Server 8.0 and VCF 5.x
    vulnerable: "Before 8.0 U3m and VCF 5.2.5 (reported)"
    fixed: "8.0 U3m, VCF 5.2.5"
  - product: vCenter Server 7.0
    vulnerable: "Fix only via Broadcom Support with extended support (reported)"
  - product: ESX 9.1, 9.0 and 8.0
    vulnerable: "Before 9.1.2, 9.0.2.0200 and 8.0 U3m (reported)"
    fixed: "9.1.2, 9.0.2.0200, 8.0 U3m"
applies_check:
  - question: Do you run VMware vCenter Server, ESX or VMware Cloud Foundation?
    how_to_check: "In the vSphere Client check each vCenter's Summary tab and each host's build number against the affected table."
  - question: Can anything outside the management network reach vCenter or ESX?
    how_to_check: "Check firewall rules for vCenter (`443`, `5480`) and ESX management interfaces, including access from user networks, VPN users and remote-access tools."
placements:
  - name: vCenter or ESX reachable from the internet or user networks
    facts: { reachable: true, no_login: true, impact: critical }
    why:
      - No login needed; the result is control of vCenter or the host.
      - No attacks or public exploit reported.
    tier: 3
    action: "Exposure is an architectural flaw: move vCenter and ESX onto a management network, then patch sooner than your normal cycle."
  - name: vCenter and ESX on a restricted management network only
    facts: { reachable: false, high_value_target: true, no_login: true, impact: critical }
    why:
      - Not reachable from outside, and not reported exploited.
    tier: 4
    action: Patch vCenter and ESX in your normal cycle.
mitigations:
  - title: Update vCenter and every ESX host to fixed builds
    limitation: "vCenter 7.0 needs Broadcom Support; some lesser ESX 9.0 flaws are unfixed"
    role: fix
    official_guides: ["https://www.rescana.com/post/vmware-vcenter-cve-2026-123903-auth-bypass-and-esx-code-execution-patch-now"]
    confidence: reported
  - title: Restrict vCenter and ESX to a management network
    limitation: "Attackers already inside can still reach them; ESX rule KB 463535 is partial"
    role: stopgap
    official_guides: ["https://www.rescana.com/post/vmware-vcenter-cve-2026-123903-auth-bypass-and-esx-code-execution-patch-now"]
    confidence: reported
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

Broadcom's advisory, the CVE record and CISA's catalog could not be opened, so the facts and versions come from press and research blogs and are marked reported. ESX build numbers: 9.1.2.0-25946735, 9.0.2.0200-25953133 and 80U3m-25926933 (Rescana).
