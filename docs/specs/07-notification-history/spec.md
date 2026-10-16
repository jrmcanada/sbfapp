# Spec — Notification history for members

Source: the human's request (2026-10-16). Builds on 4b (push notifications)
and 06 (admin notification history).

## Goal

The Notifications card on Home opens a page where any member can read the
notifications sent in the last 30 days, and turn notifications on or off.

## Decisions (confirmed with the human, 2026-10-16)

- **Home card shows status.** Its subtitle reads "On · See recent
  notifications" or "Off · See recent notifications". While the status is
  still being checked, it reads "See recent notifications".
- **History shows title, message and sent date only.** No sender name.
- **"Last month" means the last 30 days**, counted back from now.

## Scope

1. **Home card links to `/notifications`.** It no longer toggles on tap.
2. **New `/notifications` page** with the shared `AppHeader`, a Home
   button, and a "Notifications" heading.
3. **On/off control on that page.** Same behaviour as today's Home toggle,
   moved here: the iOS "Add to Home Screen first" and "Not supported"
   states, the error message, and the busy state all carry over.
4. **History list**, newest first: notifications with `sent_at` in the last
   30 days. Each shows title, message, and the sent date and time in the
   church's timezone (`formatDateTime`).
5. **Empty state:** "No notifications in the last 30 days."
6. **Error state:** if the history can't load, say so. The on/off control
   still works.

## Data access

No schema or RLS change. `notifications` stays default-deny for client
sessions (see 4b). The page's server `load` reads it with the secret-key
client, the same way `/admin/notifications` does. The auth gate already
limits the route to approved members. Unsent rows (`sent_at` null) are
excluded.

## Out of scope

- Read/unread tracking, badges, or counts.
- Paging or anything older than 30 days.
- Changes to `/admin/notifications`.

## Acceptance criteria

1. Home's Notifications card is a link to `/notifications`, and shows On or
   Off once checked.
2. `/notifications` lists notifications sent in the last 30 days, newest
   first, without a sender name, and leaves out older ones.
3. The empty state shows when there are none.
4. The on/off control on `/notifications` behaves as the Home toggle did
   (existing iOS/desktop e2e coverage moves to this page).
5. Typecheck, lint, unit and e2e tests pass.
