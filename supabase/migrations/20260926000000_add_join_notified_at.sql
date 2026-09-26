-- Phase 6 (Admin functions): records that admins were already alerted about
-- a pending sign-up, so a still-pending person signing in again doesn't
-- ping them repeatedly. See docs/specs/06-admin/spec.md.

alter table public.profiles add column join_notified_at timestamptz;

-- Everyone who exists today has already been dealt with; don't alert
-- retroactively.
update public.profiles set join_notified_at = created_at;
