# Spec — Accounts & Auth Gate (Phase 4a)

Traces to `docs/masterplan.md` → Features §4/§6, Build order Phase 4
(the accounts/auth half; push notifications are 4b).

## Goal

Real Google sign-in, admin approval, and a login-required gate on every
route — the app's core premise ("you must log in to use it") becomes real.

## Data model (decided — needs supabase-guardian confirmation before the migration runs)

```sql
create table public.profiles (
	id            uuid primary key references auth.users(id) on delete cascade,
	display_name  text not null,
	status        text not null default 'pending' check (status in ('pending','approved','rejected')),
	role          text not null default 'member' check (role in ('member','admin')),
	approved_by   uuid references public.profiles(id) on delete restrict,
	approved_at   timestamptz,
	created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
	on public.profiles for select
	using (auth.uid() = id);

create policy "Admins can view all profiles"
	on public.profiles for select
	using (public.is_admin());

create policy "Admins can update profiles"
	on public.profiles for update
	using (public.is_admin());

-- No insert policy: rows are created only by the trigger below, never
-- directly by a client.

create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public stable
as $$
	select exists (
		select 1 from public.profiles
		where id = auth.uid() and role = 'admin' and status = 'approved'
	);
$$;

-- Auto-create a pending profile whenever someone signs in for the first
-- time. SECURITY DEFINER so it can write to profiles despite RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
	insert into public.profiles (id, display_name)
	values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
	return new;
end;
$$;

create trigger on_auth_user_created
	after insert on auth.users
	for each row execute function public.handle_new_user();
```

`is_admin()` is `security definer` deliberately: an RLS policy on
`profiles` that queried `profiles` directly to check the caller's own role
would recurse. The function bypasses RLS internally for that one check and
returns only a boolean, never row data.

## Auth mechanism (decided)

`@supabase/ssr`'s `createServerClient`/`createBrowserClient`, not the
plain `@supabase/supabase-js` client `$lib/supabase/client.ts` currently
uses — SSR needs the server and browser to share one cookie-backed
session, which the plain client doesn't do. **This replaces
`$lib/supabase/client.ts`'s implementation**; `$lib/server/supabase.ts`
(secret-key admin client) is unaffected.

Session validation uses the `getUser()`-revalidated pattern, not a bare
`getSession()`: `getSession()` only decodes the cookie's JWT locally,
`getUser()` round-trips to Supabase Auth to confirm it's still valid. Every
gating decision uses the validated version.

## Scope

- **Sign-in**: `/login` — "Sign in with Google" button
  (`supabase.auth.signInWithOAuth({ provider: 'google' })`), public (no
  session required). Shows a plain explanation, not a bare button with no
  context.
- **OAuth callback**: `/auth/callback` (`+server.ts`) — exchanges the
  OAuth code for a session, then redirects to `/`.
- **Sign-out**: one small persistent control added to the existing root
  `src/routes/+layout.svelte` (already wraps every page) — not a nav-shell
  redesign, and not added to each page's own toolbar individually. This is
  the only change to already-shipped pages; `/website`, `/calendar`,
  `/messages`, and `/admin/events` otherwise need zero code changes —
  gating happens once in `hooks.server.ts`, before any of their load
  functions run.
- **`src/hooks.server.ts`**: on every request, build the SSR client,
  validate the session, load the caller's `profiles` row, and redirect:
  - No valid session → `/login` (except `/login`, `/auth/callback`
    themselves).
  - Valid session, `status` is `pending` or `rejected` → `/pending`.
  - Valid session, `status = 'approved'`, visiting `/admin/*` while
    `role != 'admin'` → redirect to `/` (not an error page — just not
    there).
  - Valid session, `status = 'approved'`, visiting `/login` or `/pending`
    → redirect to `/` (nothing for an already-approved user to do there).
  - Otherwise: request proceeds normally.
