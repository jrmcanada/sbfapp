import type { EventFields } from '$lib/types';

export type ParsedEvent = EventFields;

export type LineError = { line: number; message: string };

export type ParseResult = { events: ParsedEvent[]; errors: LineError[] };

const DATE_RANGE = /^(\d{4}-\d{2}-\d{2})(?:\s+to\s+(\d{4}-\d{2}-\d{2}))?$/;

function isValidCalendarDate(iso: string): boolean {
	const [year, month, day] = iso.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
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
		if (parts.length < 2 || parts.length > 3) {
			errors.push({
				line: lineNumber,
				message: `expected 2 or 3 fields separated by "|", got ${parts.length}`
			});
			return;
		}

		const [datePart, title, description] = parts;

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

		if (title === '') {
			errors.push({ line: lineNumber, message: 'title is required' });
			return;
		}

		events.push({
			title,
			description: description || null,
			start_date: startDate,
			end_date: endDate
		});
	});

	return errors.length > 0 ? { events: [], errors } : { events, errors: [] };
}
