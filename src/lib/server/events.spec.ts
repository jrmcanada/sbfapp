import { describe, expect, it } from 'vitest';
import { parseEventsFile } from './events';

describe('parseEventsFile', () => {
	it('parses a single-day event', () => {
		const result = parseEventsFile('2026-12-25 | Christmas Service | Come celebrate');
		expect(result.errors).toEqual([]);
		expect(result.events).toEqual([
			{
				title: 'Christmas Service',
				description: 'Come celebrate',
				start_date: '2026-12-25',
				end_date: '2026-12-25'
			}
		]);
	});

	it('parses a multi-day event with no description', () => {
		const result = parseEventsFile('2026-11-08 to 2026-11-10 | Youth Conference');
		expect(result.errors).toEqual([]);
		expect(result.events).toEqual([
			{
				title: 'Youth Conference',
				description: null,
				start_date: '2026-11-08',
				end_date: '2026-11-10'
			}
		]);
	});

	it('ignores blank lines and comments', () => {
		const result = parseEventsFile(
			'\n# a comment\n2026-01-01 | New Year Service\n\n# another comment\n'
		);
		expect(result.errors).toEqual([]);
		expect(result.events).toHaveLength(1);
	});

	it('rejects a malformed date', () => {
		const result = parseEventsFile('not-a-date | Bad Event');
		expect(result.events).toEqual([]);
		expect(result.errors).toEqual([{ line: 1, message: expect.stringContaining('invalid date') }]);
	});

	it('rejects a calendar-invalid date like Feb 30', () => {
		const result = parseEventsFile('2026-02-30 | Bad Event');
		expect(result.events).toEqual([]);
		expect(result.errors[0].message).toContain('not a real calendar date');
	});

	it('rejects an end date before the start date', () => {
		const result = parseEventsFile('2026-05-10 to 2026-05-01 | Backwards Event');
		expect(result.errors[0].message).toContain('end date is before start date');
	});

	it('rejects a missing title', () => {
		const result = parseEventsFile('2026-01-01 | ');
		expect(result.errors[0].message).toContain('title is required');
	});

	it('rejects the wrong number of fields', () => {
		const result = parseEventsFile('2026-01-01 | Title | Description | extra');
		expect(result.errors[0].message).toContain('expected 2 or 3 fields');
	});

	it('is all-or-nothing: one bad line drops every parsed event', () => {
		const result = parseEventsFile('2026-01-01 | Good Event\nnot-a-date | Bad Event');
		expect(result.events).toEqual([]);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].line).toBe(2);
	});

	it('reports every error, not just the first', () => {
		const result = parseEventsFile('not-a-date | Bad Event 1\nalso-bad | Bad Event 2');
		expect(result.errors).toHaveLength(2);
	});
});