- **`/pending`**: shown to an authenticated, not-yet-approved user.
  Different copy for `pending` ("your account is awaiting approval") vs.
  `rejected` ("your request wasn't approved — contact the church
  office"). Includes sign-out.
- **`/admin/accounts`**: admin-only. Lists pending accounts with
  Approve/Reject buttons (writes `status`, `approved_by`, `approved_at`).
  Also lists approved/rejected accounts for visibility, read-only.
- **Retrofits `/admin/events`** (Phase 2, shipped unauthenticated on
  purpose — see masterplan) **with real admin gating**, fulfilling the
  deferral recorded there. No RLS change needed (it was already
  public-select-only, server-only-write); this is purely the new
  `hooks.server.ts` check applying to it like any other `/admin/*` route.
- **First-admin bootstrap**: the trigger can only create `pending`
  `member` rows — nothing can become an admin through the app itself
  (correctly; only an existing admin can promote anyone). The human signs
  in once, then runs a one-time SQL statement (given at build time,
  parameterized by their email) in the Supabase SQL editor to promote
  themselves. Documented as a manual step, not automated — deliberately no
  code path that can silently mint an admin.

## Out of scope

- Push notifications (Phase 4b).
- App-wide navigation shell (still deferred — see Phases 1–3).
- Editing a profile's `display_name` after creation.
- Any social sign-in other than Google.
- Removing/deactivating an approved account (only pending→approved/rejected
  is in scope; an already-approved member can't be un-approved from this
  UI).

## Acceptance criteria

1. Visiting any route without a session redirects to `/login`.
2. Signing in with Google creates a `pending` `profiles` row (via the
   trigger) and lands on `/pending`.
3. An admin can see a pending account on `/admin/accounts` and approve or
   reject it; the affected user's next request reflects the new status
   (approved → full access, rejected → `/pending` with rejected copy).
4. A non-admin approved user visiting `/admin/accounts` or
   `/admin/events` is redirected away, not shown an error.
5. Sign-out ends the session and the next request redirects to `/login`.
6. Typecheck, lint, and tests pass.

## Testing approach (decided, refined during build)

Automating real Google sign-in in e2e tests isn't practical or
appropriate (Google actively resists automated OAuth, and it'd need real
throwaway credentials) — but Supabase Auth's email/password provider is a
completely separate, fully automatable method. Real test users are created
via the secret-key admin API with password sign-in, their `profiles` row
forced to whatever status/role a test needs, and their session injected
directly as a browser cookie (`sb-<project-ref>-auth-token`, matching
`@supabase/ssr`'s own format exactly — verified against a real signed-in
session first, not guessed). Production sign-in only ever offers Google;
this is purely a test-side shortcut around it, implemented in
`src/routes/supabaseTestHelper.ts` (`ensureTestUser`, `signInAsTestUser`,
`deleteTestUser`).

This gave three layers of real coverage, not just the two originally
planned:

- **Unit tests** (`authGate.spec.ts`): the gating decision itself is a
  pure function covering every rule — no session, pending, rejected,
  non-admin on `/admin/*`, approved on a normal route, already-approved
  hitting `/login`/`/pending`.
- **e2e, real sessions** (`pending/page.svelte.e2e.ts`,
  `admin/accounts/page.svelte.e2e.ts`): the actual `hooks.server.ts`, a
  real trigger-created profile, real RLS-checked approve/reject, and
  sign-out — end to end, not mocked.
- **e2e, anonymous** (`login/page.svelte.e2e.ts`): no session at all,
  confirming every route redirects to `/login`.

This also meant `/website`, `/calendar`, `/messages`, and `/admin/events`'
existing e2e suites (Phases 1–3) needed updating — they ran unauthenticated
before this phase gated everything, so each now signs in as an appropriate
test user first.

## Resolved questions

- 2026-09-24: `/admin/events` gets real gating in this phase, per the
  deferral recorded in masterplan's Phase 2 Decisions.
- 2026-09-24: First admin is bootstrapped manually via SQL, not an
  automated "first user is admin" rule — keeps the promotion path
  single, deliberate, and auditable.
