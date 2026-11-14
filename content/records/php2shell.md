---
slug: php2shell
name: PHP2Shell
aliases: []
cves: [CVE-2026-109618, CVE-2026-109619, CVE-2026-115560]
summary: Two flaws in the PHP runtime let an attacker run code from a web request with no login, and both are exploited. Internet-facing PHP needs an out-of-cycle response; internal-only PHP does not.
attack: rce
status: published
evidence_as_of: 2026-11-09
review_until: 2026-11-23
leadership_quote: Attackers are exploiting two flaws in PHP that let them take over a web server without logging in. Internet-facing PHP sites need an out-of-cycle response; internal PHP can follow the normal patch cycle. A related third flaw has no fix yet, and PHP suggests turning off one feature until it does.
affected:
  - product: PHP 8.2
    vulnerable: below 8.2.35
    fixed: 8.2.35
  - product: PHP 8.3
    vulnerable: below 8.3.36
    fixed: 8.3.36
  - product: PHP 8.4
    vulnerable: below 8.4.27
    fixed: 8.4.27
  - product: PHP 8.5
    vulnerable: below 8.5.12
    fixed: 8.5.12
  - product: PHP 8.1 and older
    vulnerable: "[versions to confirm]"
  - product: "CVE-2026-115560 (third flaw)"
    vulnerable: Fully patched releases, including 8.5.12 (Cloudflare)
exposed_when:
  - PHP serves requests from the internet, as Apache mod_php or PHP-FPM
  - "CVE-2026-115560 only: session upload progress on and session.serialize_handler switched to php with ini_set()"

applies_check:
  - question: Do you run PHP that serves requests from the internet?
    how_to_check: "Run `php -v` on each web server and check how PHP is served with `php -i | grep 'Server API'`. Distribution packages can carry the fix without changing the version number, so check your distribution's tracker."

placements:
  - name: Internet-facing PHP (Apache mod_php or PHP-FPM)
    facts: { reachable: true, exploited: true, no_login: true, impact: critical }
    why: [Reachable from the internet., Listed in CISA KEV on 2026-10-26., No login needed., Code execution as the web server account.]
    tier: 1
    action: "Out-of-cycle: patch PHP and restart every worker. If you cannot patch at once, apply PHP's configuration workarounds first."
  - name: Internal-only PHP
    facts: { reachable: false, exploited: true, no_login: true, impact: critical }
    why: [Not reachable from the internet.]
    tier: 4
    action: Patch in your normal cycle. Move up if it becomes reachable from the internet.

vectors:
  - "Out-of-memory corruption during request handling (CVE-2026-109618)"
  - "Stale state left behind between requests (CVE-2026-109619)"
  - "Session upload progress with an unusual session setup (CVE-2026-115560, not yet fixed)"

