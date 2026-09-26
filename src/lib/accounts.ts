export type AccountProfile = {
	id: string;
	display_name: string;
	status: 'pending' | 'approved' | 'rejected';
	role: 'member' | 'admin';
	created_at: string;
};

export type Account = AccountProfile & {
	email: string | null;
	deviceCount: number;
};

export type AccountGroups = {
	pending: Account[];
	admins: Account[];
	regular: Account[];
	rejected: Account[];
};

function byName(a: Account, b: Account): number {
	return a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
}

/**
 * Splits accounts into the four groups the Accounts screen shows and sorts
 * each by name. Pending comes first in the UI because it's the only group
 * that needs a decision; rejected is last.
 */
export function groupAccounts(
	profiles: AccountProfile[],
	emailsById: Map<string, string>,
	deviceCountsById: Map<string, number>
): AccountGroups {
	const groups: AccountGroups = { pending: [], admins: [], regular: [], rejected: [] };

	for (const profile of profiles) {
		const account: Account = {
			...profile,
			email: emailsById.get(profile.id) ?? null,
			deviceCount: deviceCountsById.get(profile.id) ?? 0
		};

		if (profile.status === 'pending') groups.pending.push(account);
		else if (profile.status === 'rejected') groups.rejected.push(account);
		else if (profile.role === 'admin') groups.admins.push(account);
		else groups.regular.push(account);
	}

	for (const list of Object.values(groups)) list.sort(byName);
	return groups;
}
