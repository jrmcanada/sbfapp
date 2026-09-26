import { devices, expect, test } from '@playwright/test';
import { deleteTestUser, ensureTestUser, signInAsTestUser } from '../supabaseTestHelper';

// The notification control's iOS-vs-button branching depends on real
// device signals (UA, touch points, standalone-display-mode) that only
// exist in a real browser — see src/lib/platform.ts's own unit tests for
// the pure logic. These confirm the UI actually wires that logic up.

let testUserId: string;
const testEmail = `e2e-notif-control-${Date.now()}@example.com`;

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

test('an iPhone not on the Home Screen sees the install explainer, not a button', async ({
	browser,
	baseURL
}) => {
	const context = await browser.newContext({ ...devices['iPhone 14'] });
	await signInAsTestUser(context, baseURL!, testEmail, 'TestPassword123!');
	const page = await context.newPage();

	await page.goto('/');
	await expect(page.getByText('Add to Home Screen')).toBeVisible();
	await expect(page.getByRole('button', { name: /notifications/i })).toBeDisabled();

	await context.close();
});

test('an iPhone already on the Home Screen sees the button, not the explainer', async ({
	browser,
	baseURL
}) => {
	const context = await browser.newContext({ ...devices['iPhone 14'] });
	await signInAsTestUser(context, baseURL!, testEmail, 'TestPassword123!');
	const page = await context.newPage();
	await page.addInitScript(() => {
		Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true });
	});

	await page.goto('/');
	await expect(page.getByRole('button', { name: /notifications/i })).toBeEnabled();
	await expect(page.getByText('Add to Home Screen')).toHaveCount(0);

	await context.close();
});

test('a desktop browser sees the button directly, no iOS explainer', async ({
	page,
	context,
	baseURL
}) => {
	await signInAsTestUser(context, baseURL!, testEmail, 'TestPassword123!');
	await page.goto('/');
	await expect(page.getByRole('button', { name: /notifications/i })).toBeEnabled();
});
