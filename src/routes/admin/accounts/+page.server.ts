import { fail } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data, error } = await supabase
		.from('profiles')
		.select('id, display_name, status, role, created_at')
		.order('created_at', { ascending: true });

	return { profiles: data ?? [], loadError: error?.message ?? null };
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
		setStatus(request, supabase, user?.id, 'rejected')
};
