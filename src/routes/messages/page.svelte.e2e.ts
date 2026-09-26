import { expect, test } from '@playwright/test';
import { deleteTestUser, ensureTestUser, signInAsTestUser } from '../supabaseTestHelper';

// Fetched client-side (see +page.ts for why), so unlike /calendar and
// /admin/events, page.route() genuinely intercepts this — it's a real
// browser-made request. Mocked rather than hitting the live site: content
// there changes over time, and sbf.church's own Cloudflare bot management
// is inconsistent against automated tools (including Playwright itself).
//
// Every route now requires an approved account (Phase 4a) — sign in as a
// real approved test user first. See supabaseTestHelper.ts.

let testUserId: string;
const testEmail = `e2e-messages-${Date.now()}@example.com`;

test.beforeAll(async () => {
	testUserId = await ensureTestUser({
		email: testEmail,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'member'
	});
});

test.afterAll(async () => {
	await deleteTestUser(testUserId);
});

test.beforeEach(async ({ context, baseURL }) => {
	await signInAsTestUser(context, baseURL!, testEmail, 'TestPassword123!');
});

function row(n: number): string {
	return `
		<tr class="messages--row" data-date="2026-0${n}-01" data-title="Message ${n}" data-speaker="Speaker ${n}">
			<a class="messages--openBtn" href="/messages/msg-${n}/"></a>
			<a class="messages--download" href="https://messages.sbf.church/msg-${n}.mp3"></a>
		</tr>
	`;
}

test('home links to messages', async ({ page }) => {
	await page.route('https://sbf.church/messages/', (route) =>
		route.fulfill({
			contentType: 'text/html',
			body: Array.from({ length: 10 }, (_, i) => row(i + 1)).join('')
		})
	);
	await page.goto('/');
	await page.getByRole('link', { name: 'Messages' }).click();
	await expect(page).toHaveURL(/\/messages/);
});

test('shows up to 10 messages, each with a title, speaker/date, and an mp3 player', async ({
	page
}) => {
	await page.route('https://sbf.church/messages/', (route) =>
		route.fulfill({
			contentType: 'text/html',
			body: Array.from({ length: 12 }, (_, i) => row(i + 1)).join('')
		})
	);
	await page.goto('/messages');

	const items = page.locator('.message');
	await expect(items).toHaveCount(10);

	const first = items.first();
	await expect(first.locator('.title')).toHaveText('Message 1');
	await expect(first.locator('.meta')).toContainText('Speaker 1');
	await expect(first.locator('audio')).toHaveAttribute(
		'src',
		'https://messages.sbf.church/msg-1.mp3'
	);
});

test('shows a fallback with a link-out when nothing can be parsed', async ({ page }) => {
	await page.route('https://sbf.church/messages/', (route) =>
		route.fulfill({ contentType: 'text/html', body: '<html><body>redesigned page</body></html>' })
	);
	await page.goto('/messages');

	await expect(page.locator('.message')).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'full archive on sbf.church' })).toHaveAttribute(
		'href',
		'https://sbf.church/messages/'
	);
});

test('links to the full archive on sbf.church', async ({ page }) => {
	await page.route('https://sbf.church/messages/', (route) =>
		route.fulfill({ contentType: 'text/html', body: row(1) })
	);
	await page.goto('/messages');
	await expect(page.getByRole('link', { name: 'Full archive', exact: true })).toHaveAttribute(
		'href',
		'https://sbf.church/messages/'
	);
});

test('shows the app header, with the name and a single Sign out', async ({ page }) => {
	await page.route('https://sbf.church/messages/', (route) =>
		route.fulfill({ contentType: 'text/html', body: '' })
	);
	await page.goto('/messages');

	const header = page.locator('header.band');
	await expect(header).toContainText('SBF');
	await expect(header).toContainText(testEmail);
	await expect(header.getByRole('button', { name: 'Sign out' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(1);
});
