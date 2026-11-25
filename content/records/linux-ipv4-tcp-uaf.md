---
slug: linux-ipv4-tcp-uaf
name: Linux IPv4 TCP use-after-free
aliases: []
cves: [CVE-2026-98432]
summary: Red Hat says a race in the Linux kernel's IPv4 TCP code lets a remote attacker corrupt kernel memory without login. Anthropic reports lab-only remote root; no exploit is public, no attacks reported.
attack: rce
status: published
published: 2026-11-09
evidence_as_of: 2026-11-13
review_until: 2026-11-27
leadership_quote: A serious Linux kernel flaw could in theory let an outsider take over an internet-facing server. One research team reports doing it in a lab but has not published how, and no attacks are reported. Schedule the kernel update for internet-facing Linux servers ahead of normal patching and watch for a public exploit.
tier_reason: "Remote root is reported only from a lab, with no published exploit, kernel version or setup, and no attacks are reported. The rubric counts published demonstrations only."
would_change:
  - Moves up if a working exploit is published or attacks are reported
affected:
  - product: "Linux kernel 5.10, 5.15, 6.1, 6.6"
    vulnerable: "5.10 to 5.10.271, 5.15 to 5.15.222, 6.1 to 6.1.189, 6.6 to 6.6.158 (Akamai)"
    fixed: "5.10.272, 5.15.223, 6.1.190, 6.6.159"
  - product: "Linux kernel 6.12, 6.18, 7.2, 7.3"
    vulnerable: "6.12 to 6.12.112, 6.18 to 6.18.55, 7.2 to 7.2.9 (Akamai)"
    fixed: "6.12.113, 6.18.56, 7.2.10, 7.3"
  - product: "Older branches from 4.4 without stable updates"
    vulnerable: Affected, according to Akamai
  - product: "RHEL 8, 9, 10 and OpenShift Container Platform 4"
    vulnerable: Listed by Red Hat as affected; MPTCP is off by default
exposed_when:
  - Server accepts IPv4 TCP connections from the internet
  - "The reported lab exploit: an MPTCP listener (the bug itself is not specific to MPTCP)"
  - "Similar flaw: request-socket migration is enabled"

applies_check:
  - question: Do internet-facing Linux servers accept IPv4 TCP, and are their kernels unpatched?
    how_to_check: "Run `uname -r` and compare with your distribution's security tracker for CVE-2026-98432; vendor kernels carry their own version numbers. For MPTCP listeners, check `sysctl net.mptcp.enabled` and the listening services."

placements:
  - name: Internet-facing Linux server
    facts: { reachable: true, no_login: true, impact: critical }
    why:
      - No login needed; Red Hat says it can lead to code execution, with or without MPTCP.
      - Anthropic's lab root exploit against an MPTCP listener is unpublished, so it does not raise the call.
      - No public exploit and no attacks reported.
    tier: 3
    action: Schedule the kernel update and reboot sooner than your normal cycle.
  - name: Internal-only server
    facts: { reachable: false, no_login: true, impact: critical }
    why:
      - Not reachable from the internet.
    tier: 4
    action: Patch in your normal cycle.

