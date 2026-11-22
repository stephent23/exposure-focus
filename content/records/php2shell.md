---
slug: php2shell
name: PHP2Shell
aliases: []
cves: [CVE-2026-109618, CVE-2026-109619]
related_cves: [CVE-2026-115560]
summary: "Two exploited flaws in the PHP runtime let an attacker run code from a web request with no login, so internet-facing PHP needs an out-of-cycle response."
attack: rce
status: published
published: 2026-11-09
evidence_as_of: 2026-11-22
review_until: 2026-11-23
leadership_quote: "Risk: an outsider can take over PHP web servers without logging in. Attacks: yes, it is being exploited. Action: Emergency for internet-facing PHP; internal PHP follows normal patching."
tier_reason: "Both flaws are in CISA's exploited list, need no login and give code execution on internet-facing PHP, which is the top of the rubric."
would_change:
  - "Internal-only PHP moves up if it becomes reachable or attackers are reported using the flaws inside networks"
  - "The third flaw, CVE-2026-115560, starts to count if exploitation or a public exploit is reported"
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
    vulnerable: "Not listed in PHP's advisories; end of life, no fix from PHP"
  - product: "CVE-2026-115560 (third flaw)"
    vulnerable: "Releases before 8.2.36, 8.3.37, 8.4.28 and 8.5.13"
    fixed: "8.4.28 (php.net); 8.2.36, 8.3.37 and 8.5.13 per press"
exposed_when:
  - PHP serves requests from the internet, as Apache mod_php or PHP-FPM
  - "CVE-2026-109618: the attacker can make request parsing hit a memory allocation failure (the memory_limit)"
  - "CVE-2026-109619: a fatal error interrupts serialize or unserialize, or session upload progress is on"
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
    why:
      - Not reachable from the internet.
      - Attacks are reported only on internet-facing PHP; no source shows the flaws used from inside a network.
    tier: 4
    action: Patch in your normal cycle. Move up if it becomes reachable from the internet.

mitigations:
  - title: "Update PHP and restart every worker"
    limitation: "Take the 19 Nov releases to fix CVE-2026-115560 too; 8.1 and older get no fix"
    role: fix
    official_guides:
      - https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w
      - https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp
    confidence: vendor-stated
  - title: "Set PHP memory_limit to -1 and cap request sizes"
    limitation: "Partial only; unlimited memory needs size limits at the frontend"
    role: stopgap
    official_guides: [https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w]
    confidence: vendor-stated
  - title: "Disable PHP session upload progress"
    limitation: "Partial for CVE-2026-109619; upload progress bars stop working"
    role: stopgap
    official_guides:
      - https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp
      - https://www.php.net/archive/2026.php
    confidence: vendor-stated
  - title: "Turn on your WAF vendor's PHP rules"
    limitation: "Known exploit patterns only; can block legitimate requests"
    role: stopgap
    official_guides:
      - https://aws.amazon.com/security/security-bulletins/2026-143-aws/
      - https://blog.cloudflare.com/php-vulnerabilities-waf-protection/
      - https://developers.cloudflare.com/changelog/post/2026-10-22-emergency-waf-release-cfmr/
      - https://www.fastly.com/documentation/reference/changes/2026/10/added-virtual-patch-for-CVE-2026-109618-and-CVE-2026-109619/
      - https://knowledge.broadcom.com/external/article/460068
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
  - label: Exploit obstacles
    text: "CrowdStrike (23 Oct, updated 28 Oct) says CVE-2026-109618 is triggered by a memory allocation failure while PHP parses request variables, and CVE-2026-109619 by a fatal error that interrupts serialize or unserialize, or by the session upload-progress lifecycle. Attackers must adapt the exploit to each PHP version and application; reliable use is feasible against fixed setups such as a known Docker image. At the time it had seen only probing and failed attempts, which CISA's KEV listing of 26 Oct later contradicted."
    as_of: 2026-11-22
    source_url: https://www.crowdstrike.com/en-us/blog/obstacles-to-weaponizing-php2shell-likely-constrain-exploitation/
    confidence: reported
  - label: Related flaw, fix
    text: "PHP's 8.4.28 changelog (19 Nov 2026) lists GHSA-658j-r8rw-q6mx, session serializer mismatch can lead to remote code execution, CVE-2026-115560, as fixed. The 8.2, 8.3 and 8.5 sections were not read."
    as_of: 2026-11-22
    source_url: https://www.php.net/ChangeLog-8.php
    confidence: vendor-stated
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
  - { event: "PHP fixes the third flaw, CVE-2026-115560 (8.4.28 and other lines)", date: 2026-11-19, source_url: "https://www.php.net/ChangeLog-8.php", confidence: vendor-stated }
changes:
  - { date: 2026-11-22, reason: "Added the conditions each flaw needs (CrowdStrike) and the 19 Nov fix for CVE-2026-115560; tiers unchanged.", source_url: "https://www.crowdstrike.com/en-us/blog/obstacles-to-weaponizing-php2shell-likely-constrain-exploitation/" }

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
  - { title: "CrowdStrike: Obstacles to weaponizing PHP2Shell likely constrain immediate widespread exploitation", url: https://www.crowdstrike.com/en-us/blog/obstacles-to-weaponizing-php2shell-likely-constrain-exploitation/, accessed: 2026-11-22 }
  - { title: "PHP 8 ChangeLog (8.4.28, 19 Nov 2026)", url: https://www.php.net/ChangeLog-8.php, accessed: 2026-11-22 }
---

Both flaws sit in the PHP runtime, not in any application built on it, which is why the exposure is so wide. They are not easy to use everywhere: CrowdStrike says each exploit has to be adapted to the PHP version and the application, and works most reliably against a known, fixed setup such as a standard container image. The tier still rests on CISA's listing of attacks.

A third flaw, CVE-2026-115560, needs an unusual setup and is not reported exploited, so it does not set the tier. PHP fixed it in the 19 Nov 2026 releases. The October releases that fix the first two flaws do not.

Restart Apache or PHP-FPM after updating so no old worker keeps running, and rebuild container images that bundle PHP. PHP 8.1 and older get no fix.

Stopgaps, from PHP's advisories: for CVE-2026-109618, set memory_limit=-1 administratively and keep post_max_size, input variables, multipart parts and uploads bounded, or block multipart requests at the frontend if unused; do not use RLIMIT_AS or RLIMIT_DATA. PHP calls this its primary, not complete, mitigation. For CVE-2026-109619 there is no complete configuration fix; session.upload_progress.enabled=0 removes the upload-progress paths and stops session-based progress bars.

WAF coverage: AWS, Cloudflare, Fastly and Broadcom (VMware Avi) publish rules, all as interim measures that miss traffic bypassing the WAF. AWS says no rule is a complete mitigation.
