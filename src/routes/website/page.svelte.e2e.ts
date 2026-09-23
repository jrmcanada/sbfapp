import { expect, test } from '@playwright/test';
import { deleteTestUser, ensureTestUser, signInAsTestUser } from '../supabaseTestHelper';

// Every route now requires an approved account (Phase 4a) — sign in as a
// real approved test user first. See supabaseTestHelper.ts.

let testUserId: string;
const testEmail = `e2e-website-${Date.now()}@example.com`;

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

test('home links to the website view', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'View the website' }).click();
	await expect(page).toHaveURL('/website');
});

test('website view embeds sbf.church', async ({ page }) => {
	await page.goto('/website');
	const frame = page.getByTitle('Sudbury Bible Fellowship website');
	await expect(frame).toHaveAttribute('src', 'https://sbf.church/');
});

test('open in browser link targets a new tab', async ({ page }) => {
	await page.goto('/website');
	const link = page.getByRole('link', { name: 'Open in browser' });
	await expect(link).toHaveAttribute('href', 'https://sbf.church/');
	await expect(link).toHaveAttribute('target', '_blank');
	await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});
