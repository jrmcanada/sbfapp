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

/** Today's date in the church's timezone, as YYYY-MM-DD. */
export function todayInChurchZone(): string {
	return new Date().toLocaleDateString('en-CA', { timeZone: TIME_ZONE });
}

/** Formats a date-only value (YYYY-MM-DD) without any timezone shifting. */
export function formatDay(isoDate: string): string {
	return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-CA', {
		dateStyle: 'medium',
		timeZone: 'UTC'
	});
}

/**
 * Formats a wall-clock time ("HH:MM" or "HH:MM:SS", as Postgres returns a
 * `time` column) as 12-hour with AM/PM, e.g. "11:15 AM". Pure string math —
 * a wall-clock time has no timezone to get wrong by routing it through Date.
 */
export function formatTime12h(time: string): string {
	const [hourStr, minute] = time.split(':');
	const hour24 = Number(hourStr);
	const period = hour24 >= 12 ? 'PM' : 'AM';
	const hour12 = hour24 % 12 || 12;
	return `${hour12}:${minute} ${period}`;
}
