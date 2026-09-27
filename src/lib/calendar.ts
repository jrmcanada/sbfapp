import type { EventFields } from '$lib/types';

export type CalendarEvent = EventFields & { id: string };

export type DayCell = { date: string; inMonth: boolean; events: CalendarEvent[] };

function toIsoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Sunday-first grid for `year`/`month` (1-12), including leading/trailing
 * days from adjacent months so every week row has 7 days. */
export function getMonthGrid(year: number, month: number, events: CalendarEvent[]): DayCell[] {
	const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
	const startWeekday = firstOfMonth.getUTCDay();
	const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

	const cells: DayCell[] = [];
	for (let i = 0; i < totalCells; i++) {
		const date = new Date(Date.UTC(year, month - 1, 1 - startWeekday + i));
		const iso = toIsoDate(date);
		cells.push({
			date: iso,
			inMonth: date.getUTCMonth() === month - 1,
			events: events.filter((e) => e.start_date <= iso && iso <= e.end_date)
		});
	}
	return cells;
}

export function monthLabel(year: number, month: number): string {
	return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

/** Parses a "YYYY-MM" search param, falling back to the current month. */
export function parseMonthParam(value: string | null): { year: number; month: number } {
	const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
	if (match) return { year: Number(match[1]), month: Number(match[2]) };
	const now = new Date();
	return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export function shiftMonth(
	year: number,
	month: number,
	delta: number
): { year: number; month: number } {
	const date = new Date(Date.UTC(year, month - 1 + delta, 1));
	return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function formatMonthParam(year: number, month: number): string {
	return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Splits events into ones still on or ahead (soonest first) and ones that
 * have ended (most recent first). `today` is an ISO date, YYYY-MM-DD.
 */
export function splitByToday<T extends { start_date: string; end_date: string }>(
	events: T[],
	today: string
): { upcoming: T[]; past: T[] } {
	const upcoming = events
		.filter((e) => e.end_date >= today)
		.sort((a, b) => a.start_date.localeCompare(b.start_date));
	const past = events
		.filter((e) => e.end_date < today)
		.sort((a, b) => b.start_date.localeCompare(a.start_date));
	return { upcoming, past };
}
