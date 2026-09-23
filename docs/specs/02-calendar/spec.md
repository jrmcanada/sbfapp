# Spec — Calendar (Phase 2)

Traces to `docs/masterplan.md` → Features §2, Build order Phase 2.

## Goal

Let a member see church events in a monthly calendar grid. Events are
entered by an admin via a text-file upload, not pulled from sbf.church —
see masterplan's 2026-09-23 revision for why (no usable calendar data on
the site: free-text dates, no feed).

## Data model (decided — needs supabase-guardian confirmation before the migration runs)

```
events
  id            uuid PK default gen_random_uuid()
  title         text not null
  description   text                                     -- nullable
  start_date    date not null
  end_date      date not null check (end_date >= start_date)
  created_at    timestamptz not null default now()
```

RLS: public `SELECT` only. No anon `INSERT`/`UPDATE`/`DELETE` — the upload
route writes via the server-only service-role client, so the missing admin
gate (below) never exposes write access to the client.

## Upload file format (decided)

Plain text, one event per line:

```
<start_date>[ to <end_date>] | <title> | <description>
```

- Dates: ISO `YYYY-MM-DD`. `end_date` is optional — omit for a single-day
  event (defaults to `start_date`).
- `description` is optional — a line may have just two `|`-separated
  fields (date(s) and title).
- Blank lines and lines starting with `#` are ignored.
- Example:
  ```
  2026-11-08 to 2026-11-10 | Sudbury Youth Conference | Speaker: Sean O'Byrne
  2026-12-25 | Christmas Service
  ```

## Scope

- New `events` table + RLS policies (supabase-guardian owns the migration).
- Admin route `/admin/events`: a file input and submit button. On submit,
  the server:
  1. Parses every non-blank, non-comment line.
  2. Validates the whole file first. If any line fails (bad date format,
     `end_date` before `start_date`, missing title, wrong field count),
     reject the entire upload — show every error (line number + reason),
     insert nothing. All-or-nothing per upload.
  3. On success, inserts the parsed events as new rows. Upload **appends**
     to existing events; it does not replace them. Re-uploading the same
     file creates duplicates — accepted risk for now, not handled.
  4. Shows a plain success message with the count of events added.
- Member-facing route `/calendar`: a monthly grid (current month by
  default), prev/next month navigation, each day cell showing the titles
  of events whose `[start_date, end_date]` range includes that day. A day
  can have more than one event — the cell lists all of them, and viewing a
  given event's description (inline expand vs. a separate detail view) is
  ui-ux-designer's call within this scope, but it must work the same way
  whether the day has one event or several.
- Empty states: no events in the visible month; the admin upload page with
  no file chosen yet.
- Home page (`/`) also links to `/calendar`, alongside the existing
  `/website` link.
- No auth/admin gating on `/admin/events` yet — anyone who knows the URL
  can upload. Accepted per masterplan's 2026-09-23 decision; real gating
  lands in Phase 5.

## Out of scope

- Editing or deleting individual events once uploaded.
- Recurring events.
- Any pull from sbf.church for calendar data (superseded by admin entry).
- App-wide navigation shell (same deferral as Phase 1).
- Time-of-day for events — dates only, no start/end times.

## Acceptance criteria

1. `/admin/events` accepts a well-formed file and inserts the parsed events.
2. A malformed file (bad date, missing title, wrong field count on any
   line) is rejected entirely, with per-line errors shown, and nothing is
   inserted.
3. `/calendar` shows a monthly grid for the current month with uploaded
   events on the correct day(s), including multi-day events spanning their
   full date range.
4. Prev/next navigation moves between months.
5. `/` links to `/calendar`.
6. Playwright e2e covers 1 (valid upload), 2 (invalid upload rejected), 3
   (event appears on the correct day), 5. Typecheck, lint, and tests pass.

## Resolved questions

- 2026-09-23: sbf.church has no usable calendar data — events are
  app-owned, entered via admin file upload instead of pulled from the site.
- 2026-09-23: Upload appends to existing events; it does not replace them.
- 2026-09-23: `/admin/events` ships unauthenticated for now, consistent
  with the project's deferred-auth default; real admin gating lands in
  Phase 5.
