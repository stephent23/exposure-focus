---
slug: php-november-2026-security-release
name: PHP November 2026 security release
aliases: []
cves: [CVE-2026-115560, CVE-2026-129289, CVE-2026-129474, CVE-2026-129182, CVE-2026-129496, CVE-2026-129481, CVE-2026-126714]
related_cves: [CVE-2026-129501, CVE-2026-129538, CVE-2026-129291, CVE-2026-129292, CVE-2026-128090, CVE-2026-15353, CVE-2026-129506, CVE-2026-128064, CVE-2026-127960, CVE-2026-129438, CVE-2026-48841]
summary: "PHP fixed 18 flaws on 19 Nov 2026, several rated critical, but PHP says the critical ones need a non-default configuration or an uncommon setup, and no attacks are reported."
attack: rce
status: published
published: 2026-11-20
evidence_as_of: 2026-11-20
review_until: 2026-12-04
leadership_quote: "PHP released fixes on 19 Nov 2026 for 18 flaws, some of which could let an attacker run code. PHP says the serious ones only apply to unusual setups, and no attacks are reported. Include the update in the normal patch cycle."
tier_reason: "The critical flaws need a non-default configuration or an uncommon setup, and there are no attacks or published exploits, so this is Routine, not Prioritised."
would_change:
  - Moves up if attacks or a working public exploit are reported for any of the critical flaws
  - "Moves up if a flaw turns out to work in a default setup"
affected:
  - product: PHP 8.2
    vulnerable: before 8.2.36
    fixed: 8.2.36
  - product: PHP 8.3
    vulnerable: before 8.3.37
    fixed: 8.3.37
  - product: PHP 8.4
    vulnerable: before 8.4.28
    fixed: 8.4.28
  - product: PHP 8.5
    vulnerable: before 8.5.13
    fixed: 8.5.13
  - product: PHP 8.1 and older
    vulnerable: "End of life; no fix from PHP"
exposed_when:
  - "Critical flaws only: a non-default configuration or an uncommon setup, per PHP"
  - "CVE-2026-129289: PHP-FPM behind a proxy that reuses backend connections"
  - "CVE-2026-115560: code switches session.serialize_handler to php at runtime"
applies_check:
  - question: Do you run PHP 8.1 to 8.5?
    how_to_check: "Run `php -v` on each server and in each container image. Distribution packages can carry fixes without a version change, so check your distribution's tracker."
  - question: Does a proxy reuse connections to PHP-FPM?
    how_to_check: "Look for `fastcgi_keep_conn on` in nginx, `enablereuse=on` in Apache `mod_proxy_fcgi`, or FastCGI in HAProxy."
placements:
  - name: PHP web apps, default configuration
    facts: { reachable: true, no_login: true, rare_configuration: true, impact: critical }
    why:
      - PHP says the critical flaws need a non-default configuration or an uncommon setup.
      - No attacks or published exploits reported.
    tier: 4
    action: Update PHP in your normal cycle and restart workers.
  - name: PHP-FPM behind a proxy reusing backend connections
    facts: { reachable: true, no_login: true, rare_configuration: true, impact: critical }
    why:
      - Request smuggling can run code with no login (reported); needs connection reuse.
    tier: 4
    action: Update PHP in your normal cycle; turn off connection reuse if updating has to wait.
  - name: App switches session.serialize_handler at runtime
    facts: { reachable: true, rare_configuration: true, impact: critical }
    why:
      - Code execution needs an unusual code pattern, plus upload progress on.
    tier: 4
    action: Update PHP in your normal cycle; set `session.upload_progress.enabled=0` until then.
