# Delivery log

## Current

- **Feature:** Phase 6 — Admin functions (`docs/specs/06-admin/spec.md`,
  from the human's `phase2.md`)
- **Branch:** `feat/admin-phase2`
- **Status:** built and verified locally (check, lint, 72 unit + 51 e2e
  tests pass; screenshots checked). Committed, not merged or pushed.
- **Next action:** (1) the human applies
  `supabase/migrations/20260926000000_add_join_notified_at.sql` in the
  Supabase SQL editor — it must be applied **before** the deploy so the
  join alert can record that it fired; (2) merge to `main` and the human
  pushes (the harness blocks Claude from pushing to `main`); (3) after
  deploy, confirm the join alert once by hand with a real new sign-in.

## Done

- **Group admin events by day** (2026-09-27). `/admin/events`'s Upcoming/Past
  lists now show a day heading (e.g. "SUNDAY, SEP 27, 2026") above each
  date's events, chronological by time within the day
  (`groupEventsByDay` in calendar.ts, reusing the same time-sort as the
  calendar grid). The row itself only adds what the heading doesn't say —
  the end date for a multi-day event, and the time. Shown to the human as
  a mockup with reorder arrows (an earlier option that wasn't chosen);
  confirmed grouping only, no arrows.

- **Event start time + editing** (2026-09-27, `docs/specs/02-calendar/spec.md`
  revision). `events.start_time` (nullable Postgres `time`, migration
  applied by the human). Upload format gains a `HH:MM` field (24-hour, or
  blank for no fixed time) between date and title. Same-day events sort
  chronologically by time (untimed ones after, in upload order) via a
  per-cell sort in `getMonthGrid`. The monthly grid still shows only
  titles; the day-detail view prefixes the time in 12-hour AM/PM
  (`formatTime12h`). `/admin/events` gets an Edit button (before Delete)
  opening an inline form for every field, validated the same way as
  upload. Two real bugs found and fixed while writing e2e coverage (not
  app bugs): Postgres's bulk insert requires every row in one call to
  share identical keys, and a Playwright locator that filters by title
  text goes stale once that text moves into an `<input>` in edit mode —
  fixed by locating the editing row via `form.edit-form` instead.

- **Blank session bar on /website** (2026-09-27). The name/Sign out are
  gone from the top of the Website page, but the bar keeps its height
  (visibility: hidden, not removed/display:none) so the Home / Open in
  browser row doesn't shift up into the zone iOS blurs during the
  pull-down bounce.

- **Admin button on the Accounts/Events/Notifications header nav** (2026-09-27).
  `AdminNav` now shows Home, Admin (back to the /admin menu), then the
  other two admin sections.

- **Admin card on Home + purple header on all admin screens** (2026-09-27).
  Home gets an admin-only "Admin" card (Shield icon) linking to /admin,
  placed above the existing Send Notification card — same admin-only
  pattern (not merely hidden, not in the page at all for a non-admin).
  The admin menu, Accounts, Events and Notifications now render
  `AppHeader` (added to +layout.svelte's `ownsHeader`), matching
  Home/Calendar/Messages, instead of the plain grey session bar. Their
  own in-page nav (Home + the other two admin links) is unchanged below it.

- **Outline buttons now visible on the cream page** (2026-09-27). The
  outline Button variant (Home, admin nav, Prev/Next, Delete, Browse,
  "Full archive", "Open in browser") had a border nearly the same colour
  as the page background. Picked from 4 mockup options ("D — Lavender
  wash"): a faint tint of --primary as the fill plus a darker
  --primary/--border mix as the border, both defined once as
  color-mix() custom properties in layout.css so they re-resolve
  correctly under .dark too. Dropped the old dark:-specific overrides on
  this variant since the new tokens already adapt per theme.

- **Delete events + Browse button** (2026-09-27). `/admin/events` now lists
  upcoming events (soonest first) and past ones (collapsed), each with a
  two-step Delete (shared `ConfirmDelete` component, also used by Accounts).
  The native file input's "Browse…" is now a real button; Upload is disabled
  until a file is chosen. The upload action was renamed `upload` (SvelteKit
  can't mix a default action with named ones). e2e sign-ins are now cached
  per test user — the suite had grown past Supabase Auth's sign-in rate
  limit and started failing intermittently.

- **Shared app header on Calendar and Messages** (2026-09-26). The purple
  band (plus the blank strip above it for iOS's status-bar blur) is now an
  `AppHeader` component used by Home, Calendar and Messages. The layout's
  plain grey session bar is skipped on those three routes and still shown
  on every other page (Website, admin screens, etc.).

- **Home page refresh + header polish** (2026-09-26). "Cards" redesign,
  logo, then header tweaks: name + Sign out moved into the purple band,
  band pushed down with a plain strip above it (and a floor of
  `env(safe-area-inset-top)`) so iOS's status-bar blur in the installed
  PWA doesn't smear the band. Live on `main`.

- **Phase 4b — Push Notifications** (2026-09-24). `push_subscriptions` +
  `notifications` tables, web push (VAPID), service worker, PWA manifest,
  `/admin/notifications`. Built on `feat/push-notifications`, verified
  (check, lint, 55 unit + 36 e2e tests) and the human confirmed a real
  subscribe + a real received notification before merge to `master`
  (fast-forward). Commit `781c8b2`.
- **Phase 5 — Deploy** (2026-09-26). Pushed to GitHub
  (`github.com/jrmcanada/sbfapp`, branch renamed `master`→`main`),
  deployed on Netlify (`sbfapp.netlify.app`) with all 5 env vars (the two
  secret keys flagged "Contains secret values"). Google OAuth + Supabase
  redirect config updated for the production URL. Real Google sign-in,
  the auth gate, and PWA assets all confirmed working in production. Two
  real church members have since signed up and been approved
  (Nathanael Martin, Silvanus Santhosh) — **the app is in real use now**,
  not just test data.

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
- **Phase 4a — Accounts & Auth Gate** (2026-09-24). Real Google sign-in,
  admin approval, login-required gate on every route. Built on
  `feat/accounts-auth`, verified (check, lint, 41 unit + 28 e2e tests) and
  the human confirmed real Google sign-in + first-admin bootstrap worked
  before merge to `master` (fast-forward). Commit `3ac3f8c`.

## Decisions

- 2026-09-26: **Phase 6 (admin functions) scope, confirmed with the human.**
  `phase2.md` item 9 (grey out Calendar/Notifications for pending users)
  was **dropped** — it would have meant letting pending users into Home,
  changing the 4a gate; they keep the "Awaiting approval" page. No Admin
  card on Home (only the admin-only Send Notification card); `/admin` is
  reached by URL. New column `profiles.join_notified_at` (approved) makes
  the "someone asked to join" push fire exactly once per sign-up (atomic
  claim in `/auth/callback`; failures never block sign-in; not recorded in
  notification history since `notifications.created_by` requires a
  sender). Deleting an admin who approved accounts or sent notifications
  is **refused with a message** rather than changing the `ON DELETE
RESTRICT` audit-trail FKs. Emails are read from Supabase Auth with the
  secret key, not copied into `profiles`. Every secret-key admin
  load/action also calls `requireAdmin` on top of the route gate.
  Testing kept to the notification lesson below: e2e seeds history rows
  and fake subscriptions directly and never submits the compose form.

- 2026-09-26: **The app is in real use — testing conventions need to
  account for that from now on, not just "shared DB, seed/cleanup."** A
  routine e2e run of the `/admin/notifications` compose-form test sent a
  real "E2E Test Notification" push to the human's own real subscribed
  devices, because real `push_subscriptions` now exist (from real use)
  and the test actually submitted the form — no mock exists or can exist
  for the real send path (same server-side-only limitation as other
  Supabase calls). The DB row got cleaned up automatically by the test's
  own teardown, but the push itself already fired and can't be recalled.
  Fixed by removing the real-submit assertion from e2e entirely (see
  `admin/notifications/page.svelte.e2e.ts`) — that route's send/cleanup
  logic is unit-tested with a mocked sender (`pushSend.spec.ts`) and
  that's now the only coverage of the actual sending behavior. Lesson for
  future work: before writing an e2e test that performs a real
  side-effecting action (not just a DB write), check whether real users
  could be affected by it now that the app has real users, not just
  whether cleanup is possible.
- 2026-09-26: **Home page redesign** ("Cards" concept, approved from 3
  mockup options via an Artifact). Adds SBF's own logo (their building
  mark + "SBF" wordmark, pulled from sbf.church's own header) via a new
  `Logo` component; Fraunces (headings) + Work Sans (body, matches
  sbf.church's own CSS class name) from Google Fonts; a purple header
  band; the three nav links plus notifications become `NavCard`s (icon +
  label + description) using `lucide-svelte` — installed now for the
  first time, though declared as this project's icon library since
  Phase 0's `components.json`. Scoped to the home page only, not the
  other pages' toolbars — the mockup only covered the home screen.
  Changing NavCard's accessible link/button text broke several Phases
  1–4a e2e tests that matched old label text ("View the calendar",
  "Enable notifications", etc.) — updated to match the new labels.
- 2026-09-24: **Push notifications built (`push_subscriptions` +
  `notifications` tables, `web-push` + self-generated VAPID keys, service
  worker, PWA manifest, `/admin/notifications`).** App icon reuses SBF's
  own building favicon (their brand purple, already this app's primary
  color) rather than a new asset. `notifications` has zero RLS
  policies — default-deny, so even an admin's own session can't touch it;
  `/admin/notifications` uses the secret-key client throughout, same
  pattern as Calendar's upload route.
- 2026-09-24: Caught a real race condition via manual testing that the
  e2e suite structurally couldn't catch (it deliberately doesn't drive the
  real `PushManager` — see spec's Testing approach): `subscribeToPush()`
  called `pushManager.subscribe()` right after `serviceWorker.register()`
  resolved, which is before the worker is actually active. Fixed by
  awaiting `navigator.serviceWorker.ready` first.
- 2026-09-24: Test cleanup gap found and fixed: `notifications.created_by`
  is `ON DELETE RESTRICT` (intentional audit trail), so a test admin that
  sent a notification couldn't be deleted without deleting the
  notification first. One e2e run left an orphaned test admin + a real
  notification row in the live project until caught and cleaned up by
  hand; `deleteNotificationsByCreator` fixes it going forward.
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
