import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		signedIn: locals.session !== null,
		displayName: locals.user?.user_metadata?.full_name ?? locals.user?.email ?? null,
		isAdmin: locals.profile?.role === 'admin' && locals.profile.status === 'approved'
	};
};
