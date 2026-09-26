import { expect, test } from '@playwright/test';
import { deleteTestUser, ensureTestUser, signInAsTestUser } from '../supabaseTestHelper';

// Real integration coverage of the gate beyond authGate.spec.ts's pure-logic
// unit tests — exercises the actual hooks.server.ts, a real session, and a
// real profiles row.

test('a pending user is redirected to /pending with pending copy', async ({
	page,
	context,
	baseURL
}) => {
	const email = `e2e-pending-gate-${Date.now()}@example.com`;
	const id = await ensureTestUser({
		email,
		password: 'TestPassword123!',
		status: 'pending',
		role: 'member'
	});
	try {
		await signInAsTestUser(context, baseURL!, email, 'TestPassword123!');
		await page.goto('/calendar');
		await expect(page).toHaveURL(/\/pending$/);
		await expect(page.getByRole('heading', { name: 'Awaiting approval' })).toBeVisible();
	} finally {
		await deleteTestUser(id);
	}
});

test('a rejected user is redirected to /pending with rejected copy', async ({
	page,
	context,
	baseURL
}) => {
	const email = `e2e-rejected-gate-${Date.now()}@example.com`;
	const id = await ensureTestUser({
		email,
		password: 'TestPassword123!',
		status: 'rejected',
		role: 'member'
	});
	try {
		await signInAsTestUser(context, baseURL!, email, 'TestPassword123!');
		await page.goto('/');
		await expect(page).toHaveURL(/\/pending$/);
		await expect(page.getByRole('heading', { name: 'Access not approved' })).toBeVisible();
	} finally {
		await deleteTestUser(id);
	}
});

test('an approved non-admin is redirected away from /admin/*', async ({
	page,
	context,
	baseURL
}) => {
	const email = `e2e-nonadmin-gate-${Date.now()}@example.com`;
	const id = await ensureTestUser({
		email,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'member'
	});
	try {
		await signInAsTestUser(context, baseURL!, email, 'TestPassword123!');
		for (const route of ['/admin', '/admin/accounts', '/admin/events', '/admin/notifications']) {
			await page.goto(route);
			await expect(page).toHaveURL(/\/$/);
		}
	} finally {
		await deleteTestUser(id);
	}
});

test('sign-out ends the session', async ({ page, context, baseURL }) => {
	const email = `e2e-signout-${Date.now()}@example.com`;
	const id = await ensureTestUser({
		email,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'member'
	});
	try {
		await signInAsTestUser(context, baseURL!, email, 'TestPassword123!');
		await page.goto('/');
		await page.getByRole('button', { name: 'Sign out' }).click();
		await expect(page).toHaveURL(/\/login$/);

		await page.goto('/calendar');
		await expect(page).toHaveURL(/\/login$/);
	} finally {
		await deleteTestUser(id);
	}
});
