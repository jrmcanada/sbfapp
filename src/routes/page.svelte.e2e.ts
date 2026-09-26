import { expect, test } from '@playwright/test';
import { deleteTestUser, ensureTestUser, signInAsTestUser } from './supabaseTestHelper';

// The Send Notification card is admin-only: it must not merely be hidden,
// it must not be in the page at all for anyone else.

test('an admin sees Send Notification, below the Notifications card', async ({
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

		const send = page.getByRole('link', { name: /Send Notification/ });
		await expect(send).toBeVisible();
		await expect(send).toHaveAttribute('href', '/admin/notifications');

		const notificationsBox = await page
			.getByRole('button', { name: /Notifications/ })
			.first()
			.boundingBox();
		const sendBox = await send.boundingBox();
		expect(sendBox!.y).toBeGreaterThan(notificationsBox!.y);
	} finally {
		await deleteTestUser(id);
	}
});

test('a regular member is not shown Send Notification at all', async ({
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
		await expect(page.getByText('Send Notification')).toHaveCount(0);
	} finally {
		await deleteTestUser(id);
	}
});
