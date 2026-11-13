---
slug: apache-httpd-mod-http2
name: Apache HTTP Server mod_http2 remote code execution
aliases: ["mod_http2 assign_headers race"]
cves: [CVE-2026-119618]
summary: "A flaw in the HTTP/2 module of Apache HTTP Server 2.4.55 to 2.4.70 lets an outsider with no login corrupt the server's memory and run commands on a web server that has HTTP/2 turned on. It is fixed in 2.4.71. Red Hat says public research has shown a reliable exploit, but no exploit has been named and no attacks have been reported."
attack: rce
status: published
evidence_as_of: 2026-11-13
review_until: 2026-11-27

leadership_quote: "A flaw in the HTTP/2 part of the Apache web server, one of the most widely used web servers, lets an outsider take over a server without logging in. It only matters where HTTP/2 is switched on, and no attacks have been reported so far. The Apache project rates it critical and Red Hat says a reliable attack has been demonstrated, so internet-facing Apache servers with HTTP/2 on should be updated, or have HTTP/2 switched off, sooner than the normal cycle."

applies_check:
  - question: Do you run Apache HTTP Server 2.4.55 to 2.4.70, or the standalone mod_h2 module 2.0.8 to 2.0.42?
    how_to_check: "On each server run `httpd -v`, `apache2 -v` or `apachectl -v`. On distributions that ship their own module build, check the mod_http2 package too (for example `rpm -q mod_http2` on RHEL) and compare it with your vendor's fixed package: Red Hat says mod_http2 before 2.0.8 does not contain the affected code and RHEL 8 and earlier are not affected. Also look inside container images and appliances that bundle Apache."
  - question: Is HTTP/2 turned on anywhere in your Apache configuration?
    how_to_check: "Search the configuration for the `Protocols` directive, server-wide and in every virtual host: Red Hat suggests `grep -r 'Protocols' /etc/httpd/conf/ /etc/httpd/conf.d/` (on Debian and Ubuntu, search `/etc/apache2`). HTTP/2 is on where the list includes `h2` (over TLS) or `h2c` (cleartext). Check that mod_http2 is loaded with `httpd -M | grep http2`, or on RHEL `grep http2 /etc/httpd/conf.modules.d/*.conf`."
  - question: Can an outsider talk HTTP/2 to Apache directly?
    how_to_check: "Red Hat's client check is `curl -kI --http2 https://localhost`: a reply of `HTTP/2 200` means HTTP/2 is on, `HTTP/1.1 200 OK` means it is off. If a load balancer, CDN or reverse proxy sits in front, also find out whether it passes HTTP/2 through to Apache or speaks HTTP/1.1 to it; a test from outside only shows the front door."

placements:
  - name: Internet-facing Apache 2.4.55 to 2.4.70 with HTTP/2 enabled
    facts: { reachable: true, no_login: true, credible_researcher_claim: true, impact: critical }
    why:
      - An outsider can reach the server.
      - No login needed (Apache and Red Hat).
      - Code execution means control of the server process and the data it serves.
      - Red Hat says public research has demonstrated a reliable exploit against a default-configured server, but names no exploit, and no exploit code has been found. Counted as demonstrated.
      - No exploitation in the wild has been reported.
    tier: 2
    action: "Urgent: update to Apache HTTP Server 2.4.71 or your vendor's fixed package sooner than your normal patching cycle, and restart Apache. Where no fixed package exists yet (reported for some Debian releases, Amazon Linux, JBoss Core Services and the archived standalone mod_h2 module), switch HTTP/2 off until it does. Moves to Emergency if exploit code is published or attacks are reported."
  - name: Apache with HTTP/2 not enabled
    facts: { vendor_stated_exposure_condition: false }
    why:
      - Apache and Red Hat say only servers with HTTP/2 (h2 or h2c) enabled through the Protocols directive are affected; servers serving only HTTP/1.1 are not.
    tier: 4
    action: Routine patching. Check every virtual host before relying on this, and update anyway in your normal cycle.
  - name: Apache with HTTP/2 reachable only from internal networks
    facts: { reachable: false, no_login: true, credible_researcher_claim: true, impact: critical }
    why:
      - An outsider cannot reach the server directly.
    tier: 4
    action: Routine patching. Move up if the server can be reached from the internet or from untrusted networks, including through a proxy that passes HTTP/2 through.

