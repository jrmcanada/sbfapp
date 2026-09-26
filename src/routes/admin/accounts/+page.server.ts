import { fail } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import { groupAccounts, type AccountProfile } from '$lib/accounts';
import { requireAdmin } from '$lib/server/requireAdmin';
import { supabaseAdmin } from '$lib/server/supabase';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);

	// Secret-key client throughout: emails live in Supabase Auth and other
	// people's push subscriptions are hidden by RLS — neither is readable
	// with the admin's own session.
	const [profilesRes, subscriptionsRes, usersRes] = await Promise.all([
		supabaseAdmin.from('profiles').select('id, display_name, status, role, created_at'),
		supabaseAdmin.from('push_subscriptions').select('profile_id'),
		supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
	]);

	const loadError =
		profilesRes.error?.message ??
		subscriptionsRes.error?.message ??
		usersRes.error?.message ??
		null;

	const emailsById = new Map<string, string>();
	for (const authUser of usersRes.data?.users ?? []) {
		if (authUser.email) emailsById.set(authUser.id, authUser.email);
	}

	const deviceCountsById = new Map<string, number>();
	for (const { profile_id } of subscriptionsRes.data ?? []) {
		deviceCountsById.set(profile_id, (deviceCountsById.get(profile_id) ?? 0) + 1);
	}

	return {
		groups: groupAccounts(
			(profilesRes.data ?? []) as AccountProfile[],
			emailsById,
			deviceCountsById
		),
		currentUserId: locals.user!.id,
		loadError
	};
};

async function setStatus(
	request: Request,
	supabase: SupabaseClient,
	userId: string | undefined,
	status: 'approved' | 'rejected'
) {
	const formData = await request.formData();
	const id = formData.get('id');
	if (typeof id !== 'string') return fail(400, { error: 'Missing account id' });

	const { error } = await supabase
		.from('profiles')
		.update({ status, approved_by: userId, approved_at: new Date().toISOString() })
		.eq('id', id);

	if (error) return fail(500, { error: error.message });
	return { success: true };
}

export const actions: Actions = {
	approve: ({ request, locals: { supabase, user } }) =>
		setStatus(request, supabase, user?.id, 'approved'),
	reject: ({ request, locals: { supabase, user } }) =>
		setStatus(request, supabase, user?.id, 'rejected'),

	setRole: async ({ request, locals }) => {
		requireAdmin(locals);
		const formData = await request.formData();
		const id = formData.get('id');
		const role = formData.get('role');

		if (typeof id !== 'string' || (role !== 'admin' && role !== 'member')) {
			return fail(400, { error: 'Invalid request.' });
		}
		// Also guarantees at least one admin always remains: the caller is one.
		if (id === locals.user?.id) {
			return fail(400, { error: "You can't change your own account type." });
		}

		// The admin's own session, so RLS ("Admins can update profiles") backs this up.
		const { data, error } = await locals.supabase
			.from('profiles')
			.update({ role })
			.eq('id', id)
			.eq('status', 'approved')
			.select('id');

		if (error) return fail(500, { error: error.message });
		if (!data?.length) return fail(404, { error: 'Only approved accounts can change type.' });
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		requireAdmin(locals);
		const formData = await request.formData();
		const id = formData.get('id');

		if (typeof id !== 'string') return fail(400, { error: 'Missing account id' });
		if (id === locals.user?.id) {
			return fail(400, { error: "You can't delete your own account." });
		}

		// approved_by and notifications.created_by are ON DELETE RESTRICT (an
		// audit trail), so check first and explain, rather than surface a raw
		// database error.
		const [approvedRes, sentRes] = await Promise.all([
			supabaseAdmin
				.from('profiles')
				.select('id', { count: 'exact', head: true })
				.eq('approved_by', id),
			supabaseAdmin
				.from('notifications')
				.select('id', { count: 'exact', head: true })
				.eq('created_by', id)
		]);

		const checkError = approvedRes.error ?? sentRes.error;
		if (checkError) return fail(500, { error: checkError.message });
		if ((approvedRes.count ?? 0) > 0 || (sentRes.count ?? 0) > 0) {
			return fail(409, {
				error:
					"This account approved other accounts or sent notifications, so it can't be deleted while that history exists. You can change it to Regular instead."
			});
		}

		const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
		if (error) return fail(500, { error: error.message });
		return { success: true };
	}
};
