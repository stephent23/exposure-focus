---
slug: java4shell
name: Java4Shell
aliases: []
cves: [CVE-2026-114938]
summary: A flaw in Java's Base64 decoder lets an attacker with no login corrupt memory; the researchers who found it report code execution in tests. It needs Java 17.0.6+ on recent Intel or AMD server chips.
attack: rce
status: published
published: 2026-11-17
evidence_as_of: 2026-11-20
review_until: 2026-12-01
leadership_quote: "A flaw in Java itself could let an outsider take over applications built on Java without logging in. Scanners began probing for it on 18 Nov; no working attack is seen. Fixes are out. Update internet-facing Java on recent x86 servers sooner than usual."
tier_reason: "The probes seen are scanning, not working attacks, and code execution was shown only in controlled tests, so Prioritised, not Urgent."
would_change:
  - Moves to Emergency if a break-in is confirmed or a working exploit for an application is published
  - Moves to Urgent if working attack attempts are seen
affected:
  - product: Oracle Java SE 17
    vulnerable: "17.0.6 to 17.0.21.0.3 (start of range per the researchers)"
    fixed: "17.0.21.1"
  - product: Oracle Java SE 21
    vulnerable: "Up to 21.0.13.0.3"
    fixed: "21.0.13.1"
  - product: Oracle Java SE 25
    vulnerable: "Up to 25.0.5.0.3"
    fixed: "25.0.5.1"
  - product: Oracle Java SE 27
    vulnerable: "Up to 27.0.1.0.3"
    fixed: "27.0.1.1"
  - product: Oracle Java SE 8 perf build
    vulnerable: "8u511b33-perf"
    fixed: "8u513 (no fixed perf build named)"
  - product: Oracle GraalVM for JDK and GraalVM Enterprise
    vulnerable: "17.0.21.0.3, 21.0.13.0.3; Enterprise 21.3.20.0.3"
  - product: Other OpenJDK builds (Temurin, Corretto and others)
    vulnerable: "17.0.6 and later, 21, 25, 27; Amazon, Microsoft, Azul fixes out (reported)"
exposed_when:
  - "An affected Java runs on x86-64 with AVX-512 VBMI (Xeon Ice Lake or newer, AMD Zen 4 or newer)"
  - "Attacker text reaches `java.util.Base64` decoding, for example a Basic auth header"
  - The JIT compiler has already switched the decoder to its fast path
applies_check:
  - question: Do you run Java 17.0.6 or later, 21, 25 or 27?
    how_to_check: "Run `jcmd <pid> VM.version` on running JVMs, or check `java -version` and the Java runtimes bundled inside Java applications such as Jira, Jenkins and Keycloak."
  - question: Do those JVMs run on x86 servers with AVX-512 VBMI?
    how_to_check: "On Linux, `grep -m1 '^flags' /proc/cpuinfo` must show `avx512f`, `avx512bw`, `avx512vbmi` and `bmi2`. ARM64 hosts (for example AWS Graviton) are not affected."
  - question: Is the application reachable from the internet?
    how_to_check: "List internet-facing Java services, including login pages, SSO servers, CI servers and APIs that accept Basic auth, tokens or file uploads."
placements:
  - name: Internet-facing Java app, affected JDK, x86 with AVX-512 VBMI
    facts: { reachable: true, no_login: true, impact: critical, exploitation_imminent: true, exploit_achieves: significant }
    why:
      - Reachable, and the researchers report no login needed in several common Java applications.
      - Probes since 18 Nov are scanning, not working attacks.
    tier: 3
    action: Update Java and restart sooner than your normal cycle; until then, start the JVM with `-XX:-UseBASE64Intrinsics`.
    override_reason: "Editorial judgement: the rubric reads scanning as Urgent, but these probes would not work and public code only crashes the JVM."
  - name: Java client that connects to untrusted TLS servers
    facts: { reachable: true, no_login: true, impact: critical }
    why:
      - A client-side exploit is claimed but not published, so it does not raise the call.
    tier: 3
    action: Update Java sooner than your normal cycle.
  - name: Internal-only Java services
    facts: { reachable: false, no_login: true, impact: critical }
    why:
      - Not reachable from the internet.
    tier: 4
    action: Patch in your normal cycle. Move up if it becomes reachable from the internet.
  - name: ARM64, or x86 without AVX-512 VBMI
    facts: { reachable: true, no_login: true, impact: critical }
    why:
      - The researchers who found it and an independent analysis say the flawed code only runs on x86-64 with AVX-512 VBMI.
    tier: 4
    action: No special action. Routine patching.
    override_reason: "Editorial judgement: the finder and an independent analysis say the flawed code never runs without AVX-512 VBMI; Oracle does not state the hardware condition."
  - name: Java 8 (standard builds) and Java 11
    facts: { vendor_stated_exposure_condition: false }
    why:
      - Oracle does not list them as affected, and the researchers say the affected range starts at 17.0.6.
    tier: 4
    action: No special action. Routine patching.
