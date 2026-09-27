import type { EventFields } from '$lib/types';

export type ParsedEvent = EventFields;

export type LineError = { line: number; message: string };

export type ParseResult = { events: ParsedEvent[]; errors: LineError[] };

const DATE_RANGE = /^(\d{4}-\d{2}-\d{2})(?:\s+to\s+(\d{4}-\d{2}-\d{2}))?$/;
const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidCalendarDate(iso: string): boolean {
	const [year, month, day] = iso.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
}

/** A blank field means "no fixed time" (`null`); anything else must be 24-hour `HH:MM`. */
export function parseTimeField(raw: string): { ok: true; value: string | null } | { ok: false } {
	if (raw === '') return { ok: true, value: null };
	return TIME_24H.test(raw) ? { ok: true, value: raw } : { ok: false };
}

/**
 * Parses the admin-uploaded events file. All-or-nothing: if any line has an
 * error, `events` is empty and every error is reported (see spec.md).
 */
export function parseEventsFile(content: string): ParseResult {
	const events: ParsedEvent[] = [];
	const errors: LineError[] = [];

	const lines = content.split(/\r?\n/);
	lines.forEach((rawLine, index) => {
		const line = rawLine.trim();
		if (line === '' || line.startsWith('#')) return;

		const lineNumber = index + 1;
		const parts = line.split('|').map((p) => p.trim());
		if (parts.length < 3 || parts.length > 4) {
			errors.push({
				line: lineNumber,
				message: `expected 3 or 4 fields separated by "|", got ${parts.length}`
			});
			return;
		}

		const [datePart, timePart, title, description] = parts;

		const match = DATE_RANGE.exec(datePart);
		if (!match) {
			errors.push({
				line: lineNumber,
				message: `invalid date "${datePart}", expected YYYY-MM-DD or YYYY-MM-DD to YYYY-MM-DD`
			});
			return;
		}

		const startDate = match[1];
		const endDate = match[2] ?? startDate;
		if (!isValidCalendarDate(startDate) || !isValidCalendarDate(endDate)) {
			errors.push({ line: lineNumber, message: `"${datePart}" is not a real calendar date` });
			return;
		}
		if (endDate < startDate) {
			errors.push({ line: lineNumber, message: 'end date is before start date' });
			return;
		}

		const time = parseTimeField(timePart);
		if (!time.ok) {
			errors.push({
				line: lineNumber,
				message: `invalid time "${timePart}", expected 24-hour HH:MM (e.g. 09:30) or blank`
			});
			return;
		}

		if (title === '') {
			errors.push({ line: lineNumber, message: 'title is required' });
			return;
		}

		events.push({
			title,
			description: description || null,
			start_date: startDate,
			end_date: endDate,
			start_time: time.value
		});
	});

	return errors.length > 0 ? { events: [], errors } : { events, errors: [] };
}
