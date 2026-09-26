import { fail } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { sendToAll } from '$lib/server/pushSend';
import { requireAdmin } from '$lib/server/requireAdmin';
import type { Actions, PageServerLoad } from './$types';

const HISTORY_LIMIT = 50;

type HistoryItem = {
	id: string;
	title: string;
	body: string;
	created_at: string;
	sent_at: string | null;
	sender: string;
};

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);

	const { data, error } = await supabaseAdmin
		.from('notifications')
		.select('id, title, body, created_at, sent_at, sender:profiles!created_by(display_name)')
		.order('created_at', { ascending: false })
		.limit(HISTORY_LIMIT);

	// The embed is a single profile at runtime; supabase-js's untyped client
	// just can't tell it isn't a list, so accept either shape.
	const history: HistoryItem[] = (data ?? []).map((row) => {
		const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
		return {
			id: row.id,
			title: row.title,
			body: row.body,
			created_at: row.created_at,
			sent_at: row.sent_at,
			sender: sender?.display_name ?? 'Unknown'
		};
	});

	return { history, historyError: error?.message ?? null };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireAdmin(locals);
		const { user } = locals;
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
