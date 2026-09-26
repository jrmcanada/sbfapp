// Fixed to the church's timezone so the server-rendered and client-rendered
// text always match, wherever either one runs.
const TIME_ZONE = 'America/Toronto';

export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-CA', { dateStyle: 'medium', timeZone: TIME_ZONE });
}

export function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString('en-CA', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: TIME_ZONE
	});
}
