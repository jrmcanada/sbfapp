import { expect, test } from '@playwright/test';
import {
	deleteTestEvents,
	deleteTestUser,
	ensureTestUser,
	insertTestEvents,
	signInAsTestUser
} from '../supabaseTestHelper';

// /calendar reads via a server-side load function, which page.route() can't
// intercept (browser-only). These tests seed real rows with unique,
// run-specific titles and delete them afterward — see supabaseTestHelper.ts.
// Every route now requires an approved account (Phase 4a), so each test
// signs in as a real approved test user first — see signInAsTestUser.

const multiDayTitle = `E2E Youth Conference ${Date.now()}`;
const singleDayTitle = `E2E Christmas Service ${Date.now()}`;
const timedTitle = `E2E Morning Service ${Date.now()}`;
const untimedTitle = `E2E All Day Marker ${Date.now()}`;
let seededIds: string[] = [];
let testUserId: string;
const testEmail = `e2e-calendar-${Date.now()}@example.com`;

test.beforeAll(async () => {
	// Postgres's bulk insert requires every row in one call to share the
	// same set of keys — start_time: null makes that explicit everywhere.
	seededIds = await insertTestEvents([
		{
			title: multiDayTitle,
			description: null,
			start_date: '2026-09-10',
			end_date: '2026-09-12',
			start_time: null
		},
		{
			title: singleDayTitle,
			description: 'Come celebrate',
			start_date: '2026-09-15',
			end_date: '2026-09-15',
			start_time: null
		},
		{
			title: timedTitle,
			description: null,
			start_date: '2026-09-20',
			end_date: '2026-09-20',
			start_time: '11:15'
		},
		{
			title: untimedTitle,
			description: null,
			start_date: '2026-09-20',
			end_date: '2026-09-20',
			start_time: null
		}
	]);
	testUserId = await ensureTestUser({
		email: testEmail,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'member'
	});
});

test.afterAll(async () => {
	await deleteTestEvents(seededIds);
	await deleteTestUser(testUserId);
});

test.beforeEach(async ({ context, baseURL }) => {
	await signInAsTestUser(context, baseURL!, testEmail, 'TestPassword123!');
});

test('home links to the calendar', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'Calendar' }).click();
	await expect(page).toHaveURL(/\/calendar/);
});

test('a multi-day event spans every day it covers', async ({ page }) => {
	await page.goto('/calendar?month=2026-09');

	for (const day of ['10', '11', '12']) {
		const cell = page.locator('.day').filter({
			has: page.locator('.day-number', { hasText: new RegExp(`^${day}$`) })
		});
		await expect(cell).toContainText(multiDayTitle);
	}
});

test('clicking a day shows its event description', async ({ page }) => {
	await page.goto('/calendar?month=2026-09');
	await page.getByRole('button', { name: new RegExp(singleDayTitle) }).click();
	await expect(page.getByText('Come celebrate')).toBeVisible();
});

test('shows the time in AM/PM before the title in the day-detail view, but not on the grid', async ({
	page
}) => {
	await page.goto('/calendar?month=2026-09');

	const cell = page.getByRole('button', { name: new RegExp(timedTitle) });
	await expect(cell).not.toContainText('AM');
	await expect(cell).not.toContainText('11:15');

	await cell.click();
	await expect(page.getByRole('heading', { name: `11:15 AM - ${timedTitle}` })).toBeVisible();
	await expect(page.getByRole('heading', { name: untimedTitle, exact: true })).toBeVisible();
});

test('next/prev navigation changes the visible month', async ({ page }) => {
	await page.goto('/calendar?month=2026-09');
	await expect(page.getByRole('heading', { name: 'September 2026' })).toBeVisible();

	await page.getByRole('link', { name: 'Next' }).click();
	await expect(page.getByRole('heading', { name: 'October 2026' })).toBeVisible();

	await page.getByRole('link', { name: 'Prev' }).click();
	await expect(page.getByRole('heading', { name: 'September 2026' })).toBeVisible();

	await page.getByRole('link', { name: 'Prev' }).click();
	await expect(page.getByRole('heading', { name: 'August 2026' })).toBeVisible();
});

test('shows the app header, with the name and a single Sign out', async ({ page }) => {
	await page.goto('/calendar');

	const header = page.locator('header.band');
	await expect(header).toContainText('SBF');
	await expect(header).toContainText(testEmail);
	await expect(header.getByRole('button', { name: 'Sign out' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(1);
});
