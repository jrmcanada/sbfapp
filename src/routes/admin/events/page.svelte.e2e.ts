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

test('a well-formed file with a time uploads successfully', async ({ page }) => {
	await page.goto('/admin/events');
	await page.setInputFiles('input[type=file]', {
		name: 'events.txt',
		mimeType: 'text/plain',
		buffer: Buffer.from(`2026-12-25 | 09:30 | ${title} | Come celebrate\n`)
	});
	await page.getByRole('button', { name: 'Upload' }).click();

	await expect(page.getByRole('status')).toHaveText('Added 1 event.');
	await expect(page.locator('.event').filter({ hasText: title })).toContainText('9:30 AM');
});

test('a well-formed file with a blank time uploads with no fixed time', async ({ page }) => {
	await page.goto('/admin/events');
	await page.setInputFiles('input[type=file]', {
		name: 'events.txt',
		mimeType: 'text/plain',
		buffer: Buffer.from(`2026-12-25 | | ${title}\n`)
	});
	await page.getByRole('button', { name: 'Upload' }).click();

	await expect(page.getByRole('status')).toHaveText('Added 1 event.');
	const row = page.locator('.event').filter({ hasText: title });
	await expect(row).not.toContainText('AM');
	await expect(row).not.toContainText('PM');
});

test('a malformed file is rejected, nothing added', async ({ page }) => {
	await page.goto('/admin/events');
	await page.setInputFiles('input[type=file]', {
		name: 'events.txt',
		mimeType: 'text/plain',
		buffer: Buffer.from(`not-a-date | | ${title}\n`)
	});
	await page.getByRole('button', { name: 'Upload' }).click();

	await expect(page.getByRole('alert')).toContainText('Line 1');
	expect(await findEventIdsByTitle(title)).toEqual([]);
});