mitigations:
  - title: Update PHP and restart every worker
    summary: "Upgrade to PHP 8.2.35, 8.3.36, 8.4.27 or 8.5.12, or a distribution package that includes the fix. PHP calls updating the only complete mitigation for the first two flaws. Restart Apache or PHP-FPM so no old worker keeps running; rebuild container images that bundle PHP. These releases do not fix CVE-2026-115560, which PHP says it will fix in its next regular release."
    effect:
      - { vector: "Out-of-memory corruption during request handling (CVE-2026-109618)", status: closed }
      - { vector: "Stale state left behind between requests (CVE-2026-109619)", status: closed }
      - { vector: "Session upload progress with an unusual session setup (CVE-2026-115560, not yet fixed)", status: open }
    takes: A package update and a service restart per server.
    might_break: No breakage is reported. Test first anyway. PHP 8.1 and older get no fix from PHP and need a supported release or a vendor backport.
    official_guides:
      - https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w
      - https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp
    check_it_worked: "Run `php -v` through the same SAPI the site uses (for example a temporary page calling phpversion(), removed afterwards) and confirm a fixed release or a patched distribution build. Confirm worker processes started after the update."
    undo: Reinstall the previous package. This reopens both flaws.
    confidence: vendor-stated
  - title: "Stopgap for CVE-2026-109618: remove the memory-limit trigger"
    summary: "Set memory_limit=-1 administratively, keep post_max_size conservative, bound input variables, multipart parts and uploads, and block multipart form requests at the frontend if the application does not use them. Do not use RLIMIT_AS or RLIMIT_DATA. PHP calls this the primary configuration mitigation but not a complete one."
    effect:
      - { vector: "Out-of-memory corruption during request handling (CVE-2026-109618)", status: weaker }
      - { vector: "Stale state left behind between requests (CVE-2026-109619)", status: open }
      - { vector: "Session upload progress with an unusual session setup (CVE-2026-115560, not yet fixed)", status: open }
    takes: A configuration change and a restart of every worker.
    might_break: Removing the per-request memory cap lets one request use much more memory, so you need frontend limits to replace it.
    official_guides: [https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w]
    check_it_worked: "Confirm the running value with phpinfo() or `php -i` for the SAPI in use, and that workers restarted."
    undo: Restore the previous memory_limit and limits, then restart workers.
    confidence: vendor-stated
  - title: "Stopgap for CVE-2026-109619 and CVE-2026-115560: disable upload progress"
    summary: "Set session.upload_progress.enabled=0. This removes the session path PHP demonstrated for CVE-2026-109619, and PHP recommends it even after patching if you do not use the feature. On PHP 8.5, fatal_error_backtraces=0 removes another confirmed path. PHP says there is no complete configuration mitigation for CVE-2026-109619. For CVE-2026-115560, which has no fix yet, this setting is the mitigation PHP suggests until its next regular release."
    effect:
      - { vector: "Out-of-memory corruption during request handling (CVE-2026-109618)", status: open }
      - { vector: "Stale state left behind between requests (CVE-2026-109619)", status: weaker }
      - { vector: "Session upload progress with an unusual session setup (CVE-2026-115560, not yet fixed)", status: closed_for_that_app }
    takes: A configuration change and a restart of every worker.
    might_break: Upload progress bars that rely on PHP sessions stop working.
    official_guides:
      - https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp
      - https://www.php.net/archive/2026.php
    check_it_worked: Confirm session.upload_progress.enabled is Off in phpinfo() for the SAPI in use.
    undo: Set session.upload_progress.enabled back to 1 and restart workers.
    confidence: vendor-stated
  - title: Turn on your WAF vendor's PHP rules
    summary: "Several WAF vendors have shipped rules for the first two CVEs: AWS WAF (the PHP managed rule group), Cloudflare (managed rules, set to block by default on its emergency release) and a Fastly Next-Gen WAF virtual patch. Broadcom publishes rule text for VMware Avi. All of them describe this as an interim measure that blocks known exploit patterns. AWS says no WAF rule is a complete mitigation, and Cloudflare says to patch PHP regardless. Of these, only Cloudflare says its rules also cover CVE-2026-115560. Update any pinned rule-group version to pick up the new rules."
    effect:
      - { vector: "Out-of-memory corruption during request handling (CVE-2026-109618)", status: weaker }
      - { vector: "Stale state left behind between requests (CVE-2026-109619)", status: weaker }
      - { vector: "Session upload progress with an unusual session setup (CVE-2026-115560, not yet fixed)", status: weaker }
    takes: Enable a managed rule group or virtual patch on every site that serves PHP.
    might_break: Rules match known attack patterns, so they can block some legitimate requests. Cloudflare's rule for the session upload path only works while session.upload_progress.name is left at its default. Traffic that bypasses the WAF is not covered.
    official_guides:
      - https://aws.amazon.com/security/security-bulletins/2026-143-aws/
      - https://blog.cloudflare.com/php-vulnerabilities-waf-protection/
      - https://developers.cloudflare.com/changelog/post/2026-10-22-emergency-waf-release-cfmr/
      - https://www.fastly.com/documentation/reference/changes/2026/10/added-virtual-patch-for-CVE-2026-109618-and-CVE-2026-109619/
      - https://knowledge.broadcom.com/external/article/460068
    check_it_worked: "In your WAF console, confirm the rules or virtual patch are on, set to block and not only to log, and applied to every hostname that serves PHP. A WAF does not change the PHP version, so keep checking `php -v` as above."
    undo: Disable the rule group or virtual patch.
    confidence: vendor-stated

evidence:
  - label: CISA KEV
    text: "Both CVEs are in the Known Exploited Vulnerabilities catalog, added 2026-10-26, which means CISA has evidence of exploitation. CISA does not say how many systems were breached."
    as_of: 2026-11-09
    source_url: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
    confidence: vendor-stated
  - label: Vendor advisory
    text: "PHP's advisories confirm unauthenticated remote code execution as the web worker account. Code execution was validated against mod_php for CVE-2026-109618, and against mod_php and FPM for CVE-2026-109619. Affected: below 8.2.35, 8.3.36, 8.4.27 and 8.5.12."
    as_of: 2026-11-09
    source_url: https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w
    confidence: vendor-stated
  - label: Exploit evidence
    text: "BleepingComputer reports a researcher saw working shells on honeypots running PHP 8.4.26 under Apache mod_php, and that other vendors reported exploitation attempts, with reliability varying between those reports. Treat individual attack reports with caution; the KEV listing is the firm signal."
    as_of: 2026-11-09
    source_url: https://www.bleepingcomputer.com/news/security/cisa-confirms-php2shell-vulnerabilities-now-exploited-in-attacks/
    confidence: reported
  - label: Related flaw, vendor notice
    text: "On 2026-10-23 PHP published an informational advisory for a third, related flaw, CVE-2026-115560, in session upload progress. It says it will publish a full advisory with the next release, and suggests setting session.upload_progress.enabled=0 until the next regular bugfix release. Cloudflare says the flaw affects fully patched releases, including 8.5.12. The php.net notice names no fixed version."
    as_of: 2026-11-09
    source_url: https://www.php.net/archive/2026.php
    confidence: vendor-stated
  - label: Related flaw, how it works
    text: "PHP's notice, relayed on the oss-sec list, describes a possible code execution route that needs an unusual setup: the application switches session.serialize_handler to php with ini_set() before session_start() while session upload progress is on. BleepingComputer says it is exploitable only with an unusual combination of configuration and application code and reports no exploitation in the wild. Wiz lists no public exploit. These details come from relayed summaries, not from a full PHP advisory, which does not exist yet."
    as_of: 2026-11-09
    source_url: https://seclists.org/oss-sec/2026/q4/359
    confidence: reported
  - label: Related flaw, CISA KEV
    text: "CVE-2026-115560 is not in the Known Exploited Vulnerabilities catalog (catalog released 2026-11-09). Only the two flaws above are listed."
    as_of: 2026-11-09
    source_url: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
    confidence: vendor-stated

