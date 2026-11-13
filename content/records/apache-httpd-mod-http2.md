---
slug: apache-httpd-mod-http2
name: Apache HTTP Server mod_http2 remote code execution
aliases: ["mod_http2 assign_headers race"]
cves: [CVE-2026-119618]
summary: "A reported flaw in the HTTP/2 module of Apache HTTP Server 2.4.55 to 2.4.70 may let an outsider with no login run code on a web server that has HTTP/2 turned on. Version 2.4.71 is reported to fix it. Whether a working exploit is public is disputed, and no attacks have been reported."
attack: rce
status: draft
evidence_as_of: 2026-11-13
review_until: 2026-11-27

leadership_quote: "A flaw in the HTTP/2 part of the Apache web server, one of the most widely used web servers, may let an outsider take over a server without logging in. It only matters where HTTP/2 is switched on, and no attacks have been reported so far. Sources disagree about whether a working attack has been published, so updating internet-facing Apache servers sooner than the normal cycle is a reasonable call."

applies_check:
  - question: Do you run Apache HTTP Server 2.4.55 to 2.4.70?
    how_to_check: "On each server run `httpd -v` or `apache2 -v` (or `apachectl -v`). Check your distribution's package rather than the upstream number alone: Red Hat and others ship their own mod_http2 builds, so compare the installed package with your vendor's fixed package. Also look inside container images and appliances that bundle Apache."
  - question: Is HTTP/2 turned on anywhere in your Apache configuration?
    how_to_check: "Search the configuration for the `Protocols` directive, server-wide and in every virtual host: `grep -Ri '^\\s*Protocols' /etc/httpd /etc/apache2`. HTTP/2 is on where the list includes `h2` (over TLS) or `h2c` (cleartext). Also check that mod_http2 is loaded: `httpd -M | grep http2` or `apache2ctl -M | grep http2`."
  - question: Can an outsider talk HTTP/2 to Apache directly?
    how_to_check: "If a load balancer, CDN or reverse proxy sits in front, find out whether it passes HTTP/2 through to Apache or speaks HTTP/1.1 to it. Test from outside with `curl -sI --http2 https://<your-host>/` and look for `HTTP/2` in the reply; note that this shows the front door, not necessarily Apache."

placements:
  - name: Internet-facing Apache 2.4.55 to 2.4.70 with HTTP/2 enabled
    facts: { reachable: true, no_login: true, credible_researcher_claim: true, impact: critical }
    why:
      - An outsider can reach the server.
      - No login needed (Red Hat, as reported by The Hacker News).
      - Code execution in the web server process means control of the server and what it serves.
      - Red Hat is reported as saying public research has demonstrated a reliable exploit; Wiz is reported as saying no exploit is available. Counted as demonstrated, not as a public exploit, until one is confirmed.
      - No exploitation in the wild has been reported.
    tier: 2
    action: "Urgent: update to Apache HTTP Server 2.4.71 or your vendor's fixed package sooner than your normal patching cycle, and restart Apache. Where no fixed package exists yet (some Debian releases, Amazon Linux, the standalone mod_h2 module), turn HTTP/2 off until it does. Moves to Emergency if a reliable public exploit is confirmed or attacks are reported."
  - name: Apache with HTTP/2 not enabled
    facts: { vendor_stated_exposure_condition: false }
    why:
      - Red Hat is reported as saying only servers with HTTP/2 enabled are affected.
      - HTTP/2 is off unless the Protocols directive lists h2 or h2c.
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
    summary: "Upstream 2.4.71 is reported to fix the flaw. Red Hat is reported to have fixed mod_http2 packages for RHEL 9 (mod_http2-2.0.26-7.el9_9.1, RHSA-2026:98981) and RHEL 10 (mod_http2-2.0.29-5.el10_3.1, RHSA-2026:98978), with RHEL 6, 7 and 8 not affected. Debian unstable is reported fixed in apache2 2.4.71-1, while Debian bookworm, trixie and forky and Amazon Linux were reported as still waiting for a fix. The standalone mod_h2 module (2.0.8 to 2.0.42) is reported as affected with no fix, as the project is archived. None of these versions has been checked against the vendors' own pages."
    effect:
      - { vector: Attacker sends crafted HTTP/2 traffic to the web server, status: closed }
    takes: A package update and a restart of Apache on each server, plus rebuilding any container images that bundle it.
    might_break: "No breakage is reported. Version 2.4.71 also carries other fixes (reported: a mod_md crash and a mod_vhost_alias issue), so test it like any server update."
    official_guides: ["[link to add]"]
    check_it_worked: "Run `httpd -v` or `apache2 -v`, or check the installed package version, and confirm the running Apache process started after the update."
    undo: Reinstall the previous package. This reopens the flaw, so turn HTTP/2 off first.
    confidence: reported
  - title: Turn HTTP/2 off until you can update
    summary: "Remove `h2` and `h2c` from every `Protocols` directive so it reads `Protocols http/1.1`, then reload Apache. Wiz is reported to advise this; the Apache advisory is reported to offer no workaround. Not checked against Wiz's or Apache's own pages."
    effect:
      - { vector: Attacker sends crafted HTTP/2 traffic to the web server, status: closed }
    takes: A configuration change in each server and virtual host, and a reload.
    might_break: "Clients fall back to HTTP/1.1, which can be slower for busy sites. Anything that needs HTTP/2 end to end, such as gRPC proxied through Apache, stops working."
    official_guides: ["[link to add]"]
    check_it_worked: "From outside run `curl -sI --http2 https://<your-host>/` against Apache directly and confirm the reply is `HTTP/1.1`. Repeat for each virtual host."
    undo: Put `h2` and `h2c` back in the Protocols directive and reload, once the fix is in place.
    confidence: reported

