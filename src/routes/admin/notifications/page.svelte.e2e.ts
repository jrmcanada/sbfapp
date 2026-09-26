import { expect, test } from '@playwright/test';
import {
	deleteNotificationsByCreator,
	deleteTestUser,
	ensureTestUser,
	insertTestNotification,
	signInAsTestUser
} from '../../supabaseTestHelper';

// No test here actually submits the compose form. It used to (asserting
// "Sent to 0 devices"), on the assumption that the shared project would
// have zero real push_subscriptions. That assumption broke the moment a
// real person subscribed for real: with real subscriptions in the same
// database, submitting calls the real web-push send path and delivers a
// real notification to real devices — this happened once, unnoticed,
// during a routine test run once real subscriptions existed. There's no
// way to intercept it (same server-side-only limitation as Phase 2/4a's
// Supabase calls), so the only safe fix is to never submit for real here.
// The send/cleanup logic itself is unit-tested with a mocked sender in
// pushSend.spec.ts.

let adminId: string;
const adminEmail = `e2e-admin-notifications-${Date.now()}@example.com`;

test.beforeAll(async () => {
	adminId = await ensureTestUser({
		email: adminEmail,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'admin'
	});
});

test.afterAll(async () => {
	// notifications.created_by is ON DELETE RESTRICT, so history rows go first.
	await deleteNotificationsByCreator(adminId);
	await deleteTestUser(adminId);
});

test.beforeEach(async ({ context, baseURL }) => {
	await signInAsTestUser(context, baseURL!, adminEmail, 'TestPassword123!');
});

test('the compose form renders with both fields required', async ({ page }) => {
	await page.goto('/admin/notifications');
	await expect(page.getByRole('heading', { name: 'Send a notification' })).toBeVisible();
	await expect(page.getByLabel('Title')).toHaveAttribute('required', '');
	await expect(page.getByLabel('Message')).toHaveAttribute('required', '');
	await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled();
});

test('history lists what has been sent, newest first, with who sent it', async ({ page }) => {
	// Rows are inserted directly — history is a read, so nothing is pushed.
	const stamp = Date.now();
	await insertTestNotification(adminId, `E2E first ${stamp}`, 'older message');
	await insertTestNotification(adminId, `E2E second ${stamp}`, 'newer message');

	await page.goto('/admin/notifications');
	await page.getByText(/^History/).click();

	const items = page.locator('.history-item').filter({ hasText: `${stamp}` });
	await expect(items).toHaveCount(2);
	await expect(items.nth(0)).toContainText(`E2E second ${stamp}`);
	await expect(items.nth(0)).toContainText('newer message');
	await expect(items.nth(0)).toContainText(adminEmail);
	await expect(items.nth(1)).toContainText(`E2E first ${stamp}`);
});
