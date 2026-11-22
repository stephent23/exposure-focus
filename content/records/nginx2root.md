---
slug: nginx2root
name: NGINX2Root (NGINX HTTP/2 flow control flaw)
aliases: ["NGINX2Root"]
cves: [CVE-2026-123007]
related_cves: [CVE-2026-123633, CVE-2026-123634, CVE-2026-121810, CVE-2026-113425]
summary: "A flaw in NGINX's HTTP/2 code lets an outsider with no login corrupt memory; public code takes over a test server in a lab. Fixed in 1.30.7 and 1.31.9."
attack: rce
status: published
published: 2026-11-19
evidence_as_of: 2026-11-19
review_until: 2026-12-03

leadership_quote: "A flaw in NGINX, one of the most widely used web servers, can let an outsider crash it, and in tests take it over, without logging in. Public attack code only works in a lab set-up and no attacks are reported. Update internet-facing NGINX that uses HTTP/2 sooner than usual."
tier_reason: "Public code reaches code execution only against a freshly started local test container, other exploits are withheld and no attacks are reported, so the outcome rated is a worker crash."
would_change:
  - Emergency if attacks are reported, or exploit code is shown to work against ordinary internet servers
  - Urgent if code execution is published against an unprepared remote server

affected:
  - product: NGINX Open Source
    vulnerable: 1.9.5 to 1.31.8
    fixed: "1.30.7 (stable), 1.31.9 (mainline)"
  - product: NGINX Plus
    vulnerable: "R33 to R36, and 37.x before the fixed builds (Tenable; F5 page unreadable)"
    fixed: "37.0.8.1 or 37.3.0.1; R33 to R36 have no fix and must move to 37.x"
  - product: Ubuntu nginx packages
    vulnerable: "16.04 LTS to 26.10 listed as vulnerable on 18 Nov; no fixed package yet"
exposed_when:
  - "HTTP/2 is on: a `listen` line includes `http2`, or `http2 on;` is set"
  - Clients can speak HTTP/2 to NGINX itself, not only to a proxy or CDN in front of it

applies_check:
  - question: Do you run NGINX or NGINX Plus anywhere?
    how_to_check: "Run `nginx -v` on hosts and inside container images, ingress controllers and appliances. Distributions can fix it without changing that version, so also check the package changelog."
  - question: Is HTTP/2 turned on?
    how_to_check: "Run `nginx -T | grep -E 'listen.*http2|http2 on'`. Any match means HTTP/2 is on for that server block."
  - question: Can an outsider speak HTTP/2 to NGINX directly?
    how_to_check: "Test the origin, not the CDN: `curl -kI --http2 https://<origin>`. A reply of `HTTP/2` means it is reachable; an origin that only accepts HTTP/1.1 is not."

placements:
  - name: Internet-facing NGINX 1.9.5 to 1.31.8 with HTTP/2 on
    facts: { reachable: true, no_login: true, public_exploit: true, exploit_achieves: significant, impact: critical }
    why:
      - Reachable, and no login is needed.
      - Code execution would give control of the NGINX worker and the traffic and keys it holds.
      - Public code reaches code execution only against a freshly started local test container; its author says it will likely fail elsewhere.
      - Other researchers' exploits are withheld, so they do not raise the call.
      - No attacks reported; not in CISA KEV as of 18 Nov.
    tier: 3
    action: "Update to 1.30.7, 1.31.9 or a fixed package and restart, sooner than your normal cycle. Until then, turn HTTP/2 off."
  - name: NGINX with HTTP/2 off
    facts: { vendor_stated_exposure_condition: false }
    why:
      - This flaw is in the HTTP/2 module and needs HTTP/2 enabled on the listener.
      - The related HTTP/3, resolver and mail flaws are not covered by this.
    tier: 4
    action: Routine patching. Check every server block before relying on this.
  - name: NGINX reachable only from internal networks
    facts: { reachable: false, no_login: true, public_exploit: true, exploit_achieves: significant, impact: critical }
    why:
      - An outsider cannot reach it directly.
    tier: 4
    action: Routine patching. Move up if it is reachable from the internet or untrusted networks.