evidence:
  - label: Vendor advisory
    text: "Not opened. The Hacker News reports that CVE-2026-119618 is a flaw in mod_http2 that affects Apache HTTP Server 2.4.55 to 2.4.70, is fixed in 2.4.71, and that Apache's advisory offers no workaround. The Apache security page, the CVE record and NVD could not be opened in this check, so the affected versions, fixed version and Apache's own severity are unconfirmed."
    as_of: 2026-11-13
    source_url: https://thehackernews.com/2026/11/critical-apache-http2-flaw-could-let.html
    confidence: reported
  - label: Distribution advisory
    text: "As reported by The Hacker News: Red Hat says only servers with HTTP/2 enabled are affected, an attacker who can reach the server needs no authentication, and it could take full control of the server process. Red Hat rates it CVSS 9.8 Critical in general but Important on RHEL 9 and 10, because its mod_http2 packages give each HTTP/2 stream its own memory allocator, which makes an attack much harder. Red Hat's own page could not be opened."
    as_of: 2026-11-13
    source_url: https://thehackernews.com/2026/11/critical-apache-http2-flaw-could-let.html
    confidence: reported
  - label: Exploit evidence
    text: "Disputed. The Hacker News reports Red Hat's assessment as saying public research has demonstrated a reliable exploit against a server in default configuration with mod_http2 enabled, without naming or linking it. It reports Wiz, later the same day, as saying no exploit was available and no exploitation in the wild had been reported. Neither statement was checked at its source. The Cloud Security Alliance briefing of 12 Nov reports the same disagreement."
    as_of: 2026-11-13
    source_url: https://thehackernews.com/2026/11/critical-apache-http2-flaw-could-let.html
    confidence: reported
  - label: Observed attacker activity
    text: "No source reviewed reports attacks, scanning or a CISA KEV listing. The CISA KEV catalogue could not be opened in this check, so a listing cannot be ruled out."
    as_of: 2026-11-13
    source_url: https://labs.cloudsecurityalliance.org/research/alt-ciso-briefing-2026-11-12/
    confidence: reported

timeline:
  - { event: "Flaw reported to the Apache project by Anthropic's OSS Scanner (as reported)", date: 2026-10-26, source_url: "https://thehackernews.com/2026/11/critical-apache-http2-flaw-could-let.html", confidence: reported }
  - { event: "Red Hat publishes its assessment (as reported)", date: 2026-11-11, source_url: "https://thehackernews.com/2026/11/critical-apache-http2-flaw-could-let.html", confidence: reported }
  - { event: "The Hacker News reports the flaw and the disputed exploit claim", date: 2026-11-12, source_url: "https://thehackernews.com/2026/11/critical-apache-http2-flaw-could-let.html", confidence: reported }

sources:
  - title: "The Hacker News: Critical Apache HTTP/2 flaw could let unauthenticated attackers execute code remotely"
    url: https://thehackernews.com/2026/11/critical-apache-http2-flaw-could-let.html
    accessed: 2026-11-13
  - title: "Cloud Security Alliance: CISO daily briefing, 12 November 2026"
    url: https://labs.cloudsecurityalliance.org/research/alt-ciso-briefing-2026-11-12/
    accessed: 2026-11-13
---

This is a draft. Every fact above comes from press reports of the Apache, Red Hat and Wiz statements; the Apache security page, the CVE record, NVD, Red Hat's page, the Debian and Ubuntu trackers, Wiz's page, EPSS and the CISA KEV catalogue could not be opened in this check. No WAF or CDN vendor rule for this CVE was found.

The tier rests on the disputed exploit claim. If a reliable public exploit is confirmed, or attacks are reported, the headline placement moves to Emergency. If Red Hat's claim turns out to be wrong and no proof of concept or credible demonstration exists, the rubric would give Prioritised instead.
