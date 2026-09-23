import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals: { supabase, user } }) => {
	if (!user) return json({ error: 'Not signed in' }, { status: 401 });

	const { endpoint } = await request.json();
	if (typeof endpoint !== 'string') return json({ error: 'Missing endpoint' }, { status: 400 });

	const { error } = await supabase
		.from('push_subscriptions')
		.delete()
		.eq('endpoint', endpoint)
		.eq('profile_id', user.id);

	if (error) return json({ error: error.message }, { status: 500 });
	return json({ success: true });
};