mitigations:
  - title: Update NGINX to 1.30.7 or 1.31.9 and restart it
    limitation: "A reload keeps the old binary running; distribution packages lag"
    role: fix
    official_guides:
      - https://nginx.org/en/security_advisories.html
      - https://www.tenable.com/blog/nginx2root-cve-2026-123007-frequently-asked-questions-about-five-critical-nginx
      - https://ubuntu.com/security/CVE-2026-123007
    confidence: vendor-stated
  - title: Turn off HTTP/2 until patched
    limitation: "Leaves the related HTTP/3, resolver and mail proxy flaws open"
    role: stopgap
    official_guides:
      - https://www.tenable.com/blog/nginx2root-cve-2026-123007-frequently-asked-questions-about-five-critical-nginx
      - https://thehackernews.com/2026/11/10-year-old-nginx-http2-flaw-lets.html
    confidence: reported

evidence:
  - label: Vendor advisory
    text: "nginx.org security advisories: 'Memory corruption in HTTP/2 flow control', severity major, CVE-2026-123007. Vulnerable 1.9.5-1.31.8; not vulnerable 1.31.9+ and 1.30.7+. The nginx 1.31.9 changelog (18 Nov 2026) says a flow control window overflow in HTTP/2 might let an attacker cause a segmentation fault in a worker process, 'or might have potential other impact', and thanks Xint.io. The linked F5 article (K000163926) did not render, so F5's own text was not read."
    as_of: 2026-11-19
    source_url: https://nginx.org/en/security_advisories.html
    confidence: vendor-stated
  - label: Public exploit code
    text: "Rapid7's Stephen Fewer published a trigger script and an exploit that demonstrates unauthenticated code execution against NGINX 1.31.8 in Docker. The README says it is only suitable against 'a local freshly started Docker container' and will likely fail with concurrent clients, a messy heap, too little bandwidth or proxying. Tenable adds that it needs about 128 GB of HTTP/2 traffic, an x86-64 glibc routine and heap addresses leaked to defeat ASLR. The code was not run."
    as_of: 2026-11-19
    source_url: https://github.com/sfewer-r7/CVE-2026-123007
    confidence: reported
  - label: Exploit evidence
    text: "Tenable reports that Xint, which named the set NGINX2Root, published demo videos but left out the final steps, and that Wiz confirmed working exploits but will not publish them. Wiz reports code execution against an NGINX serving only static files. F5, as quoted by The Hacker News, says code execution works where ASLR is off or can be bypassed. Under the published-claims rule these do not raise the call."
    as_of: 2026-11-19
    source_url: https://www.tenable.com/blog/nginx2root-cve-2026-123007-frequently-asked-questions-about-five-critical-nginx
    confidence: reported
  - label: Observed attacker activity
    text: "Tenable: no reports of attackers exploiting these CVEs, and not in the CISA KEV catalogue, as of 18 Nov. The Hacker News: neither the vendor nor the Wiz and Rapid7 researchers have reported attacks. No scanning reports were found. The CISA catalogue itself was not opened."
    as_of: 2026-11-19
    source_url: https://www.tenable.com/blog/nginx2root-cve-2026-123007-frequently-asked-questions-about-five-critical-nginx
    confidence: reported
  - label: Distribution advisory
    text: "Ubuntu (18 Nov): priority High; nginx in 16.04 LTS to 26.10 listed as vulnerable with no fixed package yet; its description says attackers can execute code on systems with ASLR disabled. OSV lists AlmaLinux 9 and 10 fixes (ALSA-2026:A025, A024). The Debian tracker did not load."
    as_of: 2026-11-19
    source_url: https://ubuntu.com/security/CVE-2026-123007
    confidence: vendor-stated

