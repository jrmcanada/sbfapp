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

**Open question:** `CLAUDE.md`'s default guidance is to defer auth setup
until deploy time and build features unauthenticated locally. But this
app's core premise is "you must log in to use it" — login isn't a
late-stage add-on here, it's the front door. Assumption for this plan:
build the feature routes unauthenticated first (per `CLAUDE.md`'s default),
then layer in the login gate + admin approval as its own phase before
deploy. Flag if you want auth built earlier instead.

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
4. **Notification sign-up** — a member can opt in/out of notifications
   independently of having an account. Delivery mechanism (push, email,
   in-app) is undecided — see Open questions.
5. **Admin: notifications** — an admin writes a notification and pushes it
   to opted-in members.
6. **Accounts & approval gate** — sign-up, pending state, admin
   approve/reject, login-required access.

Features 1 and 3 pull from the live SBF website rather than storing data in
the app, so they likely don't need their own database tables — confirmed
per-feature when each `spec.md` is written, not assumed here. Feature 2
(Calendar) is the exception: its data is app-owned (see Data model below).

## Data model (draft)

Features 2, 4–6 need app-owned data. Modeled minimally; extend when the
notification delivery mechanism (below) is decided.

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
  notify_opt_in     boolean not null default false
  approved_by       uuid references profiles(id) on delete restrict   -- nullable; which admin approved/rejected
  approved_at       timestamptz
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
- `notify_opt_in` is a single fact about a member, so it's a column on
  `profiles`, not a separate table — no repeating group here yet.
- Per-user delivery/read tracking (did member X receive/see notification Y)
  is deliberately **not** modeled yet — it depends entirely on the delivery
  mechanism below, and adding it now would be guessing at a shape.
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
  lands with Phase 5 auth.
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

## Open questions (resolve before the relevant feature's spec.md)

- **Notification delivery mechanism** — web push (needs a PWA service
  worker + per-device subscription storage), email (simplest with
  Supabase), or in-app inbox only. This changes the data model
  (`notifications` alone isn't enough for push or an inbox) and the build
  order (web push adds real setup cost). Needs a decision before feature 5
  is spec'd.
- **Auth timing** — see the open question under Users & roles above.

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
5. **Phase 4 — Accounts & notifications data model.** `profiles` and
   `notifications` tables, RLS policies, sign-up flow, admin
   approve/reject UI, notify opt-in toggle. Notification _delivery_ is
   scoped separately once the mechanism is decided (may split into its own
   phase).
6. **Phase 5 — Auth gate.** Wire up Supabase Google OAuth, gate all routes
   server-side behind an approved account, rely on RLS for data access —
   per `CLAUDE.md`'s deferred-auth rule, this lands last, right before
   deploy readiness.
7. **Phase 6 — Deploy.** Netlify adapter, env vars, first deploy — only
   once every phase above is done, per `CLAUDE.md`.

Each phase becomes one or more `spec.md` files as it's picked up; this plan
sets the order and boundaries, not the implementation detail.
