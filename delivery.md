# Delivery log

## Current

- **Feature:** Phase 4a — Accounts & Auth Gate (`docs/specs/04a-accounts-auth/spec.md`)
- **Branch:** `feat/accounts-auth`
- **Status:** built and verified (check, lint, 41 unit tests, 28 e2e tests
  all pass; visually confirmed signed-in session bar + `/admin/accounts`).
  Not yet merged to `master`. **Real Google sign-in is still unverified**
  — the human's OAuth provider setup was in progress during build; e2e
  coverage uses real Supabase sessions via password-auth test users
  (Google can't be automated), so the actual "Sign in with Google" button
  needs a manual check once OAuth is configured.
- **Next action:** human finishes Google OAuth setup (Google Cloud client
  + Supabase provider config) and manually verifies real sign-in; human
  runs the first-admin bootstrap SQL (given at build time) to promote
  themselves; then merge `feat/accounts-auth` to `master`; then Phase 4b
  (push notifications).

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
- **Phase 3 — Messages** (2026-09-23). `/messages` recent-list with native
  `<audio>` playback, client-side fetch (see Decisions). Built on
  `feat/messages`, verified (check, lint, 30 unit + 15 e2e tests, visual
  check against the live site) and merged to `master` (fast-forward).
  Commit `d96cdff`.

## Decisions

- 2026-09-24: **Phases 4 and 5 merged** — accounts, notifications, and the
  login-required auth gate built together, not deferred. Forced by a hard
  dependency: `profiles.id` has a FK to `auth.users`, so real signups
  can't exist without real Supabase Auth already working, and
  approve/reject can't be meaningfully tested without the gate actually
  mattering. Confirmed with the human first (`CLAUDE.md`'s "unless I ask"
  exception to deferred auth).
- 2026-09-24: **Notification delivery is web push** — confirmed free
  (VAPID, no paid service), but iOS Safari only supports it from a Home
  Screen PWA, not a regular tab. `push_subscriptions` table (not a
  boolean) since a member can subscribe from multiple devices. Details in
  masterplan Decisions.
- 2026-09-24: **`profiles` uses a `SECURITY DEFINER` `is_admin()` helper**
  to avoid RLS self-recursion (a policy on `profiles` that queried
  `profiles` to check the caller's own role would recurse). A trigger on
  `auth.users` auto-creates each profile as `pending`/`member` — nothing
  in the app can mint an admin; the first one is a manual one-time SQL
  step the human runs.
- 2026-09-24: **e2e tests for the gated routes use real Supabase sessions,
  not mocks or the pure gating function alone.** Real Google sign-in can't
  be automated, but Supabase's email/password provider can — test users
  are created via the secret-key admin API and their session injected
  directly as a browser cookie in the exact format `@supabase/ssr` itself
  uses (`sb-<project-ref>-auth-token`, verified against a real signed-in
  session first). This also meant updating Phases 1–3's existing e2e
  suites, which ran unauthenticated before this phase gated everything.
- 2026-09-24: `$lib/supabase/client.ts` now uses `@supabase/ssr`'s
  `createBrowserClient` (was the plain `@supabase/supabase-js` client) —
  SSR needs server and browser to share one cookie-backed session.
  `/calendar`'s existing load function moved to `locals.supabase` (the
  per-request SSR client) since the browser client can't run server-side.
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

None currently.
