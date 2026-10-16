import { expect, test } from '@playwright/test';
import {
	deleteNotificationsByCreator,
	deleteTestUser,
	ensureTestUser,
	insertTestNotification,
	signInAsTestUser
} from '../supabaseTestHelper';

// The history reads the real notifications table, so these tests look for
// their own uniquely titled rows rather than asserting on the whole list.

let senderId: string;
let memberId: string;
const stamp = Date.now();
const senderName = `E2E Sender ${stamp}`;
const memberEmail = `e2e-notif-history-${stamp}@example.com`;
const recentTitle = `Recent notice ${stamp}`;
const olderTitle = `Older notice ${stamp}`;
const oldTitle = `Old notice ${stamp}`;

test.beforeAll(async () => {
	senderId = await ensureTestUser({
		email: `e2e-notif-sender-${stamp}@example.com`,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'admin',
		displayName: senderName
	});
	memberId = await ensureTestUser({
		email: memberEmail,
		password: 'TestPassword123!',
		status: 'approved',
		role: 'member'
	});

	const day = 24 * 60 * 60 * 1000;
	await insertTestNotification(
		senderId,
		olderTitle,
		'Sent 10 days ago',
		new Date(stamp - 10 * day)
	);
	await insertTestNotification(senderId, recentTitle, 'Sent just now');
	await insertTestNotification(senderId, oldTitle, 'Sent 31 days ago', new Date(stamp - 31 * day));
});

test.afterAll(async () => {
	await deleteNotificationsByCreator(senderId);
	await deleteTestUser(memberId);
	await deleteTestUser(senderId);
});

test.beforeEach(async ({ context, baseURL }) => {
	await signInAsTestUser(context, baseURL!, memberEmail, 'TestPassword123!');
});

test('the Home card links to the notifications page', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: /^Notifications/ }).click();
	await expect(page).toHaveURL('/notifications');
	await expect(page.getByRole('heading', { name: 'Notifications', level: 1 })).toBeVisible();
});

test('lists the last 30 days, newest first, without the sender', async ({ page }) => {
	await page.goto('/notifications');

	const recent = page.getByText(recentTitle);
	const older = page.getByText(olderTitle);
	await expect(recent).toBeVisible();
	await expect(older).toBeVisible();
	await expect(page.getByText('Sent just now')).toBeVisible();

	const recentBox = await recent.boundingBox();
	const olderBox = await older.boundingBox();
	expect(olderBox!.y).toBeGreaterThan(recentBox!.y);

	await expect(page.getByText(oldTitle)).toHaveCount(0);
	await expect(page.getByText(senderName)).toHaveCount(0);
});

test('the page has the on/off control', async ({ page }) => {
	await page.goto('/notifications');
	await expect(page.getByRole('button', { name: /notifications/i })).toBeEnabled();
});
