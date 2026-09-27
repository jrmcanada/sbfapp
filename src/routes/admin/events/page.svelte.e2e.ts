import { expect, test } from '@playwright/test';
import {
	deleteTestEvents,
	deleteTestUser,
	ensureTestUser,
	findEventIdsByTitle,
	insertTestEvents,
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

test('the upload page loads with a visible Browse button and Upload disabled until a file is chosen', async ({
	page
}) => {
	await page.goto('/admin/events');
	await expect(page.getByRole('heading', { name: 'Upload events' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Browse' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Upload' })).toBeDisabled();
	await expect(page.getByText('No file chosen')).toBeVisible();

	await page.setInputFiles('input[type=file]', {
		name: 'events.txt',
		mimeType: 'text/plain',
		buffer: Buffer.from('2026-12-25 | x\n')
	});
	await expect(page.getByText('events.txt')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Upload' })).toBeEnabled();
});

// Seeded directly (never through the upload form) with titles unique to
// this run, and removed in a finally.
const upcomingTitle = `E2E upcoming ${Date.now()}`;
const pastTitle = `E2E past ${Date.now()}`;

test('events are listed as upcoming or past', async ({ page }) => {
	const ids = await insertTestEvents([
		{ title: upcomingTitle, start_date: '2099-01-01', end_date: '2099-01-02' },
		{ title: pastTitle, start_date: '2001-01-01', end_date: '2001-01-01' }
	]);
	try {
		await page.goto('/admin/events');
		const upcoming = page.locator('.event').filter({ hasText: upcomingTitle });
		await expect(upcoming).toBeVisible();
		await expect(upcoming).toContainText('Jan 1, 2099 – Jan 2, 2099');

		// The past one is inside the collapsed "Past events" section.
		await expect(page.locator('.past .event').filter({ hasText: pastTitle })).toBeAttached();
		await expect(page.locator('.past').getByText(upcomingTitle)).toHaveCount(0);
	} finally {
		await deleteTestEvents(ids);
	}
});

test('an admin can delete an event after confirming', async ({ page }) => {
	const ids = await insertTestEvents([
		{ title: upcomingTitle, start_date: '2099-01-01', end_date: '2099-01-01' }
	]);
	try {
		await page.goto('/admin/events');
		const row = page.locator('.event').filter({ hasText: upcomingTitle });
		await row.getByRole('button', { name: 'Delete' }).click();
		// The first click only asks; nothing is deleted yet.
		expect(await findEventIdsByTitle(upcomingTitle)).toHaveLength(1);
		await row.getByRole('button', { name: 'Confirm delete' }).click();

		await expect(page.locator('.event').filter({ hasText: upcomingTitle })).toHaveCount(0);
		expect(await findEventIdsByTitle(upcomingTitle)).toEqual([]);
	} finally {
		await deleteTestEvents(ids);
	}
});

test('cancelling a delete keeps the event', async ({ page }) => {
	const ids = await insertTestEvents([
		{ title: upcomingTitle, start_date: '2099-01-01', end_date: '2099-01-01' }
	]);
	try {
		await page.goto('/admin/events');
		const row = page.locator('.event').filter({ hasText: upcomingTitle });
		await row.getByRole('button', { name: 'Delete' }).click();
		await row.getByRole('button', { name: 'Cancel' }).click();

		await expect(row.getByRole('button', { name: 'Delete' })).toBeVisible();
		expect(await findEventIdsByTitle(upcomingTitle)).toHaveLength(1);
	} finally {
		await deleteTestEvents(ids);
	}
});
