# Exposure Focus

A free, static site of independent vulnerability verdicts for security leaders. Each verdict gives, for each placement (for example "internet-facing" or "internal only"), one of four tiers and the reasons for it. Tiers come from a published rubric (`src/rubric/triage.ts`, explained at `/rubric/`), not from CVSS alone. Every fact has a source link and an as-of date.

No tracking: no ads, analytics, cookies or third-party scripts. Fonts are self-hosted.

## Run it

Requires Node 22.23.4 or newer.

```
npm ci              # install exactly what package-lock.json says
npm run dev         # local dev server
npm run build       # static site into dist/
npm test            # unit tests; a global setup builds the site, and the tests check the built pages
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test:a11y   # Playwright and axe against the built site (run after npm run build)
```

## Project layout

| Path | Contents |
| --- | --- |
| `src/pages/` | Routes: home, `verdicts/[slug]`, `rubric`, `corrections`, `about`, `feed.xml` (Atom), 404 |
| `src/components/` | Shared components; `verdict/` holds the parts of a verdict page |
| `src/layouts/` | Base page layout |
| `src/styles/` | CSS, including `verdict/` for verdict-page styles and self-hosted font faces |
| `src/lib/` | Loading and building: records, verdict view, home, feed, filters, markdown |
| `src/schema/` | `record.ts`, the Zod schema every record must pass |
| `src/rubric/` | `triage.ts`, the tier rubric, and its tests |
| `src/scripts/` | Small client-side scripts (filters, copy button) |
| `content/records/` | One markdown file per vulnerability (the verdicts) |
| `content/template.md` | The starting point for a new record |
| `content/corrections.md` | Dated corrections shown on `/corrections/` |
| `public/` | Static files: `_headers` (security headers) and `fonts/` |
| `tests/` | Built-site checks, content and font checks, and `a11y/` Playwright tests |

## Add a verdict

1. Copy `content/template.md` to `content/records/<slug>.md`. The `slug` field must equal the file name.
2. Fill in the fields. Comments in the template explain each one.
3. Keep `status: draft` until it is ready, then set `status: published`. Only published records appear on the home page. Every record gets a page at `/verdicts/<slug>/`.
4. Put the most common placement first. Its tier is the headline.
5. Leave placeholders such as `[link to add]` and `[CVE to confirm]` until you have the real value.
6. Run `npm test`. Errors name the file and the field that is wrong.

## Trust rules

These are enforced by tests, not by convention:

- The tier matches the rubric, or the placement carries a public `override_reason`.
- A researcher's or vendor's claim raises a tier only when the demonstration is published (a write-up, talk or code showing the outcome). Lab-only results, unreleased exploits and unnamed "has been demonstrated" statements are reported in the evidence but do not count.
- CVSS never sets a tier. EPSS can raise a call by one tier, and only with its own date and source.
- No hour or day counts in records or on built pages.
- Links are real https sources or explicit placeholders. Every published record cites its sources.
- Every fact has a source and an as-of date. Every mitigation says which ways in it closes, leaves open or weakens, what it costs or might break, and carries a confidence label (`vendor-stated`, `reported` or `inference`).
- Placeholders stay until the owner fills them in. Never invent a fact.
- Built pages make no third-party requests, every internal link resolves, and there is no inline script or style. The strict Content-Security-Policy is in `public/_headers`.

## Deploy (Cloudflare Workers static assets)

The site is built into `dist/` and served using `wrangler.jsonc`. It needs no secrets.

1. In Cloudflare **Workers & Pages**, create an application from this GitHub repository, with the Cloudflare GitHub app limited to this repository. Production branch: `main`.
2. Build command: `npm run build`. Deploy command: `npx wrangler deploy`. Non-production branch deploy command: `npx wrangler versions upload`. The Worker name must equal `name` in `wrangler.jsonc`.
3. Add the custom domain, then set `site` in `astro.config.mjs` to the real site URL. It is currently the placeholder `https://example.com`. The Atom feed and links in the leadership summaries use it.
4. In GitHub, protect `main`: require a pull request and the `test` and `a11y` checks from `.github/workflows/ci.yml`.

After the first deploy, check that a verdict page loads, that an unknown path returns the 404 page, and that the `Content-Security-Policy` header is present.

## Licence

Fonts: IBM Plex, SIL Open Font License. See `public/fonts/LICENSE.txt`.
