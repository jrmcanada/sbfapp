import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals: { supabase, user } }) => {
	if (!user) return json({ error: 'Not signed in' }, { status: 401 });

	const sub = await request.json();
	const endpoint = sub?.endpoint;
	const p256dh = sub?.keys?.p256dh;
	const auth = sub?.keys?.auth;
	if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
		return json({ error: 'Malformed subscription' }, { status: 400 });
	}

	const { error } = await supabase
		.from('push_subscriptions')
		.upsert({ profile_id: user.id, endpoint, p256dh, auth }, { onConflict: 'endpoint' });

	if (error) return json({ error: error.message }, { status: 500 });
	return json({ success: true });
};
