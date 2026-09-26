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
let seededIds: string[] = [];
let testUserId: string;
const testEmail = `e2e-calendar-${Date.now()}@example.com`;

test.beforeAll(async () => {
	seededIds = await insertTestEvents([
		{ title: multiDayTitle, description: null, start_date: '2026-09-10', end_date: '2026-09-12' },
		{
			title: singleDayTitle,
			description: 'Come celebrate',
			start_date: '2026-09-15',
			end_date: '2026-09-15'
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
