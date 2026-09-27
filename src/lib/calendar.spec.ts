import { describe, expect, it } from 'vitest';
import {
	formatMonthParam,
	getMonthGrid,
	monthLabel,
	parseMonthParam,
	shiftMonth,
	splitByToday,
	type CalendarEvent
} from './calendar';

describe('getMonthGrid', () => {
	it('builds a full-week grid for the month, padded with adjacent days', () => {
		// September 2026: 1st is a Tuesday, 30 days.
		const grid = getMonthGrid(2026, 9, []);
		expect(grid.length % 7).toBe(0);
		expect(grid[0].date).toBe('2026-08-30'); // leading day from August
		expect(grid.find((c) => c.date === '2026-09-01')?.inMonth).toBe(true);
		expect(grid.find((c) => c.date === '2026-09-30')?.inMonth).toBe(true);
	});

	it('places a single-day event on its exact day only', () => {
		const events: CalendarEvent[] = [
			{
				id: '1',
				title: 'Solo Event',
				description: null,
				start_date: '2026-09-15',
				end_date: '2026-09-15',
				start_time: null
			}
		];
		const grid = getMonthGrid(2026, 9, events);
		expect(grid.find((c) => c.date === '2026-09-15')?.events).toHaveLength(1);
		expect(grid.find((c) => c.date === '2026-09-14')?.events).toHaveLength(0);
		expect(grid.find((c) => c.date === '2026-09-16')?.events).toHaveLength(0);
	});

	it('places a multi-day event on every day it spans', () => {
		const events: CalendarEvent[] = [
			{
				id: '1',
				title: 'Conference',
				description: null,
				start_date: '2026-09-10',
				end_date: '2026-09-12',
				start_time: null
			}
		];
		const grid = getMonthGrid(2026, 9, events);
		for (const day of ['2026-09-10', '2026-09-11', '2026-09-12']) {
			expect(grid.find((c) => c.date === day)?.events).toHaveLength(1);
		}
		expect(grid.find((c) => c.date === '2026-09-13')?.events).toHaveLength(0);
	});

	it('lists multiple events on the same day', () => {
		const events: CalendarEvent[] = [
			{
				id: '1',
				title: 'A',
				description: null,
				start_date: '2026-09-15',
				end_date: '2026-09-15',
				start_time: null
			},
			{
				id: '2',
				title: 'B',
				description: null,
				start_date: '2026-09-15',
				end_date: '2026-09-15',
				start_time: null
			}
		];
		const grid = getMonthGrid(2026, 9, events);
		expect(grid.find((c) => c.date === '2026-09-15')?.events).toHaveLength(2);
	});

	it('sorts same-day events chronologically by start_time, timed before untimed', () => {
		const events: CalendarEvent[] = [
			{
				id: 'untimed',
				title: 'No fixed time',
				description: null,
				start_date: '2026-09-15',
				end_date: '2026-09-15',
				start_time: null
			},
			{
				id: 'evening',
				title: 'Evening Meeting',
				description: null,
				start_date: '2026-09-15',
				end_date: '2026-09-15',
				start_time: '19:00'
			},
			{
				id: 'morning',
				title: 'Morning Service',
				description: null,
				start_date: '2026-09-15',
				end_date: '2026-09-15',
				start_time: '09:00'
			}
		];
		const grid = getMonthGrid(2026, 9, events);
		const ids = grid.find((c) => c.date === '2026-09-15')?.events.map((e) => e.id);
		expect(ids).toEqual(['morning', 'evening', 'untimed']);
	});
});

describe('monthLabel', () => {
	it('formats year and month as a readable label', () => {
		expect(monthLabel(2026, 9)).toBe('September 2026');
	});
});

describe('parseMonthParam', () => {
	it('parses a well-formed YYYY-MM param', () => {
		expect(parseMonthParam('2026-03')).toEqual({ year: 2026, month: 3 });
	});

	it('falls back to the current month for null or malformed input', () => {
		const now = new Date();
		const expected = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
		expect(parseMonthParam(null)).toEqual(expected);
		expect(parseMonthParam('garbage')).toEqual(expected);
	});
});

describe('shiftMonth', () => {
	it('moves forward within a year', () => {
		expect(shiftMonth(2026, 9, 1)).toEqual({ year: 2026, month: 10 });
	});

	it('rolls over into the next year', () => {
		expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
	});

	it('rolls back into the previous year', () => {
		expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
	});
});

describe('formatMonthParam', () => {
	it('zero-pads the month', () => {
		expect(formatMonthParam(2026, 3)).toBe('2026-03');
	});
});

describe('splitByToday', () => {
	const ev = (id: string, start_date: string, end_date: string) => ({ id, start_date, end_date });

	it('puts events that have not ended yet in upcoming, soonest first', () => {
		const { upcoming } = splitByToday(
			[ev('later', '2026-12-01', '2026-12-01'), ev('sooner', '2026-10-01', '2026-10-01')],
			'2026-09-27'
		);
		expect(upcoming.map((e) => e.id)).toEqual(['sooner', 'later']);
	});

	it('puts ended events in past, most recent first', () => {
		const { past } = splitByToday(
			[ev('old', '2026-01-01', '2026-01-01'), ev('recent', '2026-09-01', '2026-09-01')],
			'2026-09-27'
		);
		expect(past.map((e) => e.id)).toEqual(['recent', 'old']);
	});

	it('counts an event happening today, or a multi-day one still running, as upcoming', () => {
		const { upcoming, past } = splitByToday(
			[ev('today', '2026-09-27', '2026-09-27'), ev('running', '2026-09-25', '2026-09-28')],
			'2026-09-27'
		);
		expect(upcoming.map((e) => e.id).sort()).toEqual(['running', 'today']);
		expect(past).toEqual([]);
	});
});
