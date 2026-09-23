import { expect, test } from '@playwright/test';
import {
	deleteTestEvents,
	deleteTestUser,
	ensureTestUser,
	findEventIdsByTitle,
	signInAsTestUser
} from '../../supabaseTestHelper';

// The upload action writes via the server-only secret-key client during SSR,
// which Playwright's page.route() cannot intercept (it only sees requests
// the browser makes). So this test hits the real project for real, using a
// title unique to this run, and deletes what it inserted afterward.
//
// /admin/* now requires an approved admin account (Phase 4a) — sign in as
// a real admin test user first. See supabaseTestHelper.ts.

const title = `E2E admin upload ${Date.now()}`;
let testUserId: string;
const testEmail = `e2e-admin-events-${Date.now()}@example.com`;

test.beforeAll(async () => {
	testUserId = await ensureTestUser({
		email: testEmail,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'admin'
	});
});

test.afterAll(async () => {
	await deleteTestUser(testUserId);
});

test.beforeEach(async ({ context, baseURL }) => {
	await signInAsTestUser(context, baseURL!, testEmail, 'TestPassword123!');
});

test.afterEach(async () => {
	const ids = await findEventIdsByTitle(title);
	await deleteTestEvents(ids);
});

test('a well-formed file uploads successfully', async ({ page }) => {
	await page.goto('/admin/events');
	await page.setInputFiles('input[type=file]', {
		name: 'events.txt',
		mimeType: 'text/plain',
		buffer: Buffer.from(`2026-12-25 | ${title} | Come celebrate\n`)
	});
	await page.getByRole('button', { name: 'Upload' }).click();

	await expect(page.getByRole('status')).toHaveText('Added 1 event.');
});

test('a malformed file is rejected, nothing added', async ({ page }) => {
	await page.goto('/admin/events');
	await page.setInputFiles('input[type=file]', {
		name: 'events.txt',
		mimeType: 'text/plain',
		buffer: Buffer.from(`not-a-date | ${title}\n`)
	});
	await page.getByRole('button', { name: 'Upload' }).click();

	await expect(page.getByRole('alert')).toContainText('Line 1');
	expect(await findEventIdsByTitle(title)).toEqual([]);
});

test('the upload page loads with its form', async ({ page }) => {
	await page.goto('/admin/events');
	await expect(page.getByRole('heading', { name: 'Upload events' })).toBeVisible();
	await expect(page.locator('input[type=file]')).toBeVisible();
});
