---
slug: apache-httpd-mod-http2
name: Apache HTTP Server mod_http2 remote code execution
aliases: ["mod_http2 assign_headers race"]
cves: [CVE-2026-119618]
summary: "A flaw in Apache HTTP Server's HTTP/2 module lets an outsider with no login corrupt memory, and possibly run commands, where HTTP/2 is on. Public code only crashes workers; no attacks are reported."
attack: rce
status: published
published: 2026-11-13
evidence_as_of: 2026-11-13
review_until: 2026-11-27

leadership_quote: "A flaw in the Apache web server can let an outsider crash a server without logging in, and possibly take it over. It only matters where HTTP/2 is on, and no attacks are reported. Schedule the update for internet-facing servers ahead of normal patching; switch HTTP/2 off where no update exists yet."
tier_reason: "Rated critical by Apache and Red Hat, but the only public code crashes worker processes and no attacks are reported, so the crash is the outcome rated."
would_change:
  - Moves up if the crash is exploited, or if code execution is published or exploited
affected:
  - product: Apache HTTP Server 2.4
    vulnerable: 2.4.55 to 2.4.70
    fixed: "2.4.71, or a distribution package with the fix"
  - product: Standalone mod_h2 module
    vulnerable: 2.0.8 to 2.0.42
exposed_when:
  - "HTTP/2 is on: a Protocols directive lists h2 or h2c and mod_http2 is loaded"

applies_check:
  - question: Do you run an affected Apache HTTP Server or mod_http2 build?
    how_to_check: "Run `httpd -v` or `apache2 -v`, then check the distribution package: distributions fix it without moving to 2.4.71. Check container images and appliances too."
  - question: Is HTTP/2 turned on anywhere in your Apache configuration?
    how_to_check: "Search every `Protocols` directive for `h2` or `h2c`: `grep -r 'Protocols' /etc/httpd/conf/ /etc/httpd/conf.d/` (or `/etc/apache2`). Confirm with `httpd -M | grep http2`."
  - question: Can an outsider talk HTTP/2 to Apache directly?
    how_to_check: "Run `curl -kI --http2 https://localhost`: `HTTP/2 200` means it is on. Find out whether any proxy or CDN in front passes HTTP/2 through to Apache."

placements:
  - name: Internet-facing Apache 2.4.55 to 2.4.70 with HTTP/2 enabled
    facts: { reachable: true, no_login: true, public_exploit: true, exploit_achieves: significant, impact: critical }
    why:
      - No login needed; code execution would mean control of the server.
      - Public proof-of-concept code only crashes worker processes, which Apache restarts.
      - Red Hat's claim of a reliable exploit names no published research, so it does not count.
      - No attacks reported.
    tier: 3
    action: "Schedule the update to 2.4.71 or your distribution's fixed package ahead of normal patching. Where no fix exists yet, switch HTTP/2 off."
  - name: Apache with HTTP/2 reachable only from internal networks
    facts: { reachable: false, no_login: true, public_exploit: true, exploit_achieves: significant, impact: critical }
    why:
      - An outsider cannot reach the server directly.
    tier: 4
    action: Patch in your normal cycle.

mitigations:
  - title: "Update Apache and restart it"
    limitation: "Standalone mod_h2 is reported to have no fix (archived)"
    role: fix
    official_guides:
      - https://httpd.apache.org/security/vulnerabilities_24.html
      - https://access.redhat.com/security/vulnerabilities/RHSB-2026-017
      - https://security-tracker.debian.org/tracker/CVE-2026-119618
      - https://ubuntu.com/security/CVE-2026-119618
    confidence: vendor-stated
  - title: "Turn off HTTP/2 until patched"
    limitation: "Costs some performance; breaks end-to-end HTTP/2 such as gRPC"
    role: stopgap
    official_guides:
      - https://access.redhat.com/security/vulnerabilities/RHSB-2026-017
      - https://www.wiz.io/blog/cve-2026-119618-rce-apache-http-server-vulnerability
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

The public proof of concept only crashes Apache workers, and Red Hat's claim of a reliable exploit names no published research, so the crash is what is rated. Distributions fix it with backports below 2.4.71 (Ubuntu's fixed package is `2.4.58-1ubuntu8.19`, for example), so check the package, not only the version number. No WAF or CDN rule for this flaw was found.
