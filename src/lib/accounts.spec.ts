import { describe, expect, it } from 'vitest';
import { groupAccounts, type AccountProfile } from './accounts';

function profile(overrides: Partial<AccountProfile> & { id: string }): AccountProfile {
	return {
		display_name: overrides.id,
		status: 'approved',
		role: 'member',
		created_at: '2026-09-01T00:00:00Z',
		...overrides
	};
}

describe('groupAccounts', () => {
	it('splits accounts into pending, admins, regular and rejected', () => {
		const groups = groupAccounts(
			[
				profile({ id: 'a', status: 'pending' }),
				profile({ id: 'b', role: 'admin' }),
				profile({ id: 'c' }),
				profile({ id: 'd', status: 'rejected' })
			],
			new Map(),
			new Map()
		);

		expect(groups.pending.map((a) => a.id)).toEqual(['a']);
		expect(groups.admins.map((a) => a.id)).toEqual(['b']);
		expect(groups.regular.map((a) => a.id)).toEqual(['c']);
		expect(groups.rejected.map((a) => a.id)).toEqual(['d']);
	});

	it('sorts each group by name, ignoring case', () => {
		const groups = groupAccounts(
			[
				profile({ id: '1', display_name: 'silvanus', role: 'admin' }),
				profile({ id: '2', display_name: 'Nathanael', role: 'admin' }),
				profile({ id: '3', display_name: 'James', role: 'admin' }),
				profile({ id: '4', display_name: 'zoe' }),
				profile({ id: '5', display_name: 'Adam' })
			],
			new Map(),
			new Map()
		);

		expect(groups.admins.map((a) => a.display_name)).toEqual(['James', 'Nathanael', 'silvanus']);
		expect(groups.regular.map((a) => a.display_name)).toEqual(['Adam', 'zoe']);
	});

	it('attaches email and device count, defaulting when unknown', () => {
		const groups = groupAccounts(
			[profile({ id: 'a' }), profile({ id: 'b' })],
			new Map([['a', 'a@example.com']]),
			new Map([['a', 2]])
		);

		expect(groups.regular[0]).toMatchObject({ id: 'a', email: 'a@example.com', deviceCount: 2 });
		expect(groups.regular[1]).toMatchObject({ id: 'b', email: null, deviceCount: 0 });
	});

	it('treats a non-approved admin by status, not role', () => {
		const groups = groupAccounts(
			[profile({ id: 'a', role: 'admin', status: 'pending' })],
			new Map(),
			new Map()
		);

		expect(groups.pending).toHaveLength(1);
		expect(groups.admins).toHaveLength(0);
	});
});