vectors:
  - Attacker sends crafted HTTP/2 traffic to the web server

mitigations:
  - title: Update Apache HTTP Server or your vendor's mod_http2 package
    summary: "The Apache project fixed the flaw in 2.4.71, released 2026-11-11. Red Hat says fixes are available for most affected products and the rest are being expedited. Package versions are reported by The Hacker News, not confirmed on Red Hat's pages: RHEL 9 mod_http2-2.0.26-7.el9_9.1 (RHSA-2026:98981) and RHEL 10 mod_http2-2.0.29-5.el10_3.1 (RHSA-2026:98978); Debian unstable fixed in apache2 2.4.71-1, with Debian bookworm, trixie and forky and Amazon Linux still waiting. Apache lists the standalone mod_h2 module 2.0.8 to 2.0.42 as affected; it is reported to have no fix because the project is archived."
    effect:
      - { vector: Attacker sends crafted HTTP/2 traffic to the web server, status: closed }
    takes: A package update and a restart of Apache on each server, plus rebuilding any container images that bundle it.
    might_break: "No breakage is reported. Version 2.4.71 also carries other fixes, so test it like any server update."
    official_guides:
      - https://httpd.apache.org/security/vulnerabilities_24.html
      - https://access.redhat.com/security/vulnerabilities/RHSB-2026-017
    check_it_worked: "Run `httpd -v` or `apache2 -v`, or check the installed package version, and confirm the running Apache process started after the update."
    undo: Reinstall the previous package. This reopens the flaw, so switch HTTP/2 off first.
    confidence: vendor-stated
  - title: Switch HTTP/2 off until you can update
    summary: "Red Hat's mitigation: edit the httpd configuration (`/etc/httpd/conf/httpd.conf` or files in `/etc/httpd/conf.d/`), remove `h2` and `h2c` from every `Protocols` directive so it reads `Protocols http/1.1`, then run `systemctl restart httpd`. The same directive applies on other distributions. The Apache advisory is reported to offer no workaround of its own."
    effect:
      - { vector: Attacker sends crafted HTTP/2 traffic to the web server, status: closed }
    takes: A configuration change in each server and virtual host, and a restart.
    might_break: "Red Hat warns of some loss of performance and bandwidth efficiency. Anything that needs HTTP/2 end to end, such as gRPC proxied through Apache, stops working."
    official_guides:
      - https://access.redhat.com/security/vulnerabilities/RHSB-2026-017
    check_it_worked: "Run `curl -kI --http2 https://localhost` and confirm the reply is `HTTP/1.1 200 OK`, not `HTTP/2 200`. Repeat for each virtual host, and against Apache directly if a proxy sits in front."
    undo: Put `h2` and `h2c` back in the Protocols directive and restart, once the fix is in place.
    confidence: vendor-stated

