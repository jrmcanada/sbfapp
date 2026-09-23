import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { sendToAll } from '$lib/server/pushSend';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals: { user } }) => {
		const formData = await request.formData();
		const title = formData.get('title');
		const body = formData.get('body');

		if (
			typeof title !== 'string' ||
			title.trim() === '' ||
			typeof body !== 'string' ||
			body.trim() === ''
		) {
			return fail(400, { error: 'Title and body are both required.' });
		}

		const { data: notification, error: insertError } = await supabaseAdmin
			.from('notifications')
			.insert({ title, body, created_by: user!.id })
			.select('id')
			.single();

		if (insertError || !notification) {
			return fail(500, { error: insertError?.message ?? 'Could not create the notification.' });
		}

		const { data: subscriptions, error: subsError } = await supabaseAdmin
			.from('push_subscriptions')
			.select('id, endpoint, p256dh, auth');

		if (subsError) {
			return fail(500, { error: subsError.message });
		}

		const { sent, expiredIds } = await sendToAll(
			subscriptions ?? [],
			JSON.stringify({ title, body })
		);

		if (expiredIds.length > 0) {
			await supabaseAdmin.from('push_subscriptions').delete().in('id', expiredIds);
		}

		await supabaseAdmin
			.from('notifications')
			.update({ sent_at: new Date().toISOString() })
			.eq('id', notification.id);

		return { success: true, sent, removed: expiredIds.length };
	}
};
