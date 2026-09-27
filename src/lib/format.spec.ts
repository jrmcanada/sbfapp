import { describe, expect, it } from 'vitest';
import { formatDate, formatDay, todayInChurchZone } from './format';

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

describe('todayInChurchZone', () => {
	it('is an ISO date', () => {
		expect(todayInChurchZone()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});
