import { expect, test } from '@playwright/test';
import { deleteTestUser, ensureTestUser, signInAsTestUser } from '../supabaseTestHelper';

let adminId: string;
const adminEmail = `e2e-admin-menu-${Date.now()}@example.com`;

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

test('the admin menu offers Accounts, Events and Notifications', async ({ page }) => {
	await page.goto('/admin');
	await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();

	await expect(page.getByRole('link', { name: /Accounts/ })).toHaveAttribute(
		'href',
		'/admin/accounts'
	);
	await expect(page.getByRole('link', { name: /Events/ })).toHaveAttribute('href', '/admin/events');
	await expect(page.getByRole('link', { name: /Notifications/ })).toHaveAttribute(
		'href',
		'/admin/notifications'
	);
});

const screens = [
	{ path: '/admin/accounts', own: 'Accounts', others: ['Events', 'Notifications'] },
	{ path: '/admin/events', own: 'Events', others: ['Accounts', 'Notifications'] },
	{ path: '/admin/notifications', own: 'Notifications', others: ['Accounts', 'Events'] }
];

for (const { path, own, others } of screens) {
	test(`${path} has header links to Home and the other two admin screens`, async ({ page }) => {
		await page.goto(path);
		const header = page.locator('.toolbar');

		await expect(header.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
		for (const name of others) {
			await expect(header.getByRole('link', { name })).toBeVisible();
		}
		await expect(header.getByRole('link', { name: own })).toHaveCount(0);
	});
}

for (const path of ['/admin', '/admin/accounts', '/admin/events', '/admin/notifications']) {
	test(`${path} shows the same app header as the other screens`, async ({ page }) => {
		await page.goto(path);

		const band = page.locator('header.band');
		await expect(band).toContainText('SBF');
		await expect(band).toContainText(adminEmail);
		await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(1);
		// The old plain grey bar shouldn't render alongside the new header.
		await expect(page.locator('.session-bar')).toHaveCount(0);
	});
}