mitigations:
  - title: Update PHP and restart every worker
    limitation: "PHP 8.1 and older get no fix; rebuild images that bundle PHP"
    role: fix
    official_guides: [https://www.php.net/archive/2026.php]
    confidence: vendor-stated
  - title: Turn off session upload progress
    limitation: "Covers CVE-2026-115560 only; breaks upload progress bars"
    role: stopgap
    official_guides: [https://www.php.net/archive/2026.php]
    confidence: vendor-stated
  - title: Turn off FastCGI connection reuse in the proxy
    limitation: "Covers CVE-2026-129289 only; may cost some performance"
    role: stopgap
    official_guides: [https://www.aikido.dev/blog/php-security-release-19-november-2026-cve-2026-115560]
    confidence: reported
evidence:
  - label: Vendor advisory
    text: "php.net announced the release on 18 Nov for 19 Nov 2026, 14:00 to 14:30 UTC, for all supported versions, highest severity critical, and said the critical issues require either non-default configuration or uncommon setups. On 19 Nov it published 8.2.36, 8.3.37, 8.4.28 and 8.5.13, each labelled a security release."
    as_of: 2026-11-20
    source_url: https://www.php.net/archive/2026.php
    confidence: vendor-stated
  - label: Fixed flaws
    text: "Aikido counts 18 CVEs, each with a GHSA advisory in php-src. SecurityOnline lists seven at CVSS 9.2: session serializer mismatch (CVE-2026-115560), FPM request smuggling (CVE-2026-129289) and use-after-free or session-file flaws (CVE-2026-129474, -129182, -129496, -129481, -126714). The per-CVE GHSA pages and the 8.2 to 8.5 changelog sections were not read in full."
    as_of: 2026-11-20
    source_url: https://securityonline.info/php-security-release-cve-2026-115560/
    confidence: reported
  - label: Exploitation status
    text: "SecurityOnline and Aikido report no in-the-wild exploitation. SecurityOnline notes GitHub repositories claiming exploits for CVE-2026-115560, but cites Brandefense as finding no confirmed working exploit. Not in CISA KEV as far as reported; the catalog was not opened."
    as_of: 2026-11-20
    source_url: https://securityonline.info/php-security-release-cve-2026-115560/
    confidence: reported
  - label: FPM request smuggling
    text: "Aikido, summarising PHP's advisory, says CVE-2026-129289 needs a front end that keeps backend connections open (nginx fastcgi_keep_conn on, Apache enablereuse=on, HAProxy FastCGI, LSAPI) and an app that opens php://input without reading it all; one request can then run PHP code as the worker, with no login."
    as_of: 2026-11-20
    source_url: https://www.aikido.dev/blog/php-security-release-19-november-2026-cve-2026-115560
    confidence: reported
  - label: Session serializer mismatch
    text: "PHP's 23 Oct notice: CVE-2026-115560 needs session.serialize_handler set to php_binary or php_serialize, switched to php with ini_set() before session_start(), with session upload progress on (the default). It suggested session.upload_progress.enabled=0 until a fix."
    as_of: 2026-11-20
    source_url: https://www.php.net/archive/2026.php
    confidence: vendor-stated
timeline:
  - { event: "PHP publishes a notice and stopgap for CVE-2026-115560", date: 2026-10-23, source_url: "https://www.php.net/archive/2026.php", confidence: vendor-stated }
  - { event: "PHP announces the security release", date: 2026-11-18, source_url: "https://www.php.net/archive/2026.php", confidence: vendor-stated }
  - { event: "PHP releases 8.2.36, 8.3.37, 8.4.28 and 8.5.13", date: 2026-11-19, source_url: "https://www.php.net/archive/2026.php", confidence: vendor-stated }
sources:
  - { title: "PHP news archive 2026", url: "https://www.php.net/archive/2026.php", accessed: 2026-11-20 }
  - { title: "PHP home page", url: "https://www.php.net/", accessed: 2026-11-20 }
  - { title: "PHP 8 ChangeLog", url: "https://www.php.net/ChangeLog-8.php", accessed: 2026-11-20 }
  - { title: "Aikido: PHP security release, 19 November 2026", url: "https://www.aikido.dev/blog/php-security-release-19-november-2026-cve-2026-115560", accessed: 2026-11-20 }
  - { title: "SecurityOnline: PHP security release (CVE-2026-115560)", url: "https://securityonline.info/php-security-release-cve-2026-115560/", accessed: 2026-11-20 }
  - { title: "LWN: PHP security releases", url: "https://lwn.net/Articles/1102014/", accessed: 2026-11-20 }
---

Routine because PHP itself says the critical flaws only apply to non-default configurations or uncommon setups, and no attacks or working public exploits are reported. CVSS 9.2 on several flaws is for reference only. The per-flaw details come from Aikido and SecurityOnline, not from PHP's own advisories, so they are marked reported.

This release also fixes CVE-2026-115560, the third flaw linked to PHP2Shell, which had no fix when the PHP2Shell verdict was written. PHP 8.1 and older get no fix from PHP. No WAF or CDN rule for these flaws was found.
