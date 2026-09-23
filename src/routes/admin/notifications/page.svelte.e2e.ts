import { expect, test } from '@playwright/test';
import {
	deleteNotificationsByCreator,
	deleteTestUser,
	ensureTestUser,
	signInAsTestUser
} from '../../supabaseTestHelper';

// Real push delivery can't be automated (same constraint as Phase 4a's
// Google sign-in — needs a genuine push-service round trip). With zero
// real subscriptions seeded, "sent to 0" is the honest, actually-testable
// outcome; the send/cleanup logic itself is unit-tested in pushSend.spec.ts.

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
	// notifications.created_by is ON DELETE RESTRICT (audit trail) — the
	// notification this admin sent must go first, or deleteTestUser throws.
	await deleteNotificationsByCreator(adminId);
	await deleteTestUser(adminId);
});

test.beforeEach(async ({ context, baseURL }) => {
	await signInAsTestUser(context, baseURL!, adminEmail, 'TestPassword123!');
});

test('an admin can compose and send a notification', async ({ page }) => {
	await page.goto('/admin/notifications');
	await page.getByLabel('Title').fill('E2E Test Notification');
	await page.getByLabel('Message').fill('This is a test.');
	await page.getByRole('button', { name: 'Send' }).click();

	await expect(page.getByRole('status')).toHaveText('Sent to 0 devices.');
});

test('title and message are required', async ({ page }) => {
	await page.goto('/admin/notifications');
	await expect(page.getByLabel('Title')).toHaveAttribute('required', '');
	await expect(page.getByLabel('Message')).toHaveAttribute('required', '');
});
