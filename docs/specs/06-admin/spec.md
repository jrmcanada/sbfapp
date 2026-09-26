# Spec — Admin functions (Phase 6)

Source: `phase2.md` (the human's request), narrowed by the decisions below.
Builds on 4a (accounts, gate) and 4b (push, notifications).

## Goal

Admins get one place to manage the app: an admin menu, a fuller Accounts
screen, a notification history, an alert when someone asks to join, and a
Send Notification shortcut on Home.

## Decisions (confirmed with the human, 2026-09-26)

- **`phase2.md` item 9 is dropped.** Pending users keep the current gate
  (redirected to `/pending`, never see Home). No change to `authGate.ts`.
- **Home only changes via item 10.** No "Admin" card on Home; `/admin` is
  reached by URL/bookmark.
- **Join alert needs one new column** (`profiles.join_notified_at`).
- **Deleting a user who approved/rejected accounts or sent notifications is
  blocked with a message** (their FKs stay `ON DELETE RESTRICT`), not
  worked around.

## Scope (numbers refer to `phase2.md`)

1. **`/admin` menu** — cards for Accounts, Events, Notifications. Admin only.
2. **Shared admin header** — Home + the other two admin screens on each of
   Accounts, Events, Notifications (Events loses its extra "View calendar"
   link; the menu at `/admin` is not linked from the header — not asked for).
3. **Notification status per user** on Accounts: "On (N devices)" / "Off",
   from `push_subscriptions`.
4. **Accounts management** — per user: email, joined date, account type
   (Regular/Admin — UI labels for `role` `member`/`admin`) with a change
   control, and Delete (two-step confirm). Guards: an admin can't change or
   delete themselves; delete is refused with a message if the user has
   `approved_by`/`created_by` references (see Decisions). Email comes from
   Supabase Auth (`auth.users`), read server-side with the secret key — not
   copied into `profiles` (one fact, one place). Deleting = deleting the
   auth user; `profiles` and `push_subscriptions` rows cascade.
5. **Notification history** on `/admin/notifications`: collapsed
   "History" section listing title, message, sender, sent time, newest first
   (latest 50).
6. **Admin-only access** — verified, not assumed: `authGate.ts` covers
   `/admin` and `/admin/*`; every admin action that uses the secret key
   also re-checks the caller is an approved admin (`requireAdmin`).
7. **Accounts grouping** — Pending (top, needs action, Approve/Reject),
   Admins, Regular, Rejected (bottom). Each sorted by name,
   case-insensitive. (Pending/Rejected placement wasn't specified — chosen
   so the actionable group is first.)
8. **Join alert** — the first time a new sign-in's profile is `pending` and
   `join_notified_at` is null, claim it (atomic update) and push
   "New sign-up request / <name> is asking to join SBF." to approved admins'
   subscribed devices. Runs in `/auth/callback`; failures never block
   sign-in. Not recorded in notification history (that table requires a
   creator).
9. **Send Notification card on Home** (item 10 in `phase2.md`, renumbered
   because item 9 was dropped) — admin only, below the Notifications
   card, links to `/admin/notifications`. Not rendered at all for others
   (`isAdmin` comes from layout data).

## Data model

```sql
alter table public.profiles add column join_notified_at timestamptz;
update public.profiles set join_notified_at = created_at;  -- no retroactive alerts
```

No new policies: the column is only written by the secret-key client in
`/auth/callback`; existing profile RLS is unchanged.

## Testing approach

- Unit: account grouping/sorting, `requireAdmin`, join-alert orchestration
  (fake deps — never a real push), gate rules for `/admin`.
- e2e (real Supabase, seed + cleanup, **no real push sends** — see
  `delivery.md`): admin menu, header links, grouping, role change, delete
  (allowed and blocked), device-count indicator, history list, Home button
  for admin vs member, member redirected from `/admin`.
- The join alert's real push can't be e2e-tested (OAuth callback + it would
  push to real admin devices); unit-tested with fakes and confirmed once by
  hand.
