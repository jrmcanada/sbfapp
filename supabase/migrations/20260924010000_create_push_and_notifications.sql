-- Phase 4b (Push Notifications): push_subscriptions and notifications
-- tables. See docs/specs/04b-push-notifications/spec.md.

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

-- RLS enabled, deliberately no policies: default-deny, so no
-- client-authenticated session (including an admin's own) can read or
-- write this table. /admin/notifications uses the secret-key server
-- client for all of it instead — see spec.md's Data model notes.
alter table public.notifications enable row level security;