mitigations:
  - title: "Install a fixed kernel and reboot"
    limitation: "Needs a reboot per server unless live patching is offered"
    role: fix
    official_guides:
      - https://access.redhat.com/security/vulnerabilities/RHSB-2026-016
      - https://www.akamai.com/blog/security-research/cve-2026-98432-remote-uaf-linux-kernels-tcp-stack
    confidence: vendor-stated
  - title: "Block IPv4 TCP packets with IP options"
    limitation: "Red Hat: cannot fully prevent the flaw; lost on reboot"
    role: stopgap
    official_guides: [https://access.redhat.com/security/vulnerabilities/RHSB-2026-016]
    confidence: vendor-stated
evidence:
  - label: Vendor bulletin
    text: "Red Hat rates it Critical. An unauthenticated remote attacker can exploit a race with no privileges or user interaction, and exploitation needs precise timing. MPTCP is not a precondition, and default RHEL systems, where MPTCP is off, are still affected. RHEL 8, 9 and 10 and OpenShift Container Platform 4 are listed."
    as_of: 2026-11-09
    source_url: https://access.redhat.com/security/vulnerabilities/RHSB-2026-016
    confidence: vendor-stated
  - label: Exploit evidence
    text: "Akamai says Anthropic reported a root exploit on 2026-10-27 and has not released it, and Akamai knew of no public working exploit when it wrote on 2026-11-02."
    as_of: 2026-11-09
    source_url: https://www.akamai.com/blog/security-research/cve-2026-98432-remote-uaf-linux-kernels-tcp-stack
    confidence: reported
  - label: Exploit evidence (recheck)
    text: "Rechecked on 2026-11-13: Akamai's post (2026-11-02) still says Anthropic has not released its exploit and Akamai knew of no public working exploit. PBX Science (2026-11-05) says Anthropic has not released the exploit code, kernel version or exact configuration, and that a hosting vendor could not reproduce it; it also says security vendors warned that scanning has begun, which no other source reviewed confirms. Field Effect (2026-11-03) reports no exploitation in the wild. No CISA KEV listing is reported."
    as_of: 2026-11-13
    source_url: https://pbxscience.com/cve-2026-98432-a-critical-linux-tcp-flaw-a-reported-ai-built-exploit-and-a-patch-gap-on-ubuntu/
    confidence: reported
  - label: Exploitation status
    text: "BleepingComputer reported on 2026-10-30 that there were no confirmed reports of exploitation in the wild. Red Hat and Akamai do not state otherwise."
    as_of: 2026-11-09
    source_url: https://www.bleepingcomputer.com/news/security/linux-kernel-exploit-enables-remote-root-attacks-on-mptcp-servers
    confidence: reported
  - label: CVE record
    text: "Red Hat's CVE page gives a public date of 2026-10-15 and a CVSS v3 base score of 9.8; the same page shows cve.org also at 9.8 and NVD with no score. Akamai says the Linux kernel CNA published it that day. The score is shown for reference only."
    as_of: 2026-11-09
    source_url: https://access.redhat.com/security/cve/cve-2026-98432
    confidence: reported

timeline:
  - { event: "Fix committed upstream", date: 2026-10-05, source_url: "https://www.akamai.com/blog/security-research/cve-2026-98432-remote-uaf-linux-kernels-tcp-stack", confidence: reported }
  - { event: "CVE published by the Linux kernel CVE Numbering Authority", date: 2026-10-15, source_url: "https://www.akamai.com/blog/security-research/cve-2026-98432-remote-uaf-linux-kernels-tcp-stack", confidence: reported }
  - { event: "Anthropic reports a root exploit, not released", date: 2026-10-27, source_url: "https://www.akamai.com/blog/security-research/cve-2026-98432-remote-uaf-linux-kernels-tcp-stack", confidence: reported }
  - { event: "Red Hat publishes its security bulletin RHSB-2026-016", date: 2026-10-30, source_url: "https://access.redhat.com/security/vulnerabilities/RHSB-2026-016", confidence: vendor-stated }


sources:
  - title: Red Hat bulletin RHSB-2026-016
    url: https://access.redhat.com/security/vulnerabilities/RHSB-2026-016
    accessed: 2026-11-09
  - title: Red Hat CVE page for CVE-2026-98432
    url: https://access.redhat.com/security/cve/cve-2026-98432
    accessed: 2026-11-09
  - title: "Akamai: CVE-2026-98432, remote use-after-free in the Linux kernel TCP stack"
    url: https://www.akamai.com/blog/security-research/cve-2026-98432-remote-uaf-linux-kernels-tcp-stack
    accessed: 2026-11-13
  - title: "PBX Science: CVE-2026-98432, a critical Linux TCP flaw, a reported AI-built exploit and a patch gap on Ubuntu"
    url: https://pbxscience.com/cve-2026-98432-a-critical-linux-tcp-flaw-a-reported-ai-built-exploit-and-a-patch-gap-on-ubuntu/
    accessed: 2026-11-13
  - title: "Field Effect: Researchers achieve root access through Linux TCP flaw"
    url: https://fieldeffect.com/blog/researchers-achieve-root-access-through-linux-tcp-flaw
    accessed: 2026-11-13
  - title: "BleepingComputer: Linux kernel exploit enables remote root attacks on MPTCP servers"
    url: https://www.bleepingcomputer.com/news/security/linux-kernel-exploit-enables-remote-root-attacks-on-mptcp-servers
    accessed: 2026-11-09
---

The bug is not specific to MPTCP (Red Hat, Akamai), even though the researchers' unpublished exploit uses an MPTCP listener, so all internet-facing servers are rated the same. Red Hat's temporary nftables rule is `ip protocol tcp ip hdrlength > 5 counter drop`; it is lost on reboot, can break CIPSO labelling and misses OpenShift pod traffic. Turning off MPTCP (`net.mptcp.enabled=0`) blocks only the researchers' route, and Akamai and Red Hat say it does not stop exploitation.
