import { expect, test, type Page } from '@playwright/test';
import {
	deleteNotificationsByCreator,
	deleteTestUser,
	ensureTestUser,
	insertTestNotification,
	insertTestPushSubscription,
	signInAsTestUser
} from '../../supabaseTestHelper';

// Exercises the real Accounts screen end to end: real accounts, a real
// admin session, real RLS-checked updates. See
// docs/specs/04a-accounts-auth/spec.md's Testing approach for why real
// sign-in (not mocking) is used throughout these e2e tests.
//
// Test users are told apart by their (unique) email, which is also their
// display_name unless a test sets one on purpose. Every test user is
// deleted in a `finally`; nothing here ever sends a push notification.

let adminId: string;
const stamp = Date.now();
const adminEmail = `e2e-admin-accounts-${stamp}@example.com`;

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

function section(page: Page, title: string) {
	return page.locator('section', {
		has: page.getByRole('heading', { name: new RegExp(`^${title}`) })
	});
}

async function withTestUser(
	fields: {
		name: string;
		status: 'pending' | 'approved' | 'rejected';
		role: 'member' | 'admin';
		displayName?: string;
	},
	run: (email: string, id: string) => Promise<void>
) {
	const email = `e2e-${fields.name}-${Date.now()}@example.com`;
	const id = await ensureTestUser({
		email,
		password: 'TestPassword123!',
		status: fields.status,
		role: fields.role,
		displayName: fields.displayName
	});
	try {
		await run(email, id);
	} finally {
		await deleteTestUser(id);
	}
}

test('an admin can approve a pending account', async ({ page }) => {
	await withTestUser({ name: 'approve-me', status: 'pending', role: 'member' }, async (email) => {
		await page.goto('/admin/accounts');
		const row = section(page, 'Pending').locator('.account').filter({ hasText: email });
		await row.getByRole('button', { name: 'Approve' }).click();

		await expect(
			section(page, 'Regular').locator('.account').filter({ hasText: email })
		).toBeVisible();
	});
});

test('an admin can reject a pending account', async ({ page }) => {
	await withTestUser({ name: 'reject-me', status: 'pending', role: 'member' }, async (email) => {
		await page.goto('/admin/accounts');
		const row = section(page, 'Pending').locator('.account').filter({ hasText: email });
		await row.getByRole('button', { name: 'Reject' }).click();

		await expect(
			section(page, 'Rejected').locator('.account').filter({ hasText: email })
		).toBeVisible();
	});
});

test('accounts are grouped by type and sorted by name within each group', async ({ page }) => {
	const tag = `${stamp}`;
	const people = [
		{ key: 'g1', role: 'member', displayName: `E2E-${tag} Bravo` },
		{ key: 'g2', role: 'member', displayName: `e2e-${tag} alpha` },
		{ key: 'g3', role: 'admin', displayName: `E2E-${tag} Charlie` }
	] as const;

	const ids: string[] = [];
	try {
		for (const person of people) {
			ids.push(
				await ensureTestUser({
					email: `e2e-${person.key}-${tag}@example.com`,
					password: 'TestPassword123!',
					status: 'approved',
					role: person.role,
					displayName: person.displayName
				})
			);
		}

		await page.goto('/admin/accounts');

		const regularNames = await section(page, 'Regular').locator('.name').allTextContents();
		const mine = regularNames.filter((n) => n.toLowerCase().startsWith(`e2e-${tag}`));
		expect(mine).toEqual([`e2e-${tag} alpha`, `E2E-${tag} Bravo`]);

		await expect(
			section(page, 'Admins')
				.locator('.name')
				.filter({ hasText: `E2E-${tag} Charlie` })
		).toBeVisible();
	} finally {
		await Promise.all(ids.map((id) => deleteTestUser(id)));
	}
});

test('each account shows its email, join date and notification status', async ({ page }) => {
	await withTestUser({ name: 'on', status: 'approved', role: 'member' }, async (onEmail, onId) => {
		await withTestUser({ name: 'off', status: 'approved', role: 'member' }, async (offEmail) => {
			await insertTestPushSubscription(onId);
			await page.goto('/admin/accounts');

			const onRow = page.locator('.account').filter({ hasText: onEmail });
			await expect(onRow).toContainText(onEmail);
			await expect(onRow).toContainText(/Joined [A-Z][a-z]{2} \d{1,2}, \d{4}/);
			await expect(onRow).toContainText('Notifications on · 1 device');

			const offRow = page.locator('.account').filter({ hasText: offEmail });
			await expect(offRow).toContainText('Notifications off');
		});
	});
});

test('an admin can change an account between Regular and Admin', async ({ page }) => {
	await withTestUser({ name: 'promote', status: 'approved', role: 'member' }, async (email) => {
		await page.goto('/admin/accounts');
		await section(page, 'Regular')
			.locator('.account')
			.filter({ hasText: email })
			.getByRole('button', { name: 'Make Admin' })
			.click();

		const adminRow = section(page, 'Admins').locator('.account').filter({ hasText: email });
		await expect(adminRow).toBeVisible();

		await adminRow.getByRole('button', { name: 'Make Regular' }).click();
		await expect(
			section(page, 'Regular').locator('.account').filter({ hasText: email })
		).toBeVisible();
	});
});

test("an admin's own row has no type or delete controls", async ({ page }) => {
	await page.goto('/admin/accounts');
	const ownRow = page.locator('.account').filter({ hasText: adminEmail });
	await expect(ownRow).toContainText('(you)');
	await expect(ownRow.getByRole('button')).toHaveCount(0);
});

test('an admin can delete an account after confirming', async ({ page }) => {
	const email = `e2e-delete-me-${Date.now()}@example.com`;
	const id = await ensureTestUser({
		email,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'member'
	});
	try {
		await page.goto('/admin/accounts');
		const row = page.locator('.account').filter({ hasText: email });
		await row.getByRole('button', { name: 'Delete' }).click();
		// First click only asks; nothing is deleted yet.
		await expect(row.getByRole('button', { name: 'Confirm delete' })).toBeVisible();
		await row.getByRole('button', { name: 'Confirm delete' }).click();

		await expect(page.locator('.account').filter({ hasText: email })).toHaveCount(0);
	} finally {
		// Already deleted by the test itself; this only matters if it failed part-way.
		await deleteTestUser(id).catch(() => {});
	}
});

test('cancelling a delete leaves the account alone', async ({ page }) => {
	await withTestUser({ name: 'keep-me', status: 'approved', role: 'member' }, async (email) => {
		await page.goto('/admin/accounts');
		const row = page.locator('.account').filter({ hasText: email });
		await row.getByRole('button', { name: 'Delete' }).click();
		await row.getByRole('button', { name: 'Cancel' }).click();

		await expect(row.getByRole('button', { name: 'Delete' })).toBeVisible();
	});
});

test('deleting an admin who has sent notifications is refused with an explanation', async ({
	page
}) => {
	const email = `e2e-sender-${Date.now()}@example.com`;
	const id = await ensureTestUser({
		email,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'admin'
	});
	try {
		await insertTestNotification(id, `E2E history ${Date.now()}`, 'never pushed');
		await page.goto('/admin/accounts');
		const row = page.locator('.account').filter({ hasText: email });
		await row.getByRole('button', { name: 'Delete' }).click();
		await row.getByRole('button', { name: 'Confirm delete' }).click();

		await expect(page.getByRole('alert')).toContainText("can't be deleted");
		await expect(page.locator('.account').filter({ hasText: email })).toBeVisible();
	} finally {
		await deleteNotificationsByCreator(id);
		await deleteTestUser(id);
	}
});
