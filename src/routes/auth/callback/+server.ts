import { redirect } from '@sveltejs/kit';
import { notifyAdminsOfJoin } from '$lib/server/joinAlert';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');

	if (code) {
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			if (data.user) {
				// An alert failing must never stop someone signing in.
				try {
					await notifyAdminsOfJoin(data.user.id);
				} catch (err) {
					console.error('join alert failed', err);
				}
			}
			redirect(303, '/');
		}
	}

	redirect(303, '/login');
};
