import { PUBLIC_VAPID_KEY } from '$env/static/public';
import { isIOS, isStandalone } from '$lib/platform';

export type PushStatus = 'ios-not-installed' | 'unsupported' | 'subscribed' | 'not-subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

export function pushSupported(): boolean {
	return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
	if (!pushSupported()) return null;
	const registration = await navigator.serviceWorker.getRegistration('/sw.js');
	if (!registration) return null;
	return registration.pushManager.getSubscription();
}

/** Where this device stands on push. Browser only. */
export async function getPushStatus(): Promise<PushStatus> {
	const ios = isIOS(navigator.userAgent, navigator.maxTouchPoints);
	const standalone = isStandalone(
		(navigator as Navigator & { standalone?: boolean }).standalone,
		window.matchMedia('(display-mode: standalone)').matches
	);
	if (ios && !standalone) return 'ios-not-installed';
	if (!pushSupported()) return 'unsupported';
	return (await getCurrentSubscription()) ? 'subscribed' : 'not-subscribed';
}

export async function subscribeToPush(): Promise<void> {
	await navigator.serviceWorker.register('/sw.js');
	// register() resolves once installation starts, not once the worker is
	// active — subscribing before that fails with "no active Service
	// Worker". .ready waits for an active worker controlling this scope.
	const registration = await navigator.serviceWorker.ready;
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') throw new Error('Notification permission was not granted.');

	const subscription = await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY) as BufferSource
	});

	const res = await fetch('/notifications/subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(subscription.toJSON())
	});
	if (!res.ok) throw new Error('Could not save the subscription.');
}

export async function unsubscribeFromPush(): Promise<void> {
	const subscription = await getCurrentSubscription();
	if (!subscription) return;

	const endpoint = subscription.endpoint;
	await subscription.unsubscribe();

	await fetch('/notifications/unsubscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ endpoint })
	});
}
