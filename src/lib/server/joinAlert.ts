import { supabaseAdmin } from './supabase';
import { sendToAll, type SendResult, type Subscription } from './pushSend';

export type JoinAlertDeps = {
	/** Marks this sign-up as alerted; returns the person's name only if this call was the one to do it. */
	claim: (userId: string) => Promise<string | null>;
	adminSubscriptions: () => Promise<Subscription[]>;
	send: (subscriptions: Subscription[], payload: string) => Promise<SendResult>;
	removeExpired: (ids: string[]) => Promise<void>;
};

const realDeps: JoinAlertDeps = {
	async claim(userId) {
		// One atomic update: only the first call for a pending profile matches
		// `join_notified_at is null`, so concurrent or repeat sign-ins can't
		// alert twice.
		const { data, error } = await supabaseAdmin
			.from('profiles')
			.update({ join_notified_at: new Date().toISOString() })
			.eq('id', userId)
			.eq('status', 'pending')
			.is('join_notified_at', null)
			.select('display_name');
		if (error) throw error;
		return data?.[0]?.display_name ?? null;
	},

	async adminSubscriptions() {
		const { data: admins, error: adminsError } = await supabaseAdmin
			.from('profiles')
			.select('id')
			.eq('role', 'admin')
			.eq('status', 'approved');
		if (adminsError) throw adminsError;

		const adminIds = (admins ?? []).map((a) => a.id);
		if (adminIds.length === 0) return [];

		const { data, error } = await supabaseAdmin
			.from('push_subscriptions')
			.select('id, endpoint, p256dh, auth')
			.in('profile_id', adminIds);
		if (error) throw error;
		return data ?? [];
	},

	send: (subscriptions, payload) => sendToAll(subscriptions, payload),

	async removeExpired(ids) {
		await supabaseAdmin.from('push_subscriptions').delete().in('id', ids);
	}
};

export function joinAlertPayload(name: string): string {
	return JSON.stringify({
		title: 'New sign-up request',
		body: `${name} is asking to join SBF.`
	});
}

/** Tells approved admins' subscribed devices that someone new is waiting for approval. */
export async function notifyAdminsOfJoin(
	userId: string,
	deps: JoinAlertDeps = realDeps
): Promise<void> {
	const name = await deps.claim(userId);
	if (name === null) return;

	const subscriptions = await deps.adminSubscriptions();
	if (subscriptions.length === 0) return;

	const { expiredIds } = await deps.send(subscriptions, joinAlertPayload(name));
	if (expiredIds.length > 0) await deps.removeExpired(expiredIds);
}
