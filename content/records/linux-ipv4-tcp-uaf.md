---
slug: linux-ipv4-tcp-uaf
name: Linux IPv4 TCP use-after-free
aliases: []
cves: [CVE-2026-98432]
summary: Red Hat says a race in the Linux kernel's IPv4 TCP code may let a remote attacker corrupt kernel memory without login. Researchers report remote root on MPTCP servers; no exploit is public.
attack: rce
status: published
evidence_as_of: 2026-11-09
review_until: 2026-11-23
leadership_quote: A serious Linux kernel flaw could let an outsider take over an internet-facing server. Researchers report it works, but the exploit is not public and no attacks are reported. Patch internet-facing Linux servers ahead of the normal cycle and keep watching.
affected:
  - product: "Linux kernel 5.10, 5.15, 6.1, 6.6"
    vulnerable: "[versions to confirm]"
    fixed: "5.10.272, 5.15.223, 6.1.190, 6.6.159"
  - product: "Linux kernel 6.12, 6.18, 7.2, 7.3"
    vulnerable: "[versions to confirm]"
    fixed: "6.12.113, 6.18.56, 7.2.10, 7.3"
  - product: RHEL 8, 9, 10 and OpenShift Container Platform 4
    vulnerable: Listed by Red Hat as affected; MPTCP is off by default
exposed_when:
  - Server accepts IPv4 TCP connections from the internet
  - "Researchers' remote root exploit: an MPTCP listener (the bug itself is not specific to MPTCP)"
  - "Similar flaw: request-socket migration is enabled"

applies_check:
  - question: Do internet-facing Linux servers accept IPv4 TCP, and are their kernels unpatched?
    how_to_check: "Run `uname -r` and compare with your distribution's security tracker for CVE-2026-98432; vendor kernels carry their own version numbers. For MPTCP listeners, check `sysctl net.mptcp.enabled` and the listening services."

placements:
  - name: Internet-facing server with an MPTCP listener
    facts: { reachable: true, credible_researcher_claim: true, no_login: true, impact: critical }
    why:
      - Reachable from the internet.
      - No login needed.
      - Remote root reported by researchers against MPTCP listeners.
      - Exploit not released. No exploitation reported.
    tier: 2
    action: Handle ahead of your normal cycle. Patch the kernel and reboot.
  - name: Internet-facing server without an MPTCP listener
    facts: { reachable: true, no_login: true, impact: critical }
    why:
      - Reachable from the internet.
      - Red Hat says the flaw can lead to code execution, and the bug is not specific to MPTCP.
      - No exploit has been shown or released for servers without an MPTCP listener.
    tier: 3
    action: Schedule the kernel update sooner than your normal cycle. Move up if an exploit that does not need MPTCP appears.
  - name: Internal-only server
    facts: { reachable: false, no_login: true, impact: critical }
    why:
      - Not reachable from the internet.
    tier: 4
    action: Patch in your normal cycle.

vectors:
  - Incoming IPv4 TCP connection carrying IP options (the base flaw)
  - Request-socket migration, if enabled (a similar flaw)

mitigations:
  - title: Install a fixed kernel and reboot
    summary: "Red Hat calls kernel updates the only complete solution. Upstream fixes are in 5.10.272, 5.15.223, 6.1.190, 6.6.159, 6.12.113, 6.18.56, 7.2.10 and 7.3. Check your distribution's tracker for its fixed kernel."
    effect:
      - { vector: Incoming IPv4 TCP connection carrying IP options (the base flaw), status: closed }
      - { vector: Request-socket migration, if enabled (a similar flaw), status: closed }
    takes: A kernel update and a reboot of each server. Live patching can avoid the reboot where offered.
    might_break: A new kernel can change drivers and behaviour. Test first on a representative host.
    official_guides:
      - https://access.redhat.com/security/vulnerabilities/RHSB-2026-016
      - https://www.akamai.com/blog/security-research/cve-2026-98432-remote-uaf-linux-kernels-tcp-stack
    check_it_worked: "Run `uname -r` after the reboot and confirm it matches your distribution's fixed kernel for CVE-2026-98432."
    undo: Boot the previous kernel. This reopens the flaw.
    confidence: vendor-stated
  - title: Drop IPv4 TCP packets that carry IP options
    summary: "Red Hat's temporary nftables rule drops incoming IPv4 TCP packets with IP options (`ip protocol tcp ip hdrlength > 5 counter drop`, in a table named cve_2026_98432). It takes effect at once for new and existing connections and needs no service restart. Red Hat says it reduces exposure but cannot fully prevent the flaw, and is not a substitute for patching. It is not kept across a reboot."
    effect:
      - { vector: Incoming IPv4 TCP connection carrying IP options (the base flaw), status: weaker }
    takes: Loading one nftables table on each server.
    might_break: Red Hat warns it may disrupt workloads that need IP options, such as CIPSO labelling. It does not cover pod-to-pod traffic in OpenShift.
    official_guides: [https://access.redhat.com/security/vulnerabilities/RHSB-2026-016]
    check_it_worked: "List the table with `nft list table inet cve_2026_98432` and watch its drop counter."
    undo: Delete the table, as the bulletin describes, once a fixed kernel is running.
    confidence: vendor-stated
  - title: Turn off MPTCP and request-socket migration
    summary: "Akamai suggests setting `net.mptcp.enabled=0` and `net.ipv4.tcp_migrate_req=0`. Akamai and Red Hat both say this does not stop exploitation, because the bug is not specific to MPTCP. It only blocks the route used in the researchers' exploit."
    effect:
      - { vector: Incoming IPv4 TCP connection carrying IP options (the base flaw), status: open }
      - { vector: Request-socket migration, if enabled (a similar flaw), status: weaker }
    takes: Two sysctl changes, which can be applied at runtime.
    might_break: Services that rely on MPTCP stop using it.
    official_guides: [https://www.akamai.com/blog/security-research/cve-2026-98432-remote-uaf-linux-kernels-tcp-stack]
    check_it_worked: Read the two sysctl values back and confirm they are 0.
    undo: Set the values back and reload sysctl.
    confidence: reported

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
    accessed: 2026-11-09
  - title: "BleepingComputer: Linux kernel exploit enables remote root attacks on MPTCP servers"
    url: https://www.bleepingcomputer.com/news/security/linux-kernel-exploit-enables-remote-root-attacks-on-mptcp-servers
    accessed: 2026-11-09
---

Some write-ups describe this as an MPTCP-only problem. Red Hat and Akamai both say the bug itself is not specific to MPTCP, while the researchers' exploit uses an MPTCP listener. The record therefore has separate rows for servers with and without one.

As of 2026-11-09 it has not been confirmed whether the flaw is in the CISA KEV catalogue.