timeline:
  - { event: "Xint finds the flaws", date: 2026-10-11, source_url: "https://www.tenable.com/blog/nginx2root-cve-2026-123007-frequently-asked-questions-about-five-critical-nginx", confidence: reported }
  - { event: "Flaws reported to F5", date: 2026-10-16, source_url: "https://www.tenable.com/blog/nginx2root-cve-2026-123007-frequently-asked-questions-about-five-critical-nginx", confidence: reported }
  - { event: "nginx 1.31.9 released with the fix; F5 discloses", date: 2026-11-18, source_url: "https://nginx.org/en/CHANGES", confidence: vendor-stated }
  - { event: "Rapid7 publishes analysis and public exploit code", date: 2026-11-18, source_url: "https://www.tenable.com/blog/nginx2root-cve-2026-123007-frequently-asked-questions-about-five-critical-nginx", confidence: reported }
  - { event: "Ubuntu publishes its CVE page", date: 2026-11-18, source_url: "https://ubuntu.com/security/CVE-2026-123007", confidence: vendor-stated }

were_you_hit:
  assume_compromise_when: "An internet-facing affected NGINX with HTTP/2 shows workers starting other programs, or crashes alongside long, heavy HTTP/2 connections."
  check:
    - "NGINX worker processes starting unexpected programs, or exiting abnormally and leaving core dumps"
    - "Long-lived HTTP/2 connections with heavy inbound traffic but few logged requests"
    - "Unusual outbound connections or DNS lookups from the NGINX host"
  rotate:
    - TLS private keys and secrets held by the NGINX host, if any of the signs above are found

sources:
  - { title: "nginx security advisories", url: "https://nginx.org/en/security_advisories.html", accessed: 2026-11-19 }
  - { title: "nginx changelog", url: "https://nginx.org/en/CHANGES", accessed: 2026-11-19 }
  - { title: "Tenable: NGINX2Root (CVE-2026-123007) FAQ", url: "https://www.tenable.com/blog/nginx2root-cve-2026-123007-frequently-asked-questions-about-five-critical-nginx", accessed: 2026-11-19 }
  - { title: "GitHub: sfewer-r7/CVE-2026-123007", url: "https://github.com/sfewer-r7/CVE-2026-123007", accessed: 2026-11-19 }
  - { title: "Ubuntu: CVE-2026-123007", url: "https://ubuntu.com/security/CVE-2026-123007", accessed: 2026-11-19 }
  - { title: "OSV: CVE-2026-123007", url: "https://osv.dev/vulnerability/CVE-2026-123007", accessed: 2026-11-19 }
  - { title: "The Hacker News: 10-year-old NGINX HTTP/2 flaw lets unauthenticated attackers execute code", url: "https://thehackernews.com/2026/11/10-year-old-nginx-http2-flaw-lets.html", accessed: 2026-11-19 }
  - { title: "Cyber Security News: NGINX HTTP/2 vulnerabilities", url: "https://cybersecuritynews.com/nginx-http-2-vulnerabilities/", accessed: 2026-11-19 }
---

## Why Prioritised and not higher

The public exploit is real code that reaches code execution, but its author says it only suits a freshly started local test container and will likely fail against a busy server, over limited bandwidth or behind a proxy. It also needs about 128 GB of HTTP/2 traffic per attempt. Xint and Wiz say they have working exploits but have not published them. Under the published-claims rule, a demonstration only against the researcher's own nearby target does not raise the call, so the realistic outcome rated is a crash of a worker process, which NGINX restarts. No attacks are reported. This is a judgement on a close case: if anyone shows the code working against an ordinary internet server, the call moves to Emergency.

## Related flaws in the same release

F5 fixed four other memory-safety flaws that Xint grouped under the NGINX2Root name. Each needs a less common set-up: CVE-2026-123633 (HTTP/2 use-after-free when `worker_connections` runs out), CVE-2026-121810 (HTTP/3 turned on), CVE-2026-123634 (resolver with names built from variables plus subrequests) and CVE-2026-113425 (NGINX as a mail proxy). Turning HTTP/2 off does not cover the last three. Versions 1.30.7 and 1.31.9 fix all of them. Restart NGINX after updating, because a reload keeps the old binary running.

No WAF or CDN vendor rule for this flaw was found: Cloudflare's WAF changelog lists none from 17 to 19 Nov. A CDN or load balancer that ends HTTP/2 and talks HTTP/1.1 to NGINX shields the origin, but only if the origin cannot be reached directly. Xint also reported an unpatched Linux kernel flaw (no CVE yet) that would turn worker access into root; it is not rated here.
