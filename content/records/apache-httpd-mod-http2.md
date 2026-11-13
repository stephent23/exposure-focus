---
slug: apache-httpd-mod-http2
name: Apache HTTP Server mod_http2 remote code execution
aliases: ["mod_http2 assign_headers race"]
cves: [CVE-2026-119618]
summary: "A flaw in the HTTP/2 module of Apache HTTP Server 2.4.55 to 2.4.70 lets an outsider with no login corrupt the server's memory, and possibly run commands, on a web server that has HTTP/2 turned on. It is fixed in 2.4.71 and in distribution packages. Public proof-of-concept code only crashes Apache worker processes, Red Hat says a reliable exploit has been demonstrated without naming it, and no attacks have been reported."
attack: rce
status: published
evidence_as_of: 2026-11-13
review_until: 2026-11-27

leadership_quote: "A flaw in the HTTP/2 part of the Apache web server, one of the most widely used web servers, can let an outsider crash a server without logging in, and possibly take it over. It only matters where HTTP/2 is switched on, and no attacks have been reported so far. The public attack code only crashes the server, and the reported takeover has not been shown in public, so internet-facing Apache servers with HTTP/2 on should have the update scheduled ahead of normal patching, with HTTP/2 switched off where no update is available yet."

applies_check:
  - question: Do you run an affected Apache HTTP Server or mod_http2 build?
    how_to_check: "Upstream, httpd 2.4.55 to 2.4.70 and the standalone mod_h2 module 2.0.8 to 2.0.42 are affected. Run `httpd -v`, `apache2 -v` or `apachectl -v`, then check the distribution package, because distributions fix it without moving to 2.4.71: Ubuntu's fixed packages carry numbers such as `2.4.58-1ubuntu8.19`, so a scanner that only compares with 2.4.71 will report fixed Ubuntu servers as vulnerable. On RHEL check `rpm -q mod_http2`; Red Hat says mod_http2 before 2.0.8 lacks the affected code and RHEL 8 and earlier are not affected. Tenable lists detection plugins, including 115821 (Web App Scanning) and per-distribution Nessus plugins. Also look inside container images and appliances that bundle Apache."
  - question: Is HTTP/2 turned on anywhere in your Apache configuration?
    how_to_check: "Search the configuration for the `Protocols` directive, server-wide and in every virtual host: Red Hat suggests `grep -r 'Protocols' /etc/httpd/conf/ /etc/httpd/conf.d/` (on Debian and Ubuntu, search `/etc/apache2`). HTTP/2 is on where the list includes `h2` (over TLS) or `h2c` (cleartext). Check that mod_http2 is loaded with `httpd -M | grep http2`, or on RHEL `grep http2 /etc/httpd/conf.modules.d/*.conf`."
  - question: Can an outsider talk HTTP/2 to Apache directly?
    how_to_check: "Red Hat's client check is `curl -kI --http2 https://localhost`: a reply of `HTTP/2 200` means HTTP/2 is on, `HTTP/1.1 200 OK` means it is off. If a load balancer, CDN or reverse proxy sits in front, also find out whether it passes HTTP/2 through to Apache or speaks HTTP/1.1 to it; a test from outside only shows the front door."

