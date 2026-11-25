---
slug: cisco-asa
name: Cisco ASA and FTD SSL VPN denial of service
aliases: [cisco-sa-asaftd-tunnel-dos-s6mgkb75]
cves: [CVE-2026-76418]
summary: A crafted request can make a Cisco ASA or FTD firewall reload without a login when secondary authentication is set on a tunnel group. It is being exploited; the effect is an outage, not a breach.
attack: dos
status: published
published: 2026-11-09
evidence_as_of: 2026-11-25
review_until: 2026-12-09
leadership_quote: This is an outage risk, not a breach. Attackers are exploiting a flaw that can restart Cisco VPN firewalls without a login. Where the VPN is how the business works, handle it ahead of the normal cycle; where it is a backup, schedule it sooner than usual.
tier_reason: "It is exploited and needs no login, but the effect is a reload: an outage, not a breach. That is Urgent, not Emergency, where the VPN is business-critical."
would_change:
  - Moves to Emergency if the flaw is shown to do more than reload the device
affected:
  - product: Cisco ASA
    vulnerable: "Releases before the first fixed release of each train; Cisco lists no ranges"
    fixed: "9.16.4.104, 9.18.4.96, 9.20.4.50, 9.22.3.200, 9.23.1.48, 9.24.1.27 or 9.24.10.1"
  - product: Cisco FTD
    vulnerable: "Releases before the first fixed release of each train; Cisco lists no ranges"
    fixed: "7.0.11, 7.2.13, 7.4.9, 7.6.7, 7.7.14, 10.0.3, 10.1.1"
exposed_when:
  - SSL remote access VPN login service is reachable
  - "`webvpn` with SSL VPN enabled on at least one interface"
  - "A tunnel group has `secondary-authentication-server-group`"

applies_check:
  - question: Do you run a Cisco ASA or FTD with SSL VPN and secondary authentication on a tunnel group?
    how_to_check: "Look for `webvpn` with SSL VPN on an interface, and `secondary-authentication-server-group` on any tunnel group, including DefaultWEBVPNGroup. On FTD, review the deployed remote access VPN policy in FMC or FDM."

placements:
  - name: Exposed SSL VPN with secondary authentication, VPN business-critical
    facts: { reachable: true, exploited: true, no_login: true, impact: significant }
    why:
      - Exploited (Cisco and CISA); no login needed.
      - "The effect is a reload: an outage, not a breach, and the device restarts on its own."
    tier: 2
    action: "Out-of-cycle: upgrade, or apply Cisco's mitigation first if you cannot upgrade yet."
  - name: Exposed SSL VPN with secondary authentication, VPN only a backup
    facts: { reachable: true, exploited: true, no_login: true, impact: limited }
    why:
      - Same flaw, but losing the VPN for a while is tolerable.
    tier: 3
    action: Schedule the upgrade sooner than your normal cycle.
mitigations:
  - title: "Upgrade ASA and FTD to a fixed release"
    limitation: "Restart interrupts the VPN unless you have a failover pair"
    role: fix
    official_guides: [https://www.cisco.com/c/en/us/support/docs/csa/cisco-sa-asaftd-tunnel-dos-s6mgkb75.html]
    confidence: vendor-stated
  - title: "Apply Cisco's temporary tunnel-group mitigation"
    limitation: "Users must type their profile name, or lose the second factor"
    role: stopgap
    official_guides: [https://www.cisco.com/c/en/us/support/docs/csa/cisco-sa-asaftd-tunnel-dos-s6mgkb75.html]
    confidence: vendor-stated

evidence:
  - label: Vendor advisory
    text: "Cisco advisory cisco-sa-asaftd-tunnel-dos-s6mgkb75, published 2026-10-28, version 1.0. A flaw in the Remote Access SSL VPN service lets an unauthenticated remote attacker make the device reload, causing denial of service. It is caused by logic errors when secondary authentication is configured on a tunnel group. CVSS 3.1 base score 8.6, rated High, with no confidentiality or integrity impact."
    as_of: 2026-11-09
    source_url: https://www.cisco.com/c/en/us/support/docs/csa/cisco-sa-asaftd-tunnel-dos-s6mgkb75.html
    confidence: vendor-stated
  - label: Exploit evidence
    text: "Cisco states that in October 2026 its PSIRT became aware of active exploitation."
    as_of: 2026-11-09
    source_url: https://www.cisco.com/c/en/us/support/docs/csa/cisco-sa-asaftd-tunnel-dos-s6mgkb75.html
    confidence: vendor-stated
  - label: CISA KEV
    text: "Listed as a Cisco Secure Firewall ASA and FTD unchecked return value to NULL pointer dereference flaw. Added 2026-10-29, federal due date 2026-11-01."
    as_of: 2026-11-09
    source_url: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
    confidence: vendor-stated

timeline:
  - { event: "Cisco publishes its security advisory", date: 2026-10-28, time: "19:15", source_url: "https://www.cisco.com/c/en/us/support/docs/csa/cisco-sa-asaftd-tunnel-dos-s6mgkb75.html", confidence: vendor-stated }
  - { event: "Added to CISA's Known Exploited Vulnerabilities catalogue", date: 2026-10-29, source_url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", confidence: vendor-stated }

sources:
  - title: Cisco advisory cisco-sa-asaftd-tunnel-dos-s6mgkb75
    url: https://www.cisco.com/c/en/us/support/docs/csa/cisco-sa-asaftd-tunnel-dos-s6mgkb75.html
    accessed: 2026-11-09
  - title: CISA Known Exploited Vulnerabilities catalog
    url: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
    accessed: 2026-11-09
---

Every one of Cisco's conditions must hold: check every tunnel group, including DefaultWEBVPNGroup, for `secondary-authentication-server-group`. Cisco's temporary mitigation is `no tunnel-group-list enable` in WebVPN mode, or `no secondary-authentication-server-group` on DefaultWEBVPNGroup where that group uses it; Cisco still recommends upgrading. Use Cisco's Software Checker to find the first fixed release for your train.
