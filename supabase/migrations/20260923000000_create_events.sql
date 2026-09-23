-- Phase 2 (Calendar): events table.
-- See docs/specs/02-calendar/spec.md for the full design and rationale.

create table public.events (
	id uuid primary key default gen_random_uuid(),
	title text not null,
	description text,
	start_date date not null,
	end_date date not null,
	created_at timestamptz not null default now(),
	constraint events_end_date_after_start_date check (end_date >= start_date)
);

alter table public.events enable row level security;

-- Public read access — the calendar is visible to any member.
create policy "Events are publicly readable"
	on public.events
	for select
	using (true);

-- Deliberately no insert/update/delete policy for anon or authenticated roles.
-- The admin upload route (unauthenticated for now, per masterplan) writes
-- through the server-only secret-key client, which bypasses RLS entirely —
-- so no client-side role ever gets write access to this table.