placements:
  - name: Internet-facing Apache 2.4.55 to 2.4.70 with HTTP/2 enabled
    facts: { reachable: true, no_login: true, public_exploit: true, exploit_achieves: significant, impact: critical }
    why:
      - An outsider can reach the server.
      - No login needed (Apache and Red Hat).
      - Code execution would mean control of the server process and the data it serves.
      - Public proof-of-concept code reproduces heap corruption and crashes of Apache worker processes, which Apache restarts; it does not show code execution.
      - Red Hat says public research has demonstrated a reliable exploit against a default-configured server, but names no research and no code-execution demonstration is published, so under the rubric it does not count.
      - No exploitation in the wild has been reported, for either the crash or code execution.
    tier: 3
    action: "Prioritised: schedule the update to Apache HTTP Server 2.4.71 or your distribution's fixed package ahead of your normal patching cycle, and restart Apache. Where no fixed package exists yet (for example the archived standalone mod_h2 module, or a vendor still preparing one), switch HTTP/2 off until it does. Watch for attacks or a public code-execution exploit, which would move this up."
  - name: Apache with HTTP/2 not enabled
    facts: { vendor_stated_exposure_condition: false }
    why:
      - Apache and Red Hat say only servers with HTTP/2 (h2 or h2c) enabled through the Protocols directive are affected; servers serving only HTTP/1.1 are not.
    tier: 4
    action: Routine patching. Check every virtual host before relying on this, and update anyway in your normal cycle.
  - name: Apache with HTTP/2 reachable only from internal networks
    facts: { reachable: false, no_login: true, public_exploit: true, exploit_achieves: significant, impact: critical }
    why:
      - An outsider cannot reach the server directly.
    tier: 4
    action: Routine patching. Move up if the server can be reached from the internet or from untrusted networks, including through a proxy that passes HTTP/2 through.

vectors:
  - Attacker sends crafted HTTP/2 traffic to the web server

mitigations:
  - title: Update Apache HTTP Server or your distribution's package
    summary: "The Apache project fixed the flaw in 2.4.71, released 2026-11-11. Distributions have backported the fix: Debian has fixed packages for bookworm (2.4.71-1~deb12u1, DLA-4902-1) and trixie (2.4.71-1~deb13u1, DSA-6620-1), with forky still listed as vulnerable; Ubuntu has fixed packages for 26.10, 26.04 LTS, 24.04 LTS, 22.04 LTS and, through Ubuntu Pro, 20.04 LTS (USN-9090-1). Red Hat says fixes are available for most affected products and the rest are being expedited; Tenable lists RHEL 9 and RHEL 10 mod_http2 updates under several RHSA numbers. Apache lists the standalone mod_h2 module 2.0.8 to 2.0.42 as affected; it is reported to have no fix because the project is archived."
    effect:
      - { vector: Attacker sends crafted HTTP/2 traffic to the web server, status: closed }
    takes: A package update and a restart of Apache on each server, plus rebuilding any container images that bundle it.
    might_break: "No breakage is reported. Version 2.4.71 also carries other fixes, so test it like any server update."
    official_guides:
      - https://httpd.apache.org/security/vulnerabilities_24.html
      - https://access.redhat.com/security/vulnerabilities/RHSB-2026-017
      - https://security-tracker.debian.org/tracker/CVE-2026-119618
      - https://ubuntu.com/security/CVE-2026-119618
    check_it_worked: "Check the installed package against your distribution's fixed version (not against 2.4.71 alone), and confirm the running Apache process started after the update."
    undo: Reinstall the previous package. This reopens the flaw, so switch HTTP/2 off first.
    confidence: vendor-stated
  - title: Switch HTTP/2 off until you can update
    summary: "Red Hat's mitigation, which Wiz also recommends: edit the httpd configuration (`/etc/httpd/conf/httpd.conf` or files in `/etc/httpd/conf.d/`), remove `h2` and `h2c` from every `Protocols` directive so it reads `Protocols http/1.1`, then run `systemctl restart httpd`. The same directive applies on other distributions."
    effect:
      - { vector: Attacker sends crafted HTTP/2 traffic to the web server, status: closed }
    takes: A configuration change in each server and virtual host, and a restart.
    might_break: "Red Hat warns of some loss of performance and bandwidth efficiency. Anything that needs HTTP/2 end to end, such as gRPC proxied through Apache, stops working."
    official_guides:
      - https://access.redhat.com/security/vulnerabilities/RHSB-2026-017
      - https://www.wiz.io/blog/cve-2026-119618-rce-apache-http-server-vulnerability
    check_it_worked: "Run `curl -kI --http2 https://localhost` and confirm the reply is `HTTP/1.1 200 OK`, not `HTTP/2 200`. Repeat for each virtual host, and against Apache directly if a proxy sits in front."
    undo: Put `h2` and `h2c` back in the Protocols directive and restart, once the fix is in place.
    confidence: vendor-stated

