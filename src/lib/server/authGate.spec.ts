import { describe, expect, it } from 'vitest';
import { decideRedirect, type GateInput } from './authGate';

const base: GateInput = {
	hasSession: false,
	profileStatus: null,
	isAdmin: false,
	routeId: '/'
};

describe('decideRedirect', () => {
	it('always lets /auth/callback through, regardless of state', () => {
		expect(decideRedirect({ ...base, routeId: '/auth/callback' })).toBeNull();
		expect(
			decideRedirect({
				hasSession: true,
				profileStatus: 'approved',
				isAdmin: false,
				routeId: '/auth/callback'
			})
		).toBeNull();
	});

	it('sends an anonymous visitor to /login for any other route', () => {
		expect(decideRedirect({ ...base, routeId: '/' })).toBe('/login');
		expect(decideRedirect({ ...base, routeId: '/calendar' })).toBe('/login');
		expect(decideRedirect({ ...base, routeId: '/admin/events' })).toBe('/login');
	});

	it('lets an anonymous visitor reach /login itself', () => {
		expect(decideRedirect({ ...base, routeId: '/login' })).toBeNull();
	});

	it('sends a pending user to /pending', () => {
		const input: GateInput = {
			hasSession: true,
			profileStatus: 'pending',
			isAdmin: false,
			routeId: '/'
		};
		expect(decideRedirect(input)).toBe('/pending');
	});

	it('sends a rejected user to /pending too (same holding page)', () => {
		const input: GateInput = {
			hasSession: true,
			profileStatus: 'rejected',
			isAdmin: false,
			routeId: '/calendar'
		};
		expect(decideRedirect(input)).toBe('/pending');
	});

	it('lets a pending/rejected user stay on /pending', () => {
		const input: GateInput = {
			hasSession: true,
			profileStatus: 'pending',
			isAdmin: false,
			routeId: '/pending'
		};
		expect(decideRedirect(input)).toBeNull();
	});

	it('treats a missing profile row the same as not approved', () => {
		const input: GateInput = {
			hasSession: true,
			profileStatus: null,
			isAdmin: false,
			routeId: '/'
		};
		expect(decideRedirect(input)).toBe('/pending');
	});

	it('lets an approved non-admin use ordinary routes', () => {
		const input: GateInput = {
			hasSession: true,
			profileStatus: 'approved',
			isAdmin: false,
			routeId: '/messages'
		};
		expect(decideRedirect(input)).toBeNull();
	});

	it('sends an approved non-admin away from /admin/* routes', () => {
		const events: GateInput = {
			hasSession: true,
			profileStatus: 'approved',
			isAdmin: false,
			routeId: '/admin/events'
		};
		const accounts: GateInput = {
			hasSession: true,
			profileStatus: 'approved',
			isAdmin: false,
			routeId: '/admin/accounts'
		};
		expect(decideRedirect(events)).toBe('/');
		expect(decideRedirect(accounts)).toBe('/');
	});

	it('gates the /admin menu itself, not just the screens under it', () => {
		const member: GateInput = {
			hasSession: true,
			profileStatus: 'approved',
			isAdmin: false,
			routeId: '/admin'
		};
		expect(decideRedirect(member)).toBe('/');
		expect(decideRedirect({ ...member, hasSession: false, profileStatus: null })).toBe('/login');
		expect(decideRedirect({ ...member, isAdmin: true })).toBeNull();
	});

	it('never lets a pending or rejected admin into /admin/*', () => {
		for (const profileStatus of ['pending', 'rejected'] as const) {
			expect(
				decideRedirect({ hasSession: true, profileStatus, isAdmin: true, routeId: '/admin' })
			).toBe('/pending');
			expect(
				decideRedirect({
					hasSession: true,
					profileStatus,
					isAdmin: true,
					routeId: '/admin/accounts'
				})
			).toBe('/pending');
		}
	});

	it('lets an approved admin use /admin/* routes', () => {
		const input: GateInput = {
			hasSession: true,
			profileStatus: 'approved',
			isAdmin: true,
			routeId: '/admin/events'
		};
		expect(decideRedirect(input)).toBeNull();
	});

	it('sends an already-approved user away from /login and /pending', () => {
		const login: GateInput = {
			hasSession: true,
			profileStatus: 'approved',
			isAdmin: false,
			routeId: '/login'
		};
		const pending: GateInput = {
			hasSession: true,
			profileStatus: 'approved',
			isAdmin: false,
			routeId: '/pending'
		};
		expect(decideRedirect(login)).toBe('/');
		expect(decideRedirect(pending)).toBe('/');
	});
});
