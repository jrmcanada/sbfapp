# Spec — Push Notifications (Phase 4b)

Traces to `docs/masterplan.md` → Features §4/§5, Build order Phase 4.
Builds on 4a (real accounts, `profiles`).

## Goal

A member can enable push notifications; an admin can write one and send it
to everyone currently subscribed.

## Data model (decided — needs supabase-guardian confirmation before the migration runs)

```sql
create table public.push_subscriptions (
	id          uuid primary key default gen_random_uuid(),
	profile_id  uuid not null references public.profiles(id) on delete cascade,
	endpoint    text not null unique,
	p256dh      text not null,
	auth        text not null,
	created_at  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage their own subscriptions (insert)"
	on public.push_subscriptions for insert
	with check (profile_id = auth.uid());

create policy "Users manage their own subscriptions (select)"
	on public.push_subscriptions for select
	using (profile_id = auth.uid());

create policy "Users manage their own subscriptions (delete)"
	on public.push_subscriptions for delete
	using (profile_id = auth.uid());

create table public.notifications (
	id          uuid primary key default gen_random_uuid(),
	title       text not null,
	body        text not null,
	created_by  uuid not null references public.profiles(id) on delete restrict,
	created_at  timestamptz not null default now(),
	sent_at     timestamptz
);

alter table public.notifications enable row level security;
-- Deliberately no policies at all: RLS enabled + zero policies is
-- default-deny, so no client-authenticated role (including an admin's own
-- locals.supabase session) can read or write this table. The
-- /admin/notifications route uses the secret-key server client instead
-- (like Calendar's upload route in Phase 2) for every operation it does —
-- inserting the row, reading all push_subscriptions to send to (which a
-- normal admin session couldn't do either, since those RLS policies only
-- grant a user their own rows), deleting expired subscriptions, and
-- setting sent_at. The route itself still requires an authenticated admin
-- session to be *reached at all* (hooks.server.ts's gate); it just doesn't
-- use that session's client for the database work.
```

Notes against the database-design rules:

- `push_subscriptions` write/read/delete are each scoped to the caller's
  own `profile_id` — a member can only ever see or remove their own
  devices, never anyone else's, via their own session. The admin send
  action reads and deletes across all of them, which requires the
  secret-key client precisely because RLS correctly refuses to let a
  normal session do that.

## Mechanism (decided)

