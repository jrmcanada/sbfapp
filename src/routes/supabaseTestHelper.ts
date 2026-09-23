import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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
