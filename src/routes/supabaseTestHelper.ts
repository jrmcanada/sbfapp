import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { BrowserContext } from '@playwright/test';

/**
 * e2e-only helper for talking to the real Supabase project directly with the
 * secret key, bypassing the app entirely. Playwright's test runner is plain
 * Node — it doesn't go through Vite, so `$env/static/private` isn't
 * available here; `.env` is read directly instead.
 *
 * `/calendar` and `/admin/events` do their Supabase calls server-side
 * (during SSR / the form action), which `page.route()` cannot intercept —
 * it only sees requests the browser itself makes. So these e2e tests touch
 * the real project for real and clean up after themselves via this helper,
 * rather than pretending to mock something that can't be mocked here.
 */

const projectRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

function readEnv(): Record<string, string> {
	const content = readFileSync(path.join(projectRoot, '.env'), 'utf8');
	return Object.fromEntries(
		content
			.split(/\r?\n/)
			.filter((line) => line.includes('='))
			.map((line) => {
				const i = line.indexOf('=');
				return [line.slice(0, i), line.slice(i + 1)];
			})
	);
}

const env = readEnv();
const url = env.PUBLIC_SUPABASE_URL;
const secretKey = env.SUPABASE_SECRET_KEY;
const publishableKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const projectRef = new URL(url).hostname.split('.')[0];

function headers() {
	return {
		apikey: secretKey,
		Authorization: `Bearer ${secretKey}`,
		'Content-Type': 'application/json'
	};
}

export async function insertTestEvents(
	events: { title: string; description?: string | null; start_date: string; end_date: string }[]
): Promise<string[]> {
	const res = await fetch(`${url}/rest/v1/events`, {
		method: 'POST',
		headers: { ...headers(), Prefer: 'return=representation' },
		body: JSON.stringify(events)
	});
	if (!res.ok) throw new Error(`seed insert failed: ${res.status} ${await res.text()}`);
	const rows: { id: string }[] = await res.json();
	return rows.map((r) => r.id);
}

export async function findEventIdsByTitle(title: string): Promise<string[]> {
	const res = await fetch(`${url}/rest/v1/events?select=id&title=eq.${encodeURIComponent(title)}`, {
		headers: headers()
	});
	if (!res.ok) throw new Error(`lookup failed: ${res.status} ${await res.text()}`);
	const rows: { id: string }[] = await res.json();
	return rows.map((r) => r.id);
}

export async function deleteTestEvents(ids: string[]): Promise<void> {
	for (const id of ids) {
		const res = await fetch(`${url}/rest/v1/events?id=eq.${id}`, {
			method: 'DELETE',
			headers: headers()
		});
		if (!res.ok) throw new Error(`cleanup delete failed: ${res.status} ${await res.text()}`);
	}
}

/**
 * Creates (or reuses) a real auth user with email/password sign-in and sets
 * their profile to the given status/role — for e2e tests to sign in as,
 * since automating real Google OAuth isn't practical. Password auth is a
 * completely separate, fully automatable Supabase Auth method; production
 * sign-in only ever offers Google (see /login).
 */
export async function ensureTestUser({
	email,
	password,
	status,
	role
}: {
	email: string;
	password: string;
	status: 'pending' | 'approved' | 'rejected';
	role: 'member' | 'admin';
}): Promise<string> {
	const createRes = await fetch(`${url}/auth/v1/admin/users`, {
		method: 'POST',
		headers: headers(),
		body: JSON.stringify({ email, password, email_confirm: true })
	});

	let id: string;
	if (createRes.status === 200 || createRes.status === 201) {
		id = (await createRes.json()).id;
	} else {
		// Already exists from a previous run — look it up instead.
		const listRes = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
			headers: headers()
		});
		if (!listRes.ok)
			throw new Error(`test user lookup failed: ${listRes.status} ${await listRes.text()}`);
		const { users } = await listRes.json();
		if (!users?.[0]) throw new Error(`could not create or find test user ${email}`);
		id = users[0].id;
	}

	// The new_user trigger creates a 'pending' 'member' row; force it to the
	// state this test needs regardless of what it was left at.
	const profileRes = await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, {
		method: 'PATCH',
		headers: { ...headers(), Prefer: 'return=minimal' },
		body: JSON.stringify({ status, role })
	});
	if (!profileRes.ok)
		throw new Error(`test profile update failed: ${profileRes.status} ${await profileRes.text()}`);

	return id;
}

export async function deleteTestUser(id: string): Promise<void> {
	// Cascades to the profiles row (ON DELETE CASCADE).
	const res = await fetch(`${url}/auth/v1/admin/users/${id}`, {
		method: 'DELETE',
		headers: headers()
	});
	if (!res.ok) throw new Error(`test user cleanup failed: ${res.status} ${await res.text()}`);
}

/**
 * Signs in as a test user and injects the resulting session directly as a
 * browser cookie, matching exactly what @supabase/ssr's browser client
 * would set after a real sign-in (verified against a real signed-in
 * session: cookie `sb-<project-ref>-auth-token`, value `base64-` + base64
 * JSON of the Session object). Avoids needing to reach into the app's
 * internals through page.evaluate, which only works in dev — production
 * preview serves hashed chunk files, not importable source paths.
 */
export async function signInAsTestUser(
	context: BrowserContext,
	baseURL: string,
	email: string,
	password: string
): Promise<void> {
	const client = createClient(url, publishableKey);
	const { data, error } = await client.auth.signInWithPassword({ email, password });
	if (error || !data.session) throw new Error(`test sign-in failed: ${error?.message}`);

	const value = 'base64-' + Buffer.from(JSON.stringify(data.session)).toString('base64');
	await context.addCookies([
		{
			name: `sb-${projectRef}-auth-token`,
			value,
			url: baseURL,
			httpOnly: false,
			sameSite: 'Lax'
		}
	]);
}
