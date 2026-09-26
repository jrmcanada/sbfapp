import { describe, expect, it } from 'vitest';
import { requireAdmin } from './requireAdmin';

describe('requireAdmin', () => {
	it('lets an approved admin through', () => {
		expect(() => requireAdmin({ profile: { status: 'approved', role: 'admin' } })).not.toThrow();
	});

	it('refuses an approved regular member', () => {
		expect(() => requireAdmin({ profile: { status: 'approved', role: 'member' } })).toThrow();
	});

	it('refuses an admin who is not approved', () => {
		expect(() => requireAdmin({ profile: { status: 'pending', role: 'admin' } })).toThrow();
		expect(() => requireAdmin({ profile: { status: 'rejected', role: 'admin' } })).toThrow();
	});

	it('refuses a missing profile', () => {
		expect(() => requireAdmin({ profile: null })).toThrow();
	});
});
