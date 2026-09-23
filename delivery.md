# Delivery log

## Current

- **Feature:** Phase 3 — Messages (`docs/specs/03-messages/spec.md`)
- **Branch:** `feat/messages`
- **Status:** built and verified (check, lint, 30 unit tests, 15 e2e tests
  all pass; visually confirmed against the live site — real message titles
  rendered). Not yet merged to `master`.
- **Next action:** merge `feat/messages` to `master`, then spec Phase 4
  (Accounts & notifications data model).

## Done

- **Phase 0 — Scaffold** (2026-09-22). SvelteKit + Svelte 5, strict TS, Tailwind v4,
  shadcn-svelte (hand-authored `components.json`; CLI requires an interactive
  preset), Vitest, Playwright, Netlify adapter, SBF brand theme. Commit `362d3a4`.
- **Phase 1 — Website view** (2026-09-23). `/website` route iframing sbf.church,
  linked from `/`. Built on `feat/website-view`, re-verified independently
  (check, lint, unit + e2e all pass) and merged to `master` (fast-forward,
  no PR — no GitHub remote configured yet). Commit `5444f3f`.
- **Phase 2 — Calendar** (2026-09-23). `events` table + RLS, `/admin/events`
  text-file upload, `/calendar` monthly grid. Built on `feat/calendar`,
  verified (check, lint, 23 unit + 11 e2e tests, visual check at 375px —
  caught and fixed a grid overflow bug) and merged to `master`
  (fast-forward). Commit `6fa4e0d`.

## Decisions

- 2026-09-23: **Messages fetch runs client-side, not server-side.**
  Confirmed repeatedly (not a fluke) that sbf.church's Cloudflare bot
  management blocks Node's `fetch()` and even a genuine headless-browser
  request regardless of a matching User-Agent — TLS/fingerprint-level
  detection, not a header check, so the originally-spec'd server-side
  fetch would never have worked in production either (Netlify's servers
  are Node too). sbf.church sends `Access-Control-Allow-Origin: *`,
  explicitly permitting cross-origin browser reads, so the fetch runs in
  the visitor's own browser (`+page.ts` with `ssr = false`) instead —
  verified end-to-end against the live site, real titles rendered.
  Bonus: this also made e2e tests properly mockable via `page.route()`,
  which server-side fetches never were (see Phase 2's note below) — no
  live-site or Cloudflare dependency in the test suite for this feature.
- 2026-09-23: Messages are scraped (not iframed, not admin-entered) from
  sbf.church/messages' structured `data-*` row attributes — direct MP3
  URLs, no feed exists. Accepted risk: fragile to a site redesign, with no
  admin fallback if it breaks (unlike Calendar).
- 2026-09-23: **Calendar is app-owned data, not pulled from sbf.church.**
  Their "Upcoming Events" page has free-text dates and no feed — not
  machine-parseable. Instead: an `events` table (Supabase), an
  unauthenticated `/admin/events` text-file upload (pipe-delimited,
  `YYYY-MM-DD[ to YYYY-MM-DD] | Title | Description`, all-or-nothing
  validation, appends rather than replaces), and a real `/calendar` monthly
  grid. RLS: public read, no client write — the upload route writes via the
  server-only secret-key client. Migration `20260923000000_create_events.sql`,
  applied by the human via the Supabase SQL editor (no CLI/DB credentials
  available to apply it directly) and confirmed live (RLS read/write
  behavior checked both ways before building on top of it).
- 2026-09-23: Supabase wired up for the first time (pulled forward from
  Phase 4, since Calendar needs app-owned data now). This project's
  Supabase uses the newer key format (`sb_publishable_...` /
  `sb_secret_...`) — env vars named `PUBLIC_SUPABASE_PUBLISHABLE_KEY` /
  `SUPABASE_SECRET_KEY` accordingly, not the legacy `ANON_KEY`/
  `SERVICE_ROLE_KEY` names.
- 2026-09-23: **e2e tests for `/calendar` and `/admin/events` touch the real
  Supabase project, with seed/cleanup, rather than mocking.**
  `page.route()` can't intercept these — both routes call Supabase
  server-side (SSR load / form action), which Playwright's browser-level
  interception never sees. First attempt at mocking silently failed this
  way and one test run wrote a real row to the live table before this was
  caught; it was deleted immediately. Fixed by having the tests seed
  known rows via the secret key before asserting, and delete them
  afterward (`src/routes/supabaseTestHelper.ts`) — genuinely tests the
  real system instead of a mock that couldn't work here. Trade-off worth
  knowing: e2e runs need a real, reachable Supabase project with valid
  `.env` credentials; there's no isolated test database.
- 2026-09-23: Fixed a real mobile-width bug found by screenshot check: the
  day grid overflowed horizontally at 375px because flex/grid items don't
  shrink below their content size by default — event-title ellipsis
  truncation silently did nothing until `min-width: 0` was added.
- 2026-09-23: Website view is its own `/website` route, linked from `/`.
- 2026-09-23: Loading message sits behind the iframe instead of using a `load` handler, which can miss a load that fires before hydration.
- 2026-09-23: Website view embeds sbf.church via iframe (framing verified), with a
  permanent "Open in browser" link-out as fallback.
- 2026-09-23: Confirmed live (not just in theory) that sbf.church's Cloudflare
  bot-challenge blocks the iframe via `X-Frame-Options: SAMEORIGIN` on the
  challenge page — hit this on the very first real browser check, so it's a
  real, not rare, failure mode. Decided to accept it as-is per the spec's
  existing scope (no frame-failure detection); the always-visible "Open in
  browser" link is the intended escape hatch, not a fallback triggered by
  detecting failure.
- 2026-09-23: No GitHub remote yet — staying local (`git init`, commits on
  `master`, no push/PR) until asked to set one up.

## Open questions

- Notification delivery mechanism (masterplan) — needed before Phase 4/5 notifications.