timeline:
  - { event: "PHP publishes security advisories for both flaws", date: 2026-10-21, source_url: "https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w", confidence: vendor-stated }
  - { event: "Fixed releases published (8.2.35, 8.3.36, 8.4.27, 8.5.12)", date: 2026-10-21, source_url: "https://www.bleepingcomputer.com/news/security/cisa-confirms-php2shell-vulnerabilities-now-exploited-in-attacks/", confidence: reported }
  - { event: "PHP publishes an informational advisory on a third flaw, CVE-2026-115560, with no fix yet", date: 2026-10-23, source_url: "https://www.php.net/archive/2026.php", confidence: vendor-stated }
  - { event: "The first two flaws are added to CISA's Known Exploited Vulnerabilities catalogue", date: 2026-10-26, source_url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", confidence: vendor-stated }

sources:
  - { title: "PHP security advisory GHSA-w8hw-w9fx-j79w (CVE-2026-109618)", url: https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w, accessed: 2026-11-09 }
  - { title: "PHP security advisory GHSA-6wmf-4rv5-p3rp (CVE-2026-109619)", url: https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp, accessed: 2026-11-09 }
  - { title: "CISA Known Exploited Vulnerabilities catalog", url: https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json, accessed: 2026-11-09 }
  - { title: "BleepingComputer: CISA confirms PHP2Shell vulnerabilities now exploited in attacks", url: https://www.bleepingcomputer.com/news/security/cisa-confirms-php2shell-vulnerabilities-now-exploited-in-attacks/, accessed: 2026-11-09 }
  - { title: "PHP news archive 2026: informational advisory on session upload progress (CVE-2026-115560)", url: https://www.php.net/archive/2026.php, accessed: 2026-11-09 }
  - { title: "oss-security: PHP informational advisory on session upload progress", url: https://seclists.org/oss-sec/2026/q4/359, accessed: 2026-11-09 }
  - { title: "AWS security bulletin 2026-143: PHP vulnerabilities", url: https://aws.amazon.com/security/security-bulletins/2026-143-aws/, accessed: 2026-11-09 }
  - { title: "Cloudflare: WAF protection for the PHP vulnerabilities", url: https://blog.cloudflare.com/php-vulnerabilities-waf-protection/, accessed: 2026-11-09 }
  - { title: "Cloudflare changelog: emergency WAF release, 22 October 2026", url: https://developers.cloudflare.com/changelog/post/2026-10-22-emergency-waf-release-cfmr/, accessed: 2026-11-09 }
  - { title: "Fastly: virtual patch for CVE-2026-109618 and CVE-2026-109619", url: https://www.fastly.com/documentation/reference/changes/2026/10/added-virtual-patch-for-CVE-2026-109618-and-CVE-2026-109619/, accessed: 2026-11-09 }
  - { title: "Broadcom: WAF rules for the PHP vulnerabilities (VMware Avi)", url: https://knowledge.broadcom.com/external/article/460068, accessed: 2026-11-09 }
---

Both flaws sit in the PHP runtime, not in any application built on it, which is why the exposure is so wide. PHP's advisories rate attack complexity as high; the conditions they describe include session upload progress, which the CVE-2026-109619 stopgap above turns off.

A third, related flaw, CVE-2026-115560, is handled differently on purpose. It is not in the CISA catalogue, no source reports it being exploited, and it needs an unusual configuration, so it does not set the tier above. It matters because there is no fix yet: the fixed releases listed on this page do not cover it, and the mitigation PHP suggests is turning off session upload progress.

PHP's advisories are more cautious than some write-ups about which ways of serving PHP are affected: FrankenPHP and LiteSpeed are described as likely but not demonstrated.