evidence:
  - label: Vendor advisory
    text: "Apache HTTP Server security page, under 'Fixed in Apache HTTP Server 2.4.71': 'mod_http2: heap corruption and RCE in assign_headers', severity critical. A concurrency flaw in mod_http2's assign_headers() 'can lead to RCE'. Affects httpd 2.4.55 through 2.4.70 and mod_h2 2.0.8 through 2.0.42; fixed in 2.4.71, released 2026-11-11. Credited to Anthropic's OSS Scanner and to Anthony Weems and Simon Scannell of Google Cloud Vulnerability Research. The page does not discuss exploit code or attacks."
    as_of: 2026-11-13
    source_url: https://httpd.apache.org/security/vulnerabilities_24.html
    confidence: vendor-stated
  - label: Distribution advisory
    text: "Red Hat bulletin RHSB-2026-017 (public 2026-11-12, impact Critical): an unauthenticated remote attacker who can send HTTP/2 requests can corrupt memory and execute arbitrary commands; only servers with HTTP/2 enabled through the Protocols directive are affected. Red Hat's CVE page rates it Critical overall but Important on RHEL 9 and 10, because their mod_http2 packages give each HTTP/2 stream its own allocator, which substantially increases the complexity of exploitation. Red Hat says mod_http2 before 2.0.8 lacks the affected code and RHEL 8 and earlier are not affected. Red Hat gives CVSS 3.1 9.8 (reference only)."
    as_of: 2026-11-13
    source_url: https://access.redhat.com/security/vulnerabilities/RHSB-2026-017
    confidence: vendor-stated
  - label: Exploit evidence
    text: "Red Hat's CVE page states 'public research has demonstrated a reliable exploit against a default-configured server with the mod_http2 module enabled'. It does not name or link the research, and no exploit code was found in this check. Wiz is reported by The Hacker News as saying no exploit was available; Wiz's own page was not opened. Treated as a credible claim of a demonstrated exploit, not as public exploit code."
    as_of: 2026-11-13
    source_url: https://access.redhat.com/security/cve/CVE-2026-119618
    confidence: vendor-stated
  - label: Observed attacker activity
    text: "Red Hat's bulletin reports no exploitation in the wild, and no other source reviewed reports attacks or scanning. The CISA KEV catalogue could not be opened in this check, so a listing cannot be ruled out. A watchTowr post on X about the flaw could not be opened."
    as_of: 2026-11-13
    source_url: https://access.redhat.com/security/vulnerabilities/RHSB-2026-017
    confidence: vendor-stated
  - label: Press report
    text: "The Hacker News reports the affected and fixed versions, Red Hat's package fixes, the status of Debian, Amazon Linux and Ubuntu, and the disagreement between Red Hat and Wiz about whether an exploit exists."
    as_of: 2026-11-13
    source_url: https://thehackernews.com/2026/11/critical-apache-http2-flaw-could-let.html
    confidence: reported

timeline:
  - { event: "Flaw reported to the Apache project by Anthropic's OSS Scanner", date: 2026-10-26, source_url: "https://httpd.apache.org/security/vulnerabilities_24.html", confidence: vendor-stated }
  - { event: "Flaw also reported by Google Cloud Vulnerability Research", date: 2026-11-03, source_url: "https://httpd.apache.org/security/vulnerabilities_24.html", confidence: vendor-stated }
  - { event: "Apache HTTP Server 2.4.71 released with the fix", date: 2026-11-11, source_url: "https://httpd.apache.org/security/vulnerabilities_24.html", confidence: vendor-stated }
  - { event: "Red Hat publishes bulletin RHSB-2026-017", date: 2026-11-12, time: "18:03", source_url: "https://access.redhat.com/security/vulnerabilities/RHSB-2026-017", confidence: vendor-stated }

sources:
  - title: Apache HTTP Server 2.4 vulnerabilities
    url: https://httpd.apache.org/security/vulnerabilities_24.html
    accessed: 2026-11-13
  - title: "Red Hat RHSB-2026-017: Remote Code Execution - Apache HTTP Server (CVE-2026-119618)"
    url: https://access.redhat.com/security/vulnerabilities/RHSB-2026-017
    accessed: 2026-11-13
  - title: "Red Hat CVE page: CVE-2026-119618"
    url: https://access.redhat.com/security/cve/CVE-2026-119618
    accessed: 2026-11-13
  - title: "The Hacker News: Critical Apache HTTP/2 flaw could let unauthenticated attackers execute code remotely"
    url: https://thehackernews.com/2026/11/critical-apache-http2-flaw-could-let.html
    accessed: 2026-11-13
  - title: "Cloud Security Alliance: CISO daily briefing, 12 November 2026"
    url: https://labs.cloudsecurityalliance.org/research/alt-ciso-briefing-2026-11-12/
    accessed: 2026-11-13
---

The tier rests on Red Hat's statement that a reliable exploit has been demonstrated. That counts as a credible claim, not as an exploit in use, because the research is not named and no exploit code or attacks have been found. If exploit code is published or attacks are reported, the headline placement moves to Emergency. No WAF or CDN vendor rule for this CVE was found; HTTP/2 traffic is often terminated at a CDN or load balancer, which may shield Apache behind it, but no vendor has said so for this flaw.

The distribution package versions and the Wiz position come from press reporting and have not been checked on those vendors' own pages.
