import type { EventFields } from '$lib/types';

export type CalendarEvent = EventFields & { id: string };

export type DayCell = { date: string; inMonth: boolean; events: CalendarEvent[] };

function toIsoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Events with a start_time sort chronologically before ones without,
 * which keep whatever order they were given in (stable sort). */
function byStartTime<T extends { start_time: string | null }>(a: T, b: T): number {
	if (a.start_time === b.start_time) return 0;
	if (a.start_time === null) return 1;
	if (b.start_time === null) return -1;
	return a.start_time < b.start_time ? -1 : 1;
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
			events: events.filter((e) => e.start_date <= iso && iso <= e.end_date).sort(byStartTime)
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

export type DayGroup<T> = { date: string; events: T[] };

/**
 * Buckets a list into one group per distinct start_date, in the order each
 * date first appears (so it works for both `upcoming`'s ascending order and
 * `past`'s descending order), each group's events chronological by time.
 */
export function groupEventsByDay<T extends { start_date: string; start_time: string | null }>(
	events: T[]
): DayGroup<T>[] {
	const groups: DayGroup<T>[] = [];
	const indexByDate = new Map<string, number>();

	for (const event of events) {
		let index = indexByDate.get(event.start_date);
		if (index === undefined) {
			index = groups.length;
			indexByDate.set(event.start_date, index);
			groups.push({ date: event.start_date, events: [] });
		}
		groups[index].events.push(event);
	}

	for (const group of groups) group.events.sort(byStartTime);
	return groups;
}