Standard Web Push: VAPID keys (self-generated, `npx web-push
generate-vapid-keys`, no paid service — see masterplan Decisions), a
service worker (`static/sw.js`, push-handling only — no offline asset
caching, that's out of scope) registered client-side, and the `web-push`
npm package server-side to actually send.

**iOS constraint** (masterplan Decisions): push only works from a Home
Screen PWA on iOS, never a regular Safari tab. Detected client-side
(`navigator.standalone` / `matchMedia('(display-mode: standalone)')` for
"installed", UA sniffing for "is iOS" — there's no clean feature-detect for
that). iOS users not yet installed see an explainer instead of a
non-functional button.

**App icon**: SBF's own building favicon (pulled from their site,
`#21005C`, already the app's own primary color), placed on a square
`#F5F2EB` canvas — not a new asset, reuses their existing brand mark.
Rasterized to the manifest's required sizes plus an `apple-touch-icon`.

## Scope

- `static/manifest.webmanifest` + icons (192, 512, apple-touch-icon 180),
  linked from `src/app.html` along with the `apple-mobile-web-app-*` meta
  tags iOS needs.
- `static/sw.js`: push-only service worker (`push` → `showNotification`,
  `notificationclick` → focus/open `/`).
- `$lib/notifications.ts`: `isIOS()`, `isStandalone()`,
  `subscribeToPush()`, `unsubscribeFromPush()` — registers the service
  worker, requests permission, subscribes via `pushManager`, POSTs the
  subscription to the server.
- `/notifications/subscribe` (`+server.ts`, `POST`): stores a subscription
  for the caller (`locals.supabase`, RLS-checked — requires an approved
  session, already guaranteed by the Phase 4a gate).
- `/notifications/unsubscribe` (`+server.ts`, `POST`): removes the
  caller's subscription by endpoint.
- Home page (`/`): a notifications control reflecting this device's actual
  subscription state (checked via `pushManager.getSubscription()` on
  mount) — enable/disable button on supported browsers, the iOS explainer
  otherwise.
- `/admin/notifications`: admin-only (same gating as `/admin/events`,
  `/admin/accounts`). A compose form (title, body). On submit: insert the
  `notifications` row, send via `web-push` to every current
  `push_subscriptions` row, delete any that come back `410`/`404`
  (expired/unsubscribed at the push service), set `sent_at`, show a result
  summary ("Sent to N, removed M expired").

## Out of scope

- Offline caching / general PWA asset strategy — the service worker exists
  only to handle push events.
- Per-notification delivery/read tracking (masterplan: fire-and-forget).
- Editing or deleting a sent notification; viewing past notifications.
- Per-notification custom icons/images.
- Any install-prompt handling beyond the iOS explainer — Chrome/Firefox/
  Edge support push directly, no install needed there.

## Acceptance criteria

1. On a supported browser, enabling notifications prompts for permission
   and stores a subscription; disabling removes it.
2. On iOS without Home Screen install, an explainer shows instead of a
   non-functional control.
3. An admin can compose and send from `/admin/notifications`; the result
   summary reflects real send/removal counts.
4. A subscription that a push send reports as `410`/`404` is deleted from
   `push_subscriptions`.
5. Typecheck, lint, and tests pass.

## Testing approach

Real end-to-end push delivery to a real subscribed device can't be
automated (same category of constraint as Phase 4a's Google sign-in — it
requires a genuine browser push-service round trip, out of any test
runner's reach). Split accordingly:

- **Unit tests**: `isIOS`/`isStandalone` detection logic; the
  send-and-cleanup logic with `web-push`'s `sendNotification` mocked (a
  410/404 response triggers a delete, other errors don't).
- **e2e**: `/notifications/subscribe` and `/unsubscribe` against real
  (test-user) sessions, confirming the RLS-scoped store/remove actually
  works; the iOS-explainer-vs-button UI states, using Playwright's iPhone
  device emulation plus an injected `standalone` flag; the admin compose
  form rendering and submitting (with zero real subscriptions seeded,
  "sent to 0" is the correct, honestly-testable outcome — not attempting a
  real push round trip).

## Resolved questions

- 2026-09-24: `notifications` has no RLS policies at all (not even
  admin-scoped) — nothing reads or writes it directly from the client;
  the admin route uses the secret-key client, same as Calendar's upload.
- 2026-09-24: App icon reuses SBF's own building favicon rather than
  commissioning a new asset.

## Findings during build

- **Real bug caught by manual testing, not the test suite**: `subscribeToPush()`
  originally called `pushManager.subscribe()` right after
  `serviceWorker.register()` resolved — but `register()` resolves once
  installation *starts*, not once the worker is active, so subscribing
  immediately after it intermittently failed with "no active Service
  Worker." Fixed by awaiting `navigator.serviceWorker.ready` first, which
  only resolves once a worker is actually active. The e2e suite couldn't
  have caught this — it correctly avoids driving the real `PushManager`
  (see Testing approach) — so this only surfaced by actually clicking the
  button in a real browser session.
- **Automated Chrome (any of it, including a real non-incognito
  persistent profile) can't complete a real push subscription at all** —
  confirmed "push service not available," a well-documented limitation of
  automated/headless Chrome lacking a genuine connection to Google's push
  infrastructure. This is environment, not app code — real verification of
  an actual end-to-end subscribe needs a human clicking the button in
  their own real browser, same category as Phase 4a's Google sign-in.
- **Test cleanup gap**: `notifications.created_by` is `ON DELETE
  RESTRICT` (intentional — an audit trail), so a test admin that sent a
  notification couldn't be deleted afterward without deleting the
  notification first. First e2e run left an orphaned test admin + a real
  "E2E Test Notification" row in the live project until this was caught
  and cleaned up by hand. Fixed with `deleteNotificationsByCreator`,
  called before `deleteTestUser` wherever a test sends a notification.
