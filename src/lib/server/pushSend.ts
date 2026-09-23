import webpush from 'web-push';
import { PUBLIC_VAPID_KEY } from '$env/static/public';
import { VAPID_PRIVATE_KEY } from '$env/static/private';

webpush.setVapidDetails('mailto:admin@sbf.church', PUBLIC_VAPID_KEY, VAPID_PRIVATE_KEY);

export type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };
export type SendResult = { sent: number; expiredIds: string[] };

async function defaultSend(sub: Subscription, payload: string): Promise<void> {
	await webpush.sendNotification(
		{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
		payload
	);
}

/**
 * Sends to every subscription, collecting which ones the push service
 * reports as gone (410) or not found (404) — those get cleaned up by the
 * caller. Other failures (a network blip, say) are left alone rather than
 * deleted, since they might succeed next time.
 *
 * `send` is injectable so this is unit-testable without a real push
 * service round trip — see pushSend.spec.ts.
 */
export async function sendToAll(
	subscriptions: Subscription[],
	payload: string,
	send: (sub: Subscription, payload: string) => Promise<void> = defaultSend
): Promise<SendResult> {
	let sent = 0;
	const expiredIds: string[] = [];

	await Promise.all(
		subscriptions.map(async (sub) => {
			try {
				await send(sub, payload);
				sent++;
			} catch (err) {
				const statusCode = (err as { statusCode?: number } | undefined)?.statusCode;
				if (statusCode === 404 || statusCode === 410) {
					expiredIds.push(sub.id);
				}
			}
		})
	);

	return { sent, expiredIds };
}
