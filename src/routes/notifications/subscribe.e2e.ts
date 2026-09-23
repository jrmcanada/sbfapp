import { expect, test } from '@playwright/test';
import { deleteTestUser, ensureTestUser, signInAsTestUser } from '../supabaseTestHelper';

// push_subscriptions rows created here are cleaned up automatically:
// deleteTestUser cascades through profiles to push_subscriptions.

let testUserId: string;
const testEmail = `e2e-subscribe-${Date.now()}@example.com`;

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

test('a signed-in user can subscribe and then unsubscribe', async ({ page }) => {
	const endpoint = `https://push.example/${Date.now()}`;

	const subscribeRes = await page.request.post('/notifications/subscribe', {
		data: { endpoint, keys: { p256dh: 'fake-p256dh', auth: 'fake-auth' } }
	});
	expect(subscribeRes.ok()).toBe(true);

	const unsubscribeRes = await page.request.post('/notifications/unsubscribe', {
		data: { endpoint }
	});
	expect(unsubscribeRes.ok()).toBe(true);
});

test('rejects a malformed subscription', async ({ page }) => {
	const res = await page.request.post('/notifications/subscribe', {
		data: { endpoint: 'https://push.example/bad' } // missing keys
	});
	expect(res.status()).toBe(400);
});

test('an anonymous request never reaches the route at all', async ({ browser, baseURL }) => {
	// hooks.server.ts's gate (Phase 4a) redirects before any handler runs —
	// this route's own `if (!user)` check is defense in depth, not what an
	// anonymous caller actually hits.
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto(baseURL!);

	const res = await page.request.post('/notifications/subscribe', {
		data: { endpoint: 'https://push.example/anon', keys: { p256dh: 'x', auth: 'y' } },
		maxRedirects: 0
	});
	expect(res.status()).toBe(303);
	expect(res.headers()['location']).toBe('/login');
	await context.close();
});
