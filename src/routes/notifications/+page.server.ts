import { supabaseAdmin } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

const HISTORY_DAYS = 30;

type HistoryItem = {
	id: string;
	title: string;
	body: string;
	sent_at: string;
};

// notifications has no RLS policies (default-deny for client sessions, see
// 4b's migration), so this reads it with the secret-key client. The auth
// gate already limits this route to approved members.
export const load: PageServerLoad = async () => {
	const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();

	const { data, error } = await supabaseAdmin
		.from('notifications')
		.select('id, title, body, sent_at')
		.gte('sent_at', since)
		.order('sent_at', { ascending: false });

	const history: HistoryItem[] = data ?? [];
	return { history, historyError: error?.message ?? null };
};
