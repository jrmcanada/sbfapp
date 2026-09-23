// Push-only service worker — no offline asset caching (out of scope, see
// docs/specs/04b-push-notifications/spec.md).

self.addEventListener('push', (event) => {
	let data = {};
	try {
		data = event.data ? event.data.json() : {};
	} catch {
		// Ignore a malformed payload rather than crash the event handler.
	}

	event.waitUntil(
		self.registration.showNotification(data.title || 'Sudbury Bible Fellowship', {
			body: data.body || '',
			icon: '/icons/icon-192.png'
		})
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(self.clients.openWindow('/'));
});
