import { describe, expect, it } from 'vitest';
import { formatDate } from './format';

describe('formatDate', () => {
	it('uses the church timezone, not the runtime one', () => {
		// 02:00 UTC on Sept 27 is still the evening of Sept 26 in Sudbury.
		expect(formatDate('2026-09-27T02:00:00Z')).toBe('Sep 26, 2026');
	});
});
