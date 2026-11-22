---
slug: phpaftershell
name: phpAfterShell
aliases: [GHSA-fm2m-fjf5-v3cp]
cves: [CVE-2026-126714]
summary: "A PHP session flaw can, under narrow conditions, let an attacker plant objects in a session file; turning that into code execution needs more steps, and no attacks are reported."
attack: rce
status: published
published: 2026-11-22
evidence_as_of: 2026-11-22
review_until: 2026-12-20
leadership_quote: "Risk: a PHP flaw that sounds like PHP2Shell but needs several unusual conditions to use. Attacks: none reported. Action: normal patching; PHP fixed it on 19 Nov 2026."
tier_reason: "The worst case is code execution, but it needs an interrupted session write plus a usable chain in the application, and nothing shows it working, so it is Routine."
would_change:
  - "Moves up if a public exploit shows code execution on a common setup"
  - "Moves up if attacks are reported"
affected:
  - product: PHP 8.4
    vulnerable: Releases before 8.4.28
    fixed: 8.4.28
  - product: PHP 8.5
    vulnerable: "Releases before 8.5.13 (per The Hacker News)"
    fixed: "8.5.13 (per The Hacker News)"
  - product: PHP 8.3
    vulnerable: "Releases before 8.3.37 (per The Hacker News)"
    fixed: "8.3.37 (per The Hacker News)"
  - product: PHP 8.2
    vulnerable: "Releases before 8.2.36 (per The Hacker News)"
    fixed: "8.2.36 (per The Hacker News)"
  - product: PHP 8.1 and older
    vulnerable: "Affected per the researchers; end of life, no fix from PHP"
exposed_when:
  - "Sessions use PHP's default files handler (Redis or database stores are not affected)"
  - "Session upload progress is on, which was the default before the fix"
  - "A session write is cut off mid-way, for example a memory-limit failure in a threaded PHP build"
  - "Code execution also needs a usable object chain in the application or a second bug"
applies_check:
  - question: Do your PHP apps store sessions in files with upload progress on?
    how_to_check: "Run `php -i | grep -E 'session.save_handler|session.upload_progress.enabled'`. `files` and `On` mean the first two conditions hold. Distribution packages may carry the fix without a new version number."
placements:
  - name: Internet-facing PHP with file sessions and upload progress on
    facts: { reachable: true, no_login: true, impact: critical, rare_configuration: true }
    why:
      - No login needed, and the worst case is code execution.
      - Needs an interrupted session write and an object chain in the app.
      - No public code-execution exploit and no attacks reported.
    tier: 4
    action: Update PHP in your normal cycle and restart workers.
  - name: Sessions in Redis or a database, or upload progress off
    facts: { vendor_stated_exposure_condition: false }
    why:
      - Per PHP's maintainers, other session stores are outside this flaw.
    tier: 4
    action: No special action for this flaw.
mitigations:
  - title: Update PHP to the 19 Nov 2026 releases and restart
    limitation: "Upload progress is now off by default; apps that use it must re-enable it"
    role: fix
    official_guides: ["https://www.php.net/ChangeLog-8.php"]
    confidence: vendor-stated
  - title: Set session.upload_progress.enabled = 0
    limitation: "Upload progress bars that use PHP sessions stop working"
    role: stopgap
    official_guides: ["https://thehackernews.com/2026/11/phpaftershell-explained-how-hackers.html"]
    confidence: reported
evidence:
  - label: Vendor advisory
    text: "PHP's 8.4.28 changelog (19 Nov 2026) lists GHSA-fm2m-fjf5-v3cp, partially overwritten session files can lead to remote code execution, CVE-2026-126714, as fixed. The 8.2, 8.3 and 8.5 sections were not read; their fixed versions come from The Hacker News."
    as_of: 2026-11-22
    source_url: https://www.php.net/ChangeLog-8.php
    confidence: vendor-stated
  - label: How it works
    text: "Per The Hacker News (19 Nov), a session write cut off mid-way can leave a file that returns attacker-chosen objects on the next session_start(). The maintainers name one way to cut it off: a hard memory-limit failure in another thread of a threaded PHP build. Code execution then needs a gadget chain in the app; the researchers' own chain used a second, withheld bug."
    as_of: 2026-11-22
    source_url: https://thehackernews.com/2026/11/phpaftershell-explained-how-hackers.html
    confidence: reported
  - label: Exploit evidence
    text: "Neither PHP's maintainers nor the researchers (Depthfirst) report attacks. The public proof plants a harmless built-in object (stdClass); no public code-execution exploit is reported."
    as_of: 2026-11-22
    source_url: https://thehackernews.com/2026/11/phpaftershell-explained-how-hackers.html
    confidence: reported
timeline:
  - { event: "PHP releases fixes (8.4.28 and the other supported lines)", date: 2026-11-19, source_url: "https://www.php.net/ChangeLog-8.php", confidence: vendor-stated }
  - { event: "Flaw explained publicly as phpAfterShell", date: 2026-11-19, source_url: "https://thehackernews.com/2026/11/phpaftershell-explained-how-hackers.html", confidence: reported }
sources:
  - { title: "PHP 8 ChangeLog (8.4.28, 19 Nov 2026)", url: "https://www.php.net/ChangeLog-8.php", accessed: 2026-11-22 }
  - { title: "The Hacker News: phpAfterShell explained", url: "https://thehackernews.com/2026/11/phpaftershell-explained-how-hackers.html", accessed: 2026-11-22 }
---

phpAfterShell shares a name pattern with PHP2Shell, which is exploited and rated Emergency for internet-facing PHP, but the two are different flaws. This one needs several things to line up and has no known attacks. That is why it is Routine for every setup. It is also one of the 18 flaws in the PHP November 2026 security release verdict, which reaches the same call.

The Routine call treats the interrupted session write as an uncommon condition: the one route PHP's maintainers name needs a threaded PHP build, which most PHP-FPM and Apache setups do not use. If a simpler route to cut off the write is published, the call moves up.

No WAF or CDN rule for this flaw was found.
