-- Adds an optional start time to events, so same-day events can be shown
-- in chronological order and the day-detail view can show a time. Nullable:
-- an event with no fixed time (an all-day marker, a holiday) leaves it blank.
-- See docs/specs/02-calendar/spec.md's 2026-09-27 revision.

alter table public.events add column start_time time;
