# SBF App — master plan

Companion app for Sudbury Bible Fellowship (SBF), a local church. Source
notes: `SBFApp.md` (repo root).

## Purpose & audience

Give SBF's congregation a quick, mobile-friendly way to stay connected to
the church without digging through the main website: check the calendar,
play the latest message, get notified when something's posted. Every user
has an account; there's no anonymous/public browsing mode.

## Users & roles

- **Member** — signs up, waits for admin approval, then gets full access
  (website view, calendar, messages, notification opt-in).
- **Admin** — same access as a member, plus: approves/rejects new accounts,
  creates and pushes notifications.

Account flow: sign up → account sits pending → an admin approves or rejects
it → only approved accounts can use the app.

Auth timing resolved 2026-09-24 — see Decisions: accounts, notifications,
and the login-required gate are built together as one phase, using
`CLAUDE.md`'s "unless I ask" exception to the deferred-auth default.

## Features (major pieces)

1. **Website view** — view sbf.church inside the app (likely an embedded
   view/link-out; exact mechanism is a `spec.md` decision, not a masterplan
   one).
2. **Calendar** — monthly grid view of church events. Revised 2026-09-23:
   sbf.church has no real calendar to pull from (just a flat "Upcoming
   Events" list with free-text dates, e.g. "November 8 - 10 • 2024" — not
   machine-parseable, and no feed/API exists). Events are app-owned instead:
   an admin uploads a plain-text file (one event per line) and the app
   renders it as a real monthly calendar grid.
3. **Messages** — quick access to play messages from sbf.church/messages.
   Revised 2026-09-23: unlike Calendar, this site data is good — each
   message row has structured `data-date`/`data-title`/`data-speaker`/
   `data-tags` attributes and a direct MP3 URL. The app fetches and parses
   the live page **client-side** (sbf.church's Cloudflare bot management
   reliably blocks server-side/automated fetches — see Decisions — but
   explicitly allows cross-origin browser reads) and plays messages via the
   browser's native `<audio>` element pointed straight at sbf.church's own
   MP3 URLs — no re-hosting, no iframe.
4. **Notification sign-up** — a member opts in via the browser's native
   Push API (web push), independently of having an account. Decided
   2026-09-24 — see Decisions. On iOS this only works from a Home Screen
   PWA, not a regular Safari tab; onboarding needs to explain that.
5. **Admin: notifications** — an admin writes a notification and pushes it
   to every subscribed device.
6. **Accounts & approval gate** — sign-up, pending state, admin
   approve/reject, login-required access.

Features 1 and 3 pull from the live SBF website rather than storing data in
the app, so they likely don't need their own database tables — confirmed
per-feature when each `spec.md` is written, not assumed here. Feature 2
(Calendar) is the exception: its data is app-owned (see Data model below).

## Data model (draft)

Features 2, 4–6 need app-owned data.

```
events
  id                uuid PK default gen_random_uuid()
  title             text not null
  description       text                                              -- nullable; optional
  start_date        date not null
  end_date          date not null check (end_date >= start_date)      -- single-day events: end_date = start_date
  created_at        timestamptz not null default now()
  -- created_by intentionally omitted: no admin/profile row exists to
  -- reference until Phase 4. Add via migration once profiles exists.

profiles                              -- one row per auth.users row (Supabase Auth owns auth.users)
  id                uuid PK, references auth.users(id) on delete cascade
  display_name      text not null
  status            text not null check (status in ('pending','approved','rejected')) default 'pending'
  role              text not null check (role in ('member','admin')) default 'member'
  approved_by       uuid references profiles(id) on delete restrict   -- nullable; which admin approved/rejected
  approved_at       timestamptz
  created_at        timestamptz not null default now()

push_subscriptions                    -- one row per subscribed browser/device
  id                uuid PK default gen_random_uuid()
  profile_id        uuid not null references profiles(id) on delete cascade
  endpoint          text not null unique      -- the push service URL for this device
  p256dh            text not null             -- subscription public key
  auth              text not null             -- subscription auth secret
  created_at        timestamptz not null default now()

notifications
  id                uuid PK default gen_random_uuid()
  title             text not null
  body              text not null
  created_by        uuid not null references profiles(id) on delete restrict
  created_at        timestamptz not null default now()
  sent_at           timestamptz                                       -- null until pushed
```

Notes against the database-design rules in `CLAUDE.md`:

- `profiles` splits from `auth.users` because Supabase owns and manages
  `auth.users` directly — this is the standard, justified exception to
  "one-to-one usually means one table."
- `push_subscriptions` is a real one-to-many relationship (a member can
  subscribe from several devices/browsers) — a repeating group, so it's its
  own table with a FK to `profiles`, not columns bolted onto `profiles`.
  Opt-in/out is the presence or absence of a row, not a separate boolean —
  storing both would risk the two facts drifting apart.
