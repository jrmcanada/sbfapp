import { parseMessagesHtml } from '$lib/messages';
import type { PageLoad } from './$types';

// Fetched client-side, deliberately: sbf.church's Cloudflare bot management
// reliably blocks server-side fetches (Node's fetch, even a real headless
// browser) but explicitly allows cross-origin browser reads
// (Access-Control-Allow-Origin: *). A genuine visitor's browser is not
// automated traffic, so this runs there instead of on our server.
export const ssr = false;

const MESSAGES_URL = 'https://sbf.church/messages/';
const RECENT_LIMIT = 10;

export const load: PageLoad = async ({ fetch }) => {
	try {
		const res = await fetch(MESSAGES_URL);
		if (!res.ok) {
			return { messages: [], loadError: `sbf.church responded with ${res.status}` };
		}
		const html = await res.text();
		return { messages: parseMessagesHtml(html, RECENT_LIMIT), loadError: null };
	} catch (err) {
		return { messages: [], loadError: err instanceof Error ? err.message : 'Unknown error' };
	}
};