test('an invalid (non-24-hour) time is rejected, nothing added', async ({ page }) => {
	await page.goto('/admin/events');
	await page.setInputFiles('input[type=file]', {
		name: 'events.txt',
		mimeType: 'text/plain',
		buffer: Buffer.from(`2026-12-25 | 9:30pm | ${title}\n`)
	});
	await page.getByRole('button', { name: 'Upload' }).click();

	await expect(page.getByRole('alert')).toContainText('invalid time');
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
		buffer: Buffer.from('2026-12-25 | | x\n')
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
		// The start date is the day heading above the row; the row itself only
		// adds what the heading doesn't say — here, the end date.
		await expect(page.getByRole('heading', { name: /Jan 1, 2099/ })).toBeVisible();
		await expect(upcoming).toContainText('– Jan 2, 2099');

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

test('an admin can edit every field of an event', async ({ page }) => {
	const originalTitle = `E2E edit-me ${Date.now()}`;
	const newTitle = `E2E edited ${Date.now()}`;
	const ids = await insertTestEvents([
		{
			title: originalTitle,
			description: 'original description',
			start_date: '2099-02-01',
			end_date: '2099-02-01',
			start_time: '09:00'
		}
	]);
	try {
		await page.goto('/admin/events');
		const row = page.locator('.event').filter({ hasText: originalTitle });
		await row.getByRole('button', { name: 'Edit' }).click();

		// Once in edit mode, the title moves from visible text into an
		// <input>'s value, which `hasText` can't see — so from here on,
		// locate the editing row by its form instead of by title text.
		const editForm = page.locator('.event').filter({ has: page.locator('form.edit-form') });

		// Prefilled with the current values.
		await expect(editForm.locator('input[name="start_date"]')).toHaveValue('2099-02-01');
		await expect(editForm.locator('input[name="start_time"]')).toHaveValue('09:00');
		await expect(editForm.locator('input[name="title"]')).toHaveValue(originalTitle);

		await editForm.locator('input[name="start_time"]').fill('14:45');
		await editForm.locator('input[name="title"]').fill(newTitle);
		await editForm.locator('textarea[name="description"]').fill('updated description');
		await editForm.getByRole('button', { name: 'Save' }).click();

		const updatedRow = page.locator('.event').filter({ hasText: newTitle });
		await expect(updatedRow).toContainText('2:45 PM');
		await expect(page.locator('.event').filter({ hasText: originalTitle })).toHaveCount(0);
	} finally {
		await deleteTestEvents(await findEventIdsByTitle(newTitle));
		await deleteTestEvents(ids);
	}
});

test('an invalid edit is rejected and the event is unchanged', async ({ page }) => {
	const ids = await insertTestEvents([
		{ title: upcomingTitle, start_date: '2099-03-01', end_date: '2099-03-01' }
	]);
	try {
		await page.goto('/admin/events');
		const row = page.locator('.event').filter({ hasText: upcomingTitle });
		await row.getByRole('button', { name: 'Edit' }).click();

		const editForm = page.locator('.event').filter({ has: page.locator('form.edit-form') });
		// A whitespace-only title passes the input's native `required` check
		// (non-empty), so this actually exercises the server-side trim() check.
		await editForm.locator('input[name="title"]').fill('   ');
		await editForm.getByRole('button', { name: 'Save' }).click();

		await expect(editForm.getByRole('alert')).toContainText('Title is required');
		expect(await findEventIdsByTitle(upcomingTitle)).toHaveLength(1);
	} finally {
		await deleteTestEvents(ids);
	}
});

test('cancelling an edit keeps the event unchanged', async ({ page }) => {
	const ids = await insertTestEvents([
		{ title: upcomingTitle, start_date: '2099-01-01', end_date: '2099-01-01' }
	]);
	try {
		await page.goto('/admin/events');
		const row = page.locator('.event').filter({ hasText: upcomingTitle });
		await row.getByRole('button', { name: 'Edit' }).click();

		const editForm = page.locator('.event').filter({ has: page.locator('form.edit-form') });
		await editForm.locator('input[name="title"]').fill('this should not be saved');
		await editForm.getByRole('button', { name: 'Cancel' }).click();

		await expect(page.locator('.event').filter({ hasText: upcomingTitle })).toBeVisible();
		await expect(page.getByText('this should not be saved')).toHaveCount(0);
	} finally {
		await deleteTestEvents(ids);
	}
});

test('same-day events are grouped under one heading, chronologically', async ({ page }) => {
	const stamp = Date.now();
	const morning = `E2E morning ${stamp}`;
	const evening = `E2E evening ${stamp}`;
	const otherDay = `E2E other day ${stamp}`;
	const ids = await insertTestEvents([
		{ title: evening, start_date: '2099-04-01', end_date: '2099-04-01', start_time: '19:00' },
		{ title: morning, start_date: '2099-04-01', end_date: '2099-04-01', start_time: '09:00' },
		{ title: otherDay, start_date: '2099-04-02', end_date: '2099-04-02', start_time: null }
	]);
	try {
		await page.goto('/admin/events');

		const heading = page.getByRole('heading', { name: /Apr 1, 2099/ });
		await expect(heading).toBeVisible();
		// Everything between this heading and the next one belongs to that day.
		const day1 = heading.locator('xpath=following-sibling::ul[1]');
		const rowTitles = await day1.locator('.title').allTextContents();
		expect(rowTitles).toEqual([morning, evening]);

		await expect(page.getByRole('heading', { name: /Apr 2, 2099/ })).toBeVisible();
	} finally {
		await deleteTestEvents(ids);
	}
});

test('an admin can add a single event through the form', async ({ page }) => {
	const newTitle = `E2E added ${Date.now()}`;
	try {
		await page.goto('/admin/events');
		await page.getByRole('button', { name: 'Add event' }).click();

		const addForm = page.locator('form.add-form');
		await addForm.locator('input[name="start_date"]').fill('2099-05-10');
		await addForm.locator('input[name="end_date"]').fill('2099-05-10');
		await addForm.locator('input[name="start_time"]').fill('10:00');
		await addForm.locator('input[name="title"]').fill(newTitle);
		await addForm.locator('textarea[name="description"]').fill('added via the form');
		await addForm.getByRole('button', { name: 'Add event' }).click();

		const row = page.locator('.event').filter({ hasText: newTitle });
		await expect(row).toBeVisible();
		await expect(row).toContainText('10:00 AM');
		await expect(page.getByRole('heading', { name: /May 10, 2099/ })).toBeVisible();
		await expect(page.locator('form.add-form')).toHaveCount(0);
	} finally {
		await deleteTestEvents(await findEventIdsByTitle(newTitle));
	}
});

test('an invalid add is rejected and nothing is created', async ({ page }) => {
	await page.goto('/admin/events');
	await page.getByRole('button', { name: 'Add event' }).click();

	const addForm = page.locator('form.add-form');
	// A native time input can't hold a malformed value at all — a
	// whitespace-only title is what's actually reachable through this UI
	// (it passes the native `required` check but not the server's trim()).
	await addForm.locator('input[name="title"]').fill('   ');
	await addForm.getByRole('button', { name: 'Add event' }).click();

	await expect(addForm.getByRole('alert')).toContainText('Title is required');
});

test('cancelling Add event discards the form', async ({ page }) => {
	await page.goto('/admin/events');
	await page.getByRole('button', { name: 'Add event' }).click();
	await expect(page.locator('form.add-form')).toBeVisible();

	await page.locator('form.add-form').getByRole('button', { name: 'Cancel' }).click();
	await expect(page.locator('form.add-form')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Add event' })).toBeVisible();
});