- Per-notification delivery/read tracking (did device X receive/see
  notification Y) is deliberately **not** modeled yet — pushing is
  fire-and-forget to every current subscription for now; add tracking
  later if there's a proven need, not speculatively.
- `events` has no `created_by` yet since no admin/profile concept exists
  until Phase 4 — see Decisions below on how the upload route is gated
  until then.

## Decisions

- 2026-09-23: The Calendar's admin upload route ships **unauthenticated**
  in Phase 2, consistent with `CLAUDE.md`'s default (build unauthenticated
  locally until deploy readiness). The `events` table itself stays safe
  regardless: RLS allows public `SELECT` only, and the upload route writes
  via the server-only service-role client, so no anon/client role ever gets
  insert access. Real admin gating (who may reach the upload route at all)
  lands with Phase 4's auth gate.
- 2026-09-23: Messages are scraped from sbf.church/messages' structured
  `data-*` row attributes, not stored in the app's DB and not
  admin-curated — unlike Calendar, the site's own data is good enough to
  pull live on every request. Accepted risk: this is fragile to sbf.church
  changing its message-list template (unlike Calendar, there's no admin
  fallback if it breaks — a redesign there means a code fix here).
- 2026-09-23: **The fetch runs client-side, not server-side.** Confirmed
  (repeatedly, not once) that sbf.church's Cloudflare bot management blocks
  Node's `fetch()` and even a genuine headless-browser request, regardless
  of a matching browser User-Agent — this is TLS/network-fingerprint-level
  detection, not a header check, so it would have blocked the feature in
  production (Netlify's servers are Node too), not just locally. sbf.church
  sends `Access-Control-Allow-Origin: *`, explicitly permitting
  cross-origin browser reads, so `/messages` fetches from the visitor's own
  browser instead — verified working end-to-end against the live site.
  Keep this in mind for any future feature that wants to pull from
  sbf.church: default to client-side, don't assume server-side will work.
- 2026-09-24: **Notification delivery is web push**, confirmed free (the
  Web Push standard needs no paid service — VAPID keys are self-generated,
  and browser push services are provided free by Google/Mozilla/Apple as
  part of the standard). Real caveat, not a cost one: iOS Safari only
  supports push for a site added to the Home Screen as a PWA — a regular
  Safari tab can't subscribe at all. This means Phase 4/5 needs a PWA
  manifest + service worker (not just the notification data model), and
  onboarding must explain the "Add to Home Screen" step to iPhone users or
  they'll silently never receive notifications. Delivery is fire-and-forget
  to every current `push_subscriptions` row — no per-notification tracking
  (see Data model notes).
- 2026-09-24: **Phases 4 and 5 merged into one phase** (accounts,
  notifications, and the auth gate together), invoking `CLAUDE.md`'s
  "unless I ask" exception to build Google OAuth now rather than at deploy
  readiness. Forced by a hard dependency: `profiles.id` has a FK to
  `auth.users`, so a real pending signup can't exist without real
  Supabase Auth already wired up — there's no way to build/test the
  approve/reject flow meaningfully otherwise. Confirmed with the human
  before proceeding.

## Build order (phases)

1. **Phase 0 — Scaffold.** Project setup per `docs/Workflow.md`'s one-time
   setup (SvelteKit, Tailwind, shadcn-svelte, Supabase, Netlify adapter,
   Vitest/Playwright).
2. **Phase 1 — Website view.** Simplest feature, no data model, good first
   spec to prove out the pipeline (spec-reviewer → build → review → verify).
3. **Phase 2 — Calendar.** `events` table + RLS (public read, server-only
   write), admin text-file upload route (unauthenticated for now — see
   Decisions), monthly calendar grid view.
4. **Phase 3 — Messages.** Quick-access playback pulling from
   sbf.church/messages.
5. **Phase 4 — Accounts, notifications & auth gate.** Merged 2026-09-24
   (was two phases) — `profiles`, `push_subscriptions`, and `notifications`
   tables + RLS; Google OAuth sign-in via Supabase Auth; sign-up + admin
   approve/reject UI; PWA manifest + service worker; the push opt-in flow
   (including the iOS "Add to Home Screen" explainer); admin
   compose-and-push UI; **and** the login-required gate itself — every
   route (website, calendar, messages) now requires an approved account,
   server-side, relying on RLS for data access. Uses `CLAUDE.md`'s
   "unless I ask" exception to build auth before deploy readiness, since
   real signups can't exist without it (the `profiles` FK to `auth.users`
   requires a real Supabase Auth user, and testing approve/reject
   meaningfully needs the gate to actually matter).
5. **Phase 5 — Deploy.** Netlify adapter, env vars, first deploy — only
   once every phase above is done, per `CLAUDE.md`.

Each phase becomes one or more `spec.md` files as it's picked up; this plan
sets the order and boundaries, not the implementation detail.