evidence:
  - label: Vendor advisory
    text: "Apache HTTP Server security page, under 'Fixed in Apache HTTP Server 2.4.71': 'mod_http2: heap corruption and RCE in assign_headers', severity critical. A concurrency flaw in mod_http2's assign_headers() 'can lead to RCE'. Affects httpd 2.4.55 through 2.4.70 and mod_h2 2.0.8 through 2.0.42; fixed in 2.4.71, released 2026-11-11. The project's oss-security announcement of the same date gives the same affected versions. Credited to Anthropic's OSS Scanner and to Anthony Weems and Simon Scannell of Google Cloud Vulnerability Research. Neither page discusses exploit code or attacks."
    as_of: 2026-11-13
    source_url: https://httpd.apache.org/security/vulnerabilities_24.html
    confidence: vendor-stated
  - label: Distribution advisory
    text: "Red Hat bulletin RHSB-2026-017 (public 2026-11-12, impact Critical): an unauthenticated remote attacker who can send HTTP/2 requests can corrupt memory and execute arbitrary commands; only servers with HTTP/2 enabled through the Protocols directive are affected. Red Hat rates it Critical overall but Important on RHEL 9 and 10, because their mod_http2 packages give each HTTP/2 stream its own allocator, which substantially increases the complexity of exploitation. Ubuntu rates it High priority. Red Hat gives CVSS 3.1 9.8 (reference only)."
    as_of: 2026-11-13
    source_url: https://access.redhat.com/security/vulnerabilities/RHSB-2026-017
    confidence: vendor-stated
  - label: Public exploit code
    text: "A public GitHub proof of concept (googlesky/CVE-2026-119618) reports reproducing the heap corruption on httpd 2.4.70 in a lab (prefork MPM, cleartext h2c, sanitizer builds), with several crashes of the httpd child process, and lists code execution only as 'potential'. SecurityWeek describes it the same way: memory corruption and process crashes, no remote code execution. Other public repositories referenced by Tenable are detection scanners, not exploits. The code was not run."
    as_of: 2026-11-13
    source_url: https://github.com/googlesky/CVE-2026-119618
    confidence: reported
  - label: Exploit evidence
    text: "Red Hat's CVE page states 'public research has demonstrated a reliable exploit against a default-configured server with the mod_http2 module enabled'. It does not name or link the research. Wiz said on 2026-11-11 that no exploit was available and there were no reports of exploitation in the wild. No code-execution exploit was found in this check."
    as_of: 2026-11-13
    source_url: https://access.redhat.com/security/cve/CVE-2026-119618
    confidence: vendor-stated
  - label: Observed attacker activity
    text: "Red Hat's bulletin reports no exploitation in the wild, and no other source reviewed reports attacks or scanning. Tenable's page does not mention exploitation or a CISA KEV listing; the CISA catalogue itself could not be opened in this check. Tenable shows an EPSS score of 0.00398 with no date."
    as_of: 2026-11-13
    source_url: https://www.tenable.com/cve/CVE-2026-119618
    confidence: reported
  - label: Exposure estimate
    text: "Wiz says 64% of cloud environments it sees have vulnerable resources and 51% have publicly exposed instances, without taking configuration (whether HTTP/2 is on) into account."
    as_of: 2026-11-13
    source_url: https://www.wiz.io/blog/cve-2026-119618-rce-apache-http-server-vulnerability
    confidence: reported

timeline:
  - { event: "Flaw reported to the Apache project by Anthropic's OSS Scanner", date: 2026-10-26, source_url: "https://httpd.apache.org/security/vulnerabilities_24.html", confidence: vendor-stated }
  - { event: "Flaw also reported by Google Cloud Vulnerability Research", date: 2026-11-03, source_url: "https://httpd.apache.org/security/vulnerabilities_24.html", confidence: vendor-stated }
  - { event: "Apache HTTP Server 2.4.71 released with the fix", date: 2026-11-11, source_url: "https://httpd.apache.org/security/vulnerabilities_24.html", confidence: vendor-stated }
  - { event: "Apache announces the CVE on oss-security", date: 2026-11-11, time: "12:19", source_url: "https://www.openwall.com/lists/oss-security/2026/11/11/13", confidence: vendor-stated }
  - { event: "Ubuntu publishes fixes (USN-9090-1)", date: 2026-11-12, source_url: "https://ubuntu.com/security/CVE-2026-119618", confidence: vendor-stated }
  - { event: "Red Hat publishes bulletin RHSB-2026-017", date: 2026-11-12, time: "18:03", source_url: "https://access.redhat.com/security/vulnerabilities/RHSB-2026-017", confidence: vendor-stated }