mitigations:
  - title: Update Java to the 17 Nov 2026 builds and restart
    limitation: "Other OpenJDK builds were not out on 17 Nov; bundled runtimes need app updates"
    role: fix
    official_guides: [https://www.oracle.com/security-alerts/cspunov2026.html]
    confidence: vendor-stated
  - title: Start the JVM with -XX:-UseBASE64Intrinsics
    limitation: "Needs a restart and slows Base64 decoding; not confirmed by Oracle"
    role: stopgap
    official_guides: [https://www.upwind.io/blog/java4shell-what-we-know-now-and-what-comes-next]
    confidence: reported
  - title: Start the JVM with -XX:UseAVX=2 (x86 only)
    limitation: "Stops the JVM starting on ARM; slows other AVX-512 code"
    role: stopgap
    official_guides: [https://equixly.com/blog/2026/11/17/cve-2026-114938-pre-auth-heap-overflow-in-java-17-21-and-25/]
    confidence: reported
  - title: Switch Cloudflare's Java4Shell WAF rules to block
    limitation: "Log-only by default, paid plans only; known patterns, not traffic around the WAF"
    role: stopgap
    official_guides: [https://developers.cloudflare.com/waf/change-log/, https://radar.cloudflare.com/zero-wire/java4shell]
    confidence: vendor-stated
evidence:
  - label: Vendor advisory
    text: "Oracle's November 2026 Critical Security Patch Update (Rev 1, 17 Nov) lists CVE-2026-114938 in the Java SE Compiler component: remotely exploitable without authentication, CVSS 3.1 base 8.1 (attack complexity high). Affected: Java SE 8u511b33-perf, 17.0.21.0.3, 21.0.13.0.3, 25.0.5.0.3, 27.0.1.0.3; GraalVM for JDK 17.0.21.0.3, 21.0.13.0.3; GraalVM Enterprise 21.3.20.0.3. Credit: Quang Luong of Calif.io. Oracle does not name Base64 or AVX-512."
    as_of: 2026-11-17
    source_url: https://www.oracle.com/security-alerts/cspunov2026.html
    confidence: vendor-stated
  - label: Fixed releases
    text: "Oracle release notes dated 17 Nov 2026: 17.0.21.1+4, 21.0.13.1+4, 25.0.5.1+4, 27.0.1.1+4, 11.0.33.1+4 and 1.8.0_513-b04. The notes point to the patch update but do not name this CVE, so the fixed build per train is read from the advisory's affected list."
    as_of: 2026-11-17
    source_url: https://www.oracle.com/java/technologies/javase/17-0-21-1-relnotes.html
    confidence: vendor-stated
  - label: Researcher demonstration
    text: "The write-up by Calif, the security firm that found the flaw (17 Nov), says malformed Base64 such as 64 'A' characters and '=' makes the AVX-512 decoder write 62 bytes past its output buffer; Calif turned this into a heap leak and code execution. It reports pre-auth code execution in default Keycloak, Jira, Confluence, Artifactory, Jenkins and PingFederate, with a demo video, and post-auth in Kafka, Solr, Elasticsearch, Gerrit and Spinnaker. Product exploits are withheld. Calif says each product needs its own profile, the attack is sensitive to network latency and jitter, and it rented a VM in the target's region."
    as_of: 2026-11-17
    source_url: https://calif.io/java4shell/
    confidence: reported
  - label: Public exploit code
    text: "Calif published a trigger that only shows the 62-byte write inside a test array; it is not an attack. Calif says each product needs its own exploit and that the attack is sensitive to network timing. No public product exploit is reported."
    as_of: 2026-11-17
    source_url: https://calif.io/java4shell/
    confidence: reported
  - label: Exploitation status
    text: "watchTowr's FAQ (updated 17 Nov) reports no exploitation in the wild and no CISA KEV listing. On 18 Nov The Hacker News reported no evidence of exploitation, and Cloudflare's Zero Wire update said it saw no signs of exploits on its own network. Blackpoint Cyber, quoted by The Hacker News, crashed a JVM with about 28,000 malformed unauthenticated requests: a crash, not code execution."
    as_of: 2026-11-19
    source_url: https://radar.cloudflare.com/zero-wire/java4shell
    confidence: reported
  - label: Government alert
    text: "The Hacker News (18 Nov) quotes a CISA alert dated 17 Nov saying crafted Base64 input could crash the JVM and allow unauthenticated code execution, and urging organisations to find affected Java and patch. The quoted text does not mention a KEV listing. The CISA page itself did not load."
    as_of: 2026-11-19
    source_url: https://thehackernews.com/2026/11/cisa-urges-immediate-patching-of.html
    confidence: reported
  - label: WAF rules
    text: "Cloudflare's WAF Emergency Release of 18 Nov adds six Managed Ruleset detections for malformed Base64 in headers, query values, bodies, path segments, JWT parts and WebAuthn values. Zero Wire says they default to Log, are on paid plans, and are a compensating control, not a fix."
    as_of: 2026-11-19
    source_url: https://developers.cloudflare.com/waf/change-log/
    confidence: vendor-stated
  - label: Exploitation outlook
    text: "SecurityWeek (19 Nov) reports attackers probing for the flaw: GreyNoise saw over 150 attack-shaped requests from five IPs with no successful intrusion; watchTowr sees recon scans and blind attempts it calls not yet functional; Cloudflare and Previdian logged attempts on 18 and 19 Nov. VulnCheck offers a full exploit to its customers only. No compromise or KEV listing is reported. The primary posts were not opened."
    as_of: 2026-11-20
    source_url: https://www.securityweek.com/java4shell-exploitation-attempts-begin-as-vendors-rush-out-advisories/
    confidence: reported
  - label: Independent analysis
    text: "Equixly and Upwind independently describe an AVX-512 VBMI Base64 tail bug writing 62 or 63 bytes out of bounds, reached through Basic auth in Spring Security, Tomcat and Jetty; ARM and Java 8 and 11 are not affected. Both called code execution unproven before Calif's write-up."
    as_of: 2026-11-17
    source_url: https://equixly.com/blog/2026/11/17/cve-2026-114938-pre-auth-heap-overflow-in-java-17-21-and-25/
    confidence: reported
timeline:
  - { event: "The researchers who found it say details leaked before the patch", date: 2026-11-17, source_url: "https://securityonline.info/java4shell-cve-2026-114938/", confidence: reported }
  - { event: "Oracle publishes its November patch update and fixed Java builds", date: 2026-11-17, source_url: "https://www.oracle.com/security-alerts/cspunov2026.html", confidence: vendor-stated }
  - { event: "The researchers publish their write-up and demonstration", date: 2026-11-17, source_url: "https://calif.io/java4shell/", confidence: reported }
  - { event: "Attack-shaped requests first reported by Cloudflare and Previdian", date: 2026-11-18, source_url: "https://www.securityweek.com/java4shell-exploitation-attempts-begin-as-vendors-rush-out-advisories/", confidence: reported }
  - { event: "Cloudflare releases WAF detections for Java4Shell", date: 2026-11-18, source_url: "https://developers.cloudflare.com/waf/change-log/", confidence: vendor-stated }
changes:
  - { date: 2026-11-19, reason: "Added Cloudflare's new WAF rules as a stopgap and noted CISA's alert; still no attacks reported, so no tier changes.", source_url: "https://developers.cloudflare.com/waf/change-log/" }
were_you_hit:
  assume_compromise_when: "An internet-facing affected JVM on AVX-512 x86 shows unexplained crashes or restarts, or a Java application the researchers named shows unexpected admin changes."
  check:
    - "hs_err_pid*.log crash files and unexpected JVM or worker restarts"
    - "Logs for `IllegalArgumentException: Input byte array has wrong 4-byte ending unit` from Base64 decoding"
    - "Authorization headers with long Base64 tokens ending in `=` whose length is not a multiple of 4"
  rotate:
    - Secrets held in memory by exposed JVMs (keys, tokens, session secrets), if crashes or odd requests are found
sources:
  - { title: "Oracle Critical Security Patch Update Advisory, November 2026", url: "https://www.oracle.com/security-alerts/cspunov2026.html", accessed: 2026-11-17 }
  - { title: "Oracle JDK 17.0.21.1 release notes", url: "https://www.oracle.com/java/technologies/javase/17-0-21-1-relnotes.html", accessed: 2026-11-17 }
  - { title: "Oracle JDK 21.0.13.1 release notes", url: "https://www.oracle.com/java/technologies/javase/21-0-13-1-relnotes.html", accessed: 2026-11-17 }
  - { title: "Oracle JDK 25.0.5.1 release notes", url: "https://www.oracle.com/java/technologies/javase/25-0-5-1-relnotes.html", accessed: 2026-11-17 }
  - { title: "Oracle JDK 27.0.1.1 release notes", url: "https://www.oracle.com/java/technologies/javase/27-0-1-1-relnotes.html", accessed: 2026-11-17 }
  - { title: "Oracle JDK 8u513 release notes", url: "https://www.oracle.com/java/technologies/javase/8u513-relnotes.html", accessed: 2026-11-17 }
  - { title: "Calif: Java4Shell, write once, RCE everywhere", url: "https://calif.io/java4shell/", accessed: 2026-11-17 }
  - { title: "watchTowr: Java CVE-2026-114938 FAQ", url: "https://watchtowr.com/intelligence/java4shell-cve-2026-114938-faq/", accessed: 2026-11-17 }
  - { title: "Equixly: CVE-2026-114938 pre-auth heap overflow in Java 17, 21 and 25", url: "https://equixly.com/blog/2026/11/17/cve-2026-114938-pre-auth-heap-overflow-in-java-17-21-and-25/", accessed: 2026-11-17 }
  - { title: "Upwind: Java4Shell analysis", url: "https://www.upwind.io/blog/java4shell-what-we-know-now-and-what-comes-next", accessed: 2026-11-17 }
  - { title: "Cloudflare Zero Wire: Java4Shell", url: "https://radar.cloudflare.com/zero-wire/java4shell", accessed: 2026-11-19 }
  - { title: "SecurityOnline: Java4Shell (CVE-2026-114938)", url: "https://securityonline.info/java4shell-cve-2026-114938/", accessed: 2026-11-17 }
  - { title: "Cloudflare WAF changelog", url: "https://developers.cloudflare.com/waf/change-log/", accessed: 2026-11-19 }
  - { title: "The Hacker News: CISA urges immediate patching of Java4Shell flaw", url: "https://thehackernews.com/2026/11/cisa-urges-immediate-patching-of.html", accessed: 2026-11-19 }
  - { title: "SecurityWeek: Java4Shell exploitation attempts begin as vendors rush out advisories", url: "https://www.securityweek.com/java4shell-exploitation-attempts-begin-as-vendors-rush-out-advisories/", accessed: 2026-11-20 }
---

Oracle's advisory confirms the flaw, its credit to the researchers who found it (at the security firm Calif) and the fixed builds, but not the mechanism: it names the Compiler component and gives no hardware condition. The Base64, AVX-512 and product details come from the researchers' write-up and two independent analyses, so they are marked reported.

Why Prioritised and not Urgent: since 18 Nov scanners have sent attack-shaped requests, which the rubric would treat as exploitation about to start. This verdict is calmer on purpose: the requests are recon and blind attempts that watchTowr calls not functional, no break-in is reported, and the only public code crashes the JVM rather than running code. A working attack needs many things to line up. The JVM must be an affected build on x86 with AVX-512 VBMI; the application must pass attacker text to the basic or URL Base64 decoder; the decoder must already be JIT-compiled; the input must have a specific length ending in `=`; and turning the fixed-byte overwrite into code execution needs a heap layout tuned to each product, retries that can crash the JVM, partial request bodies that a buffering proxy such as nginx removes, and low, stable network latency (Calif rented a VM in the same region as its target). Calif's demonstrations were on its own targets under those controlled conditions and its product exploits are withheld, so under the published-claims rule they are recorded but do not raise the call. CVSS (Oracle 8.1 under 3.1, with attack complexity high; 9.2 under 4.0 in early reports) is for reference only.

Upwind warns that a widely shared alternative, `-XX:DisableIntrinsic=_base64_decodeBlock`, does not work as written and can stop the JVM from starting if pushed through `JAVA_TOOL_OPTIONS`. Catching the decoder's exception does not help, because the write happens first. Cloudflare added six WAF detections on 18 Nov that log by default; set them to block. Calif notes that a proxy which buffers whole request bodies breaks some of its attack timings, but not all, so it is not a mitigation. Oracle's fixed builds are out; Amazon, Microsoft and Azul have since released fixed OpenJDK builds (reported); for other distributions, use the JVM flag until your vendor's build arrives.
