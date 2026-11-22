---
# Copy this file to content/records/<slug>.md and set "slug" to the file name (without .md).
# The front matter is checked by `npm test` and by the build. Leave placeholders such as
# "[link to add]" until you have the real value. Never invent a fact.
# Do not give hour or day counts anywhere in a record.

slug: template
name: Name of the vulnerability
aliases: []
cves: ["[CVE to confirm]"]
related_cves: # optional: related flaws the verdict mentions but does not rate (not in the headline, still searchable)
  - "[CVE to confirm]"
summary: One plain sentence. # at most 200 characters
attack: rce # rce, privilege-escalation, auth-bypass, data-exposure, data-tampering or dos
status: draft # draft is hidden from the home page; published is listed there
published: 2026-11-08 # UTC date this verdict was first published; never changes afterwards
evidence_as_of: 2026-11-08 # UTC date the evidence was last checked
review_until: 2026-12-08 # UTC date to recheck by; after it the record shows a stale badge

leadership_quote: Two or three sentences a boss can read. # at most 320 characters
tier_reason: One sentence saying why this tier and not a higher or lower one. # max 220 characters; answer "it is a 9.8, why Tier 3?"
would_change: # 1 to 3 items, max 140 characters each: what would move the call up or down
  - Moves up if a working exploit is published

# Affected versions, copied from a primary source (vendor advisory). Leave out fixed when no fix exists.
# Caps: product 60, vulnerable 80, fixed 80 characters.
affected:
  - { product: "[product to add]", vulnerable: "[versions to confirm]", fixed: "[fix to confirm]" }

# Optional. 1 to 4 configuration conditions that must hold, each at most 140 characters.
exposed_when:
  - "[configuration condition to add]"

# Caps: question 100 characters, how_to_check 240 characters.
applies_check:
  - question: Do you run the affected thing?
    how_to_check: "[steps to add]"

# Placements: the FIRST one is the headline, so put the most common case first.
# Caps: name 70 characters, action 140 characters.
# You set the facts and the tier. The build fails if the tier disagrees with the rubric,
# unless the placement has a public override_reason.
# Facts: reachable (true, false or "unknown"), exploited, public_exploit, no_login, requires_login,
# common_configuration, rare_configuration, vendor_stated_exposure_condition, credible_researcher_claim (only for a
# published demonstration: a write-up, talk or code; not a lab-only result, unreleased exploit or unnamed claim),
# exploitation_imminent (needs an "Exploitation outlook" evidence item), exploit_achieves (use when the
# attacks do less than the impact), chained_with (needs an "Exploit chain" evidence item), used_internally (attackers seen using it from inside a network;
# needs an "Internal use" evidence item; only this or a chain lifts a placement that is not reachable), and
# impact: the BUSINESS impact on this placement.
# requires_login or rare_configuration lowers the tier by one.
# impact: critical = control of the system, sensitive or regulated data, credentials, a production
#           database, or a lasting outage of something the business needs
#         significant = a foothold, moderately valuable data, or an essential service that recovers
#         limited = low-value information (metadata, version numbers) or a non-essential outage
# If you cannot tell, use critical.
placements:
  - name: Where this applies
    facts: { reachable: true, no_login: true, impact: critical, credible_researcher_claim: true }
    why: [One short line per fact that matters.]
    tier: 2
    action: What to do for this placement.

# Caps: title 60 characters, limitation 80. A mitigation is an action a leader can read at a glance, one short limit, a confidence label and a guide link.
mitigations:
  - title: "[action to add, e.g. Update PHP and restart every worker]"
    limitation: What it leaves open, only partly covers, or costs. # required: every option states its limit
    role: fix # fix (patch or upgrade) or stopgap (for when patching has to wait); the page leads with the fix
    official_guides: ["[link to add]"]
    confidence: inference # vendor-stated, reported or inference

evidence:
  - label: CVE record # e.g. CVE record, Vendor advisory, Exploit evidence, Runtime applicability
    text: What the source says.
    as_of: 2026-11-08
    source_url: "[link to add]"
    confidence: reported # vendor-stated, reported or inference

# Optional. Dated events, each with its own source. time is HH:MM in UTC and may be left out.
# timeline:
#   - { event: "Fix released", date: 2026-11-08, time: "16:00", source_url: "[link to add]", confidence: vendor-stated }

# Optional. The public change log, added to whenever the verdict changes. Never edit or delete old entries.
# A tier move names the placement (exactly as above) and both tiers; the latest move must match the current tier.
# Each entry also appears in the feed, so subscribers see the change.
# changes:
#   - { date: 2026-11-08, placement: "Internet-facing", from_tier: 2, to_tier: 1, reason: "CISA added it to KEV.", source_url: "[link to add]" }
#   - { date: 2026-11-08, reason: "Added a WAF mitigation.", source_url: "[link to add]" }

# Optional. An EPSS score of 0.5 or more can raise a call by one tier. It needs its own date and source.
# It does not apply with a login requirement or rare configuration, or when exploit_achieves is below impact.
# epss: { score: 0.12, as_of: 2026-11-08, source_url: "[link to add]" }

sources:
  - { title: "[source to add]", url: "[link to add]", accessed: 2026-11-08 }
---

Optional free-form analysis in markdown goes here, and is shown on the page.
