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
2. **Calendar** — monthly view of church events, pulled/linked from
   sbf.church rather than re-entered in the app. No app-owned event data.
3. **Messages** — quick access to play messages from sbf.church/messages.
   Pulled/linked from the site, not stored or re-hosted by the app.
4. **Notification sign-up** — a member can opt in/out of notifications
   independently of having an account. Delivery mechanism (push, email,
   in-app) is undecided — see Open questions.
5. **Admin: notifications** — an admin writes a notification and pushes it
   to opted-in members.
6. **Accounts & approval gate** — sign-up, pending state, admin
   approve/reject, login-required access.

Because features 1–3 pull from the live SBF website rather than storing
data in the app, they likely don't need their own database tables — that's
confirmed per-feature when each `spec.md` is written, not assumed here.

## Data model (draft)

Only features 4–6 clearly need app-owned data right now. Modeled minimally;
extend when the notification delivery mechanism (below) is decided.

```
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

## Open questions (resolve before the relevant feature's spec.md)

- **Notification delivery mechanism** — web push (needs a PWA service
  worker + per-device subscription storage), email (simplest with
  Supabase), or in-app inbox only. This changes the data model
  (`notifications` alone isn't enough for push or an inbox) and the build
  order (web push adds real setup cost). Needs a decision before feature 5
  is spec'd.
- **Website/calendar/messages integration mechanism** — iframe embed,
  server-side fetch, or plain link-out to sbf.church. Affects feasibility
  (does the SBF site allow framing? is there a feed/API for the calendar?)
  and should be checked per-feature.
- **Auth timing** — see the open question under Users & roles above.

## Build order (phases)

1. **Phase 0 — Scaffold.** Project setup per `docs/Workflow.md`'s one-time
   setup (SvelteKit, Tailwind, shadcn-svelte, Supabase, Netlify adapter,
   Vitest/Playwright).
2. **Phase 1 — Website view.** Simplest feature, no data model, good first
   spec to prove out the pipeline (spec-reviewer → build → review → verify).
3. **Phase 2 — Calendar.** Monthly view pulling from sbf.church.
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
