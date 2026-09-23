-- Phase 4a (Accounts & Auth Gate): profiles table, admin-check helper,
-- and the trigger that creates a profile whenever someone signs in for
-- the first time. See docs/specs/04a-accounts-auth/spec.md.

create table public.profiles (
	id            uuid primary key references auth.users(id) on delete cascade,
	display_name  text not null,
	status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
	role          text not null default 'member' check (role in ('member', 'admin')),
	approved_by   uuid references public.profiles(id) on delete restrict,
	approved_at   timestamptz,
	created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER so it can read profiles despite RLS without recursing
-- into the policies that call it. Returns only a boolean, never row data.
create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public stable
as $$
	select exists (
		select 1 from public.profiles
		where id = auth.uid() and role = 'admin' and status = 'approved'
	);
$$;

create policy "Users can view their own profile"
	on public.profiles for select
	using (auth.uid() = id);

create policy "Admins can view all profiles"
	on public.profiles for select
	using (public.is_admin());

create policy "Admins can update profiles"
	on public.profiles for update
	using (public.is_admin());

-- Deliberately no insert policy: profile rows are only ever created by the
-- trigger below, never directly by a client.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
	insert into public.profiles (id, display_name)
	values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
	return new;
end;
$$;

create trigger on_auth_user_created
	after insert on auth.users
	for each row execute function public.handle_new_user();
