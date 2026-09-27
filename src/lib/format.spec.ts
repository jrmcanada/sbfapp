import { describe, expect, it } from 'vitest';
import {
	formatDate,
	formatDay,
	formatDayHeading,
	formatTime12h,
	todayInChurchZone
} from './format';

describe('formatDate', () => {
	it('uses the church timezone, not the runtime one', () => {
		// 02:00 UTC on Sept 27 is still the evening of Sept 26 in Sudbury.
		expect(formatDate('2026-09-27T02:00:00Z')).toBe('Sep 26, 2026');
	});
});

describe('formatDay', () => {
	it('never shifts a date-only value by timezone', () => {
		expect(formatDay('2026-09-27')).toBe('Sep 27, 2026');
	});
});

describe('formatDayHeading', () => {
	it('includes the weekday and never shifts by timezone', () => {
		expect(formatDayHeading('2026-09-27')).toBe('Sunday, Sep 27, 2026');
	});
});

describe('formatTime12h', () => {
	it('formats a morning time', () => {
		expect(formatTime12h('11:15')).toBe('11:15 AM');
	});

	it('formats an afternoon time', () => {
		expect(formatTime12h('14:05')).toBe('2:05 PM');
	});

	it('handles noon and midnight', () => {
		expect(formatTime12h('12:00')).toBe('12:00 PM');
		expect(formatTime12h('00:00')).toBe('12:00 AM');
	});

	it('accepts the HH:MM:SS shape Postgres returns', () => {
		expect(formatTime12h('09:30:00')).toBe('9:30 AM');
	});
});

describe('todayInChurchZone', () => {
	it('is an ISO date', () => {
		expect(todayInChurchZone()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
