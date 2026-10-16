import { expect, test } from '@playwright/test';
import { deleteTestUser, ensureTestUser, signInAsTestUser } from './supabaseTestHelper';

// The Admin card is admin-only: it must not merely be hidden, it must not
// be in the page at all for anyone else. Send Notification now lives on
// /notifications (see notifications/page.svelte.e2e.ts), not Home.

test('an admin sees Admin below the Notifications card, and no Send Notification', async ({
	page,
	context,
	baseURL
}) => {
	const email = `e2e-home-admin-${Date.now()}@example.com`;
	const id = await ensureTestUser({
		email,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'admin'
	});
	try {
		await signInAsTestUser(context, baseURL!, email, 'TestPassword123!');
		await page.goto('/');

		const admin = page.getByRole('link', { name: /^Admin/ });
		await expect(admin).toBeVisible();
		await expect(admin).toHaveAttribute('href', '/admin');

		await expect(page.getByText('Send Notification')).toHaveCount(0);

		const notificationsBox = await page
			.getByRole('link', { name: /^Notifications/ })
			.first()
			.boundingBox();
		const adminBox = await admin.boundingBox();
		expect(adminBox!.y).toBeGreaterThan(notificationsBox!.y);
	} finally {
		await deleteTestUser(id);
	}
});

test('a regular member is not shown Admin or Send Notification at all', async ({
	page,
	context,
	baseURL
}) => {
	const email = `e2e-home-member-${Date.now()}@example.com`;
	const id = await ensureTestUser({
		email,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'member'
	});
	try {
		await signInAsTestUser(context, baseURL!, email, 'TestPassword123!');
		await page.goto('/');

		await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
		await expect(page.getByRole('link', { name: /^Admin/ })).toHaveCount(0);
		await expect(page.getByText('Send Notification')).toHaveCount(0);
	} finally {
		await deleteTestUser(id);
	}
});
