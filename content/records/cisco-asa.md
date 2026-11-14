---
slug: cisco-asa
name: Cisco ASA and FTD SSL VPN denial of service
aliases: [cisco-sa-asaftd-tunnel-dos-s6mgkb75]
cves: [CVE-2026-76418]
summary: A crafted request can make a Cisco ASA or FTD firewall reload without a login when secondary authentication is set on a tunnel group. It is being exploited; the effect is an outage, not a breach.
attack: dos
status: published
published: 2026-11-09
evidence_as_of: 2026-11-09
review_until: 2026-11-23
leadership_quote: This is an outage risk, not a breach. Attackers are exploiting a flaw that can restart Cisco VPN firewalls without a login. Where the VPN is how the business works, handle it ahead of the normal cycle; where it is a backup, schedule it sooner than usual.
affected:
  - product: Cisco ASA
    vulnerable: "[versions to confirm]"
    fixed: "9.16.4.104, 9.18.4.96, 9.20.4.50, 9.22.3.200, 9.23.1.48, 9.24.1.27 or 9.24.10.1"
  - product: Cisco FTD
    vulnerable: "[versions to confirm]"
    fixed: "7.0.11, 7.2.13, 7.4.9, 7.6.7, 7.7.14, 10.0.3, 10.1.1"
exposed_when:
  - SSL remote access VPN login service is reachable
  - "`webvpn` with SSL VPN enabled on at least one interface"
  - "A tunnel group has `secondary-authentication-server-group`"

applies_check:
  - question: Do you run a Cisco ASA or FTD with SSL VPN and secondary authentication on a tunnel group?
    how_to_check: "Look for `webvpn` with SSL VPN on an interface, and `secondary-authentication-server-group` on any tunnel group, including DefaultWEBVPNGroup. On FTD, review the deployed remote access VPN policy in FMC or FDM."

placements:
  - name: All conditions true, VPN is business-critical
    facts: { reachable: true, exploited: true, no_login: true, impact: significant }
    why:
      - Reachable from the internet.
      - Cisco and CISA say it is being exploited.
      - No login needed.
      - The effect is a device reload (denial of service only). Nobody gets in.
      - Losing the VPN hurts the business, but the device restarts on its own, so the impact is significant rather than critical.
    tier: 2
    action: "Out-of-cycle: upgrade, or apply Cisco's mitigation first if you cannot upgrade yet."
  - name: All conditions true, VPN is a backup
    facts: { reachable: true, exploited: true, no_login: true, impact: limited }
    why:
      - Same as above, but losing the VPN for a while is tolerable, so the impact is limited.
    tier: 3
    action: Schedule the upgrade sooner than your normal cycle.
  - name: Any condition false
    facts: { vendor_stated_exposure_condition: false }
    why:
      - Cisco lists every condition as required, so the device is not vulnerable if any one is false.
    tier: 4
    action: No special action. Routine patching.

vectors:
  - Crafted request to the SSL remote access VPN login service

mitigations:
  - title: Upgrade to a fixed release
    summary: "Cisco strongly recommends upgrading. First fixed releases for ASA are 9.16.4.104, 9.18.4.96, 9.20.4.50, 9.22.3.200, 9.23.1.48 and 9.24.1.27 or 9.24.10.1. For FTD they are 7.0.11, 7.2.13, 7.4.9, 7.6.7, 7.7.14, 10.0.3 and 10.1.1. Use Cisco's Software Checker for your exact release."
    effect:
      - { vector: Crafted request to the SSL remote access VPN login service, status: closed }
    takes: A firmware upgrade and a restart of each firewall, which interrupts the VPN unless you have a failover pair.
    might_break: Upgrades can change behaviour. Test on a lab or standby unit first.
    official_guides: [https://www.cisco.com/c/en/us/support/docs/csa/cisco-sa-asaftd-tunnel-dos-s6mgkb75.html]
    check_it_worked: Confirm the running version on each firewall is at or above the first fixed release for its train.
    undo: Boot the previous image. This reopens the flaw.
    confidence: vendor-stated
  - title: "Remove the tunnel group list if the default group lacks secondary auth"
    summary: "Cisco's mitigation, if DefaultWEBVPNGroup does not use secondary authentication: enter `no tunnel-group-list enable` in WebVPN configuration mode. Cisco calls this a mitigation, not a workaround, and says it was tested in a lab and is temporary."
    effect:
      - { vector: Crafted request to the SSL remote access VPN login service, status: closed_for_that_app }
    takes: One configuration command on each affected firewall.
    might_break: "Users can no longer pick a connection profile from a list at login and must know the correct profile name."
    official_guides: [https://www.cisco.com/c/en/us/support/docs/csa/cisco-sa-asaftd-tunnel-dos-s6mgkb75.html]
    check_it_worked: "Confirm `tunnel-group-list enable` is gone from the running configuration, and that DefaultWEBVPNGroup has no `secondary-authentication-server-group`."
    undo: "Re-enter `tunnel-group-list enable`. This reopens the flaw."
    confidence: vendor-stated
  - title: "Disable secondary authentication on the default group"
    summary: "Cisco's mitigation, if DefaultWEBVPNGroup does use secondary authentication: use `no secondary-authentication-server-group`. Removing the group list does not help in that case."
    effect:
      - { vector: Crafted request to the SSL remote access VPN login service, status: closed_for_that_app }
    takes: One configuration command, and a plan for how users will authenticate instead.
    might_break: Cisco says the security posture of remote access VPN is lowered, because the second factor is removed.
    official_guides: [https://www.cisco.com/c/en/us/support/docs/csa/cisco-sa-asaftd-tunnel-dos-s6mgkb75.html]
    check_it_worked: Confirm no tunnel group, including DefaultWEBVPNGroup, still has a secondary authentication server group.
    undo: Restore the secondary authentication server group. This reopens the flaw.
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

All of Cisco's conditions must be true for a device to be vulnerable: a vulnerable release, a reachable SSL remote access VPN login service, `webvpn` with SSL VPN enabled on at least one interface, and a tunnel group with `secondary-authentication-server-group`. If `tunnel-group-list enable` is set, check every tunnel group including DefaultWEBVPNGroup, not just the ones shown on the login page. If it is not set, check DefaultWEBVPNGroup. A successful VPN login is not needed to reach the affected code.

Cisco lists two mitigations that avoid an upgrade. Cisco says there are no workarounds, and calls both mitigations temporary. It recommends upgrading.

The call would move up if the impact were shown to go beyond a reload, or if exploitation became widespread enough to stop access across many organisations.