changes:
  - { date: 2026-11-13, placement: "Internet-facing Apache 2.4.55 to 2.4.70 with HTTP/2 enabled", from_tier: 2, to_tier: 3, reason: "The only public proof of concept crashes worker processes, and Red Hat's code-execution claim names no published research, which under the rubric no longer raises the tier.", source_url: "https://github.com/googlesky/CVE-2026-119618" }

sources:
  - title: Apache HTTP Server 2.4 vulnerabilities
    url: https://httpd.apache.org/security/vulnerabilities_24.html
    accessed: 2026-11-13
  - title: "oss-security: CVE-2026-119618, Apache HTTP Server mod_http2 heap corruption and RCE"
    url: https://www.openwall.com/lists/oss-security/2026/11/11/13
    accessed: 2026-11-13
  - title: "Red Hat RHSB-2026-017: Remote Code Execution - Apache HTTP Server (CVE-2026-119618)"
    url: https://access.redhat.com/security/vulnerabilities/RHSB-2026-017
    accessed: 2026-11-13
  - title: "Red Hat CVE page: CVE-2026-119618"
    url: https://access.redhat.com/security/cve/CVE-2026-119618
    accessed: 2026-11-13
  - title: "Debian security tracker: CVE-2026-119618"
    url: https://security-tracker.debian.org/tracker/CVE-2026-119618
    accessed: 2026-11-13
  - title: "Ubuntu: CVE-2026-119618"
    url: https://ubuntu.com/security/CVE-2026-119618
    accessed: 2026-11-13
  - title: "Tenable: CVE-2026-119618"
    url: https://www.tenable.com/cve/CVE-2026-119618
    accessed: 2026-11-13
  - title: "Tenable plugins for CVE-2026-119618"
    url: https://www.tenable.com/cve/CVE-2026-119618/plugins
    accessed: 2026-11-13
  - title: "Wiz: CVE-2026-119618, RCE in Apache HTTP Server"
    url: https://www.wiz.io/blog/cve-2026-119618-rce-apache-http-server-vulnerability
    accessed: 2026-11-13
  - title: "SecurityWeek: Apache patches critical HTTP Server RCE found by Anthropic, Google"
    url: https://www.securityweek.com/apache-patches-critical-http-server-rce-found-by-anthropic-google/
    accessed: 2026-11-13
  - title: "GitHub: googlesky/CVE-2026-119618 proof of concept"
    url: https://github.com/googlesky/CVE-2026-119618
    accessed: 2026-11-13
  - title: "The Hacker News: Critical Apache HTTP/2 flaw could let unauthenticated attackers execute code remotely"
    url: https://thehackernews.com/2026/11/critical-apache-http2-flaw-could-let.html
    accessed: 2026-11-13
---

## Why Tier 3

- The only public proof of concept reproduces heap corruption and crashes of Apache worker processes, which Apache restarts. It does not show code execution, so the crash is the outcome rated.
- Red Hat says a reliable exploit has been demonstrated, but names no research, and Wiz said on 2026-11-11 that no exploit was available. The rubric counts a claim only when the demonstration is published, so this does not raise the tier.
- No attacks have been reported, for the crash or for code execution.
- EPSS, which estimates the chance of exploitation, is very low: 0.00398 on Tenable's page, which gives no date. The rubric uses EPSS only to raise a call.

The call moves to Tier 2 if the crash is exploited in the wild or a code-execution exploit is published, and to Tier 1 if code execution is exploited in the wild.

No WAF or CDN vendor rule for this CVE was found. HTTP/2 is often terminated at a CDN or load balancer, which may shield Apache behind it, but no vendor has said so for this flaw.
