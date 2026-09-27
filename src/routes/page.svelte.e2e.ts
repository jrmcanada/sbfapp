import { expect, test } from '@playwright/test';
import { deleteTestUser, ensureTestUser, signInAsTestUser } from './supabaseTestHelper';

// The Admin and Send Notification cards are admin-only: they must not
// merely be hidden, they must not be in the page at all for anyone else.

test('an admin sees Admin and Send Notification, below the Notifications card', async ({
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

		const send = page.getByRole('link', { name: /Send Notification/ });
		await expect(send).toBeVisible();
		await expect(send).toHaveAttribute('href', '/admin/notifications');

		const notificationsBox = await page
			.getByRole('button', { name: /Notifications/ })
			.first()
			.boundingBox();
		const adminBox = await admin.boundingBox();
		const sendBox = await send.boundingBox();
		expect(adminBox!.y).toBeGreaterThan(notificationsBox!.y);
		expect(sendBox!.y).toBeGreaterThan(adminBox!.y);
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
