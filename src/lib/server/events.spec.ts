import { describe, expect, it } from 'vitest';
import { parseEventsFile, parseTimeField } from './events';

describe('parseEventsFile', () => {
	it('parses a single-day event with a time', () => {
		const result = parseEventsFile('2026-12-25 | 09:30 | Christmas Service | Come celebrate');
		expect(result.errors).toEqual([]);
		expect(result.events).toEqual([
			{
				title: 'Christmas Service',
				description: 'Come celebrate',
				start_date: '2026-12-25',
				end_date: '2026-12-25',
				start_time: '09:30'
			}
		]);
	});

	it('parses an event with a blank time as having no fixed time', () => {
		const result = parseEventsFile('2026-12-25 | | Christmas Day');
		expect(result.errors).toEqual([]);
		expect(result.events[0].start_time).toBeNull();
	});

	it('parses a multi-day event with no description', () => {
		const result = parseEventsFile('2026-11-08 to 2026-11-10 | 18:00 | Youth Conference');
		expect(result.errors).toEqual([]);
		expect(result.events).toEqual([
			{
				title: 'Youth Conference',
				description: null,
				start_date: '2026-11-08',
				end_date: '2026-11-10',
				start_time: '18:00'
			}
		]);
	});

	it('ignores blank lines and comments', () => {
		const result = parseEventsFile(
			'\n# a comment\n2026-01-01 | | New Year Service\n\n# another comment\n'
		);
		expect(result.errors).toEqual([]);
		expect(result.events).toHaveLength(1);
	});

	it('rejects a malformed date', () => {
		const result = parseEventsFile('not-a-date | | Bad Event');
		expect(result.events).toEqual([]);
		expect(result.errors).toEqual([{ line: 1, message: expect.stringContaining('invalid date') }]);
	});

	it('rejects a calendar-invalid date like Feb 30', () => {
		const result = parseEventsFile('2026-02-30 | | Bad Event');
		expect(result.events).toEqual([]);
		expect(result.errors[0].message).toContain('not a real calendar date');
	});

	it('rejects an end date before the start date', () => {
		const result = parseEventsFile('2026-05-10 to 2026-05-01 | | Backwards Event');
		expect(result.errors[0].message).toContain('end date is before start date');
	});

	it('rejects a malformed time', () => {
		const result = parseEventsFile('2026-01-01 | 9:30 | Bad Time');
		expect(result.events).toEqual([]);
		expect(result.errors[0].message).toContain('invalid time');
	});

	it('rejects an out-of-range time', () => {
		const result = parseEventsFile('2026-01-01 | 25:00 | Bad Time');
		expect(result.errors[0].message).toContain('invalid time');
	});

	it('rejects a missing title', () => {
		const result = parseEventsFile('2026-01-01 | | ');
		expect(result.errors[0].message).toContain('title is required');
	});

	it('rejects the wrong number of fields', () => {
		const result = parseEventsFile('2026-01-01 | Title');
		expect(result.errors[0].message).toContain('expected 3 or 4 fields');
	});

	it('is all-or-nothing: one bad line drops every parsed event', () => {
		const result = parseEventsFile('2026-01-01 | | Good Event\nnot-a-date | | Bad Event');
		expect(result.events).toEqual([]);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].line).toBe(2);
	});

	it('reports every error, not just the first', () => {
		const result = parseEventsFile('not-a-date | | Bad Event 1\nalso-bad | | Bad Event 2');
		expect(result.errors).toHaveLength(2);
	});
});

describe('parseTimeField', () => {
	it('treats a blank field as no fixed time', () => {
		expect(parseTimeField('')).toEqual({ ok: true, value: null });
	});

	it('accepts a valid 24-hour time', () => {
		expect(parseTimeField('23:59')).toEqual({ ok: true, value: '23:59' });
		expect(parseTimeField('00:00')).toEqual({ ok: true, value: '00:00' });
	});

	it('rejects a 12-hour-style time', () => {
		expect(parseTimeField('9:30').ok).toBe(false);
	});

	it('rejects an invalid hour or minute', () => {
		expect(parseTimeField('24:00').ok).toBe(false);
		expect(parseTimeField('12:60').ok).toBe(false);
	});
});
