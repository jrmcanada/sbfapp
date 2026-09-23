import { expect, test } from '@playwright/test';
import { deleteTestUser, ensureTestUser, signInAsTestUser } from '../../supabaseTestHelper';

// Exercises the real approve/reject flow end to end: a real pending
// account, a real admin session, a real RLS-checked update. See
// docs/specs/04a-accounts-auth/spec.md's Testing approach for why real
// sign-in (not mocking) is used throughout this phase's e2e tests.
//
// Test users made via the admin API have no full_name metadata, so the
// new_user trigger falls back to email as display_name — rows can be
// located by the test's own email text.

let adminId: string;
const adminEmail = `e2e-admin-accounts-${Date.now()}@example.com`;

test.beforeAll(async () => {
	adminId = await ensureTestUser({
		email: adminEmail,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'admin'
	});
});

test.afterAll(async () => {
	await deleteTestUser(adminId);
});

test.beforeEach(async ({ context, baseURL }) => {
	await signInAsTestUser(context, baseURL!, adminEmail, 'TestPassword123!');
});

test('an admin can approve a pending account', async ({ page }) => {
	const email = `e2e-approve-me-${Date.now()}@example.com`;
	const id = await ensureTestUser({
		email,
		password: 'TestPassword123!',
		status: 'pending',
		role: 'member'
	});
	try {
		await page.goto('/admin/accounts');
		const row = page.locator('.account').filter({ hasText: email });
		await expect(row).toBeVisible();
		await row.getByRole('button', { name: 'Approve' }).click();

		await expect(page.locator('.account').filter({ hasText: email })).toContainText('approved');
	} finally {
		await deleteTestUser(id);
	}
});

test('an admin can reject a pending account', async ({ page }) => {
	const email = `e2e-reject-me-${Date.now()}@example.com`;
	const id = await ensureTestUser({
		email,
		password: 'TestPassword123!',
		status: 'pending',
		role: 'member'
	});
	try {
		await page.goto('/admin/accounts');
		const row = page.locator('.account').filter({ hasText: email });
		await expect(row).toBeVisible();
		await row.getByRole('button', { name: 'Reject' }).click();

		await expect(page.locator('.account').filter({ hasText: email })).toContainText('rejected');
	} finally {
		await deleteTestUser(id);
	}
});
