import { expect, test } from '@playwright/test';

// Real Google sign-in can't be automated here (Google actively resists
// automated OAuth, and it'd need real throwaway credentials) — see
// docs/specs/04a-accounts-auth/spec.md's Testing approach. The full rule
// set for what happens once signed in is covered by authGate.spec.ts
// instead; these only cover what's reachable without a session.

test('/login renders without redirecting', async ({ page }) => {
	await page.goto('/login');
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
});

for (const route of [
	'/',
	'/website',
	'/calendar',
	'/messages',
	'/admin/events',
	'/admin/accounts'
]) {
	test(`anonymous visit to ${route} redirects to /login`, async ({ page }) => {
		await page.goto(route);
		await expect(page).toHaveURL(/\/login$/);
	});
}
