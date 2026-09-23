import { describe, expect, it } from 'vitest';
import { parseMessagesHtml } from './messages';

function row({
	date,
	title,
	speaker,
	openHref,
	mp3Url
}: {
	date: string;
	title: string;
	speaker: string;
	openHref: string;
	mp3Url: string;
}): string {
	return `
		<tr class="messages--row"
			data-date="${date}"
			data-title="${title}"
			data-speaker="${speaker}"
			data-tags="|Family Bible Hour|">
			<td class="messages--open">
				<a class="messages--openBtn" href="${openHref}" aria-label="Open"></a>
			</td>
			<td class="messages--cActions">
				<a class="messages--stream" href="${openHref}"></a>
				<a class="messages--download" href="${mp3Url}"></a>
			</td>
		</tr>
	`;
}

describe('parseMessagesHtml', () => {
	it('extracts title, speaker, date, url, and mp3Url from a well-formed row', () => {
		const html = row({
			date: '2026-07-05',
			title: '7 Contrasts in Matthew 7',
			speaker: 'Tony Martin',
			openHref: '/messages/2026-07-05-am-tony-martin-7-contrasts-in-matthew-7/',
			mp3Url: 'https://messages.sbf.church/published/2026-07-05-am-tony-martin.mp3?download=1'
		});

		const [message] = parseMessagesHtml(html, 10);
		expect(message).toEqual({
			date: '2026-07-05',
			title: '7 Contrasts in Matthew 7',
			speaker: 'Tony Martin',
			url: 'https://sbf.church/messages/2026-07-05-am-tony-martin-7-contrasts-in-matthew-7/',
			mp3Url: 'https://messages.sbf.church/published/2026-07-05-am-tony-martin.mp3?download=1'
		});
	});

	it('decodes HTML entities in title and speaker', () => {
		const html = row({
			date: '2026-05-04',
			title: 'He Will Feed &amp; Lead His Flock',
			speaker: 'D&#39;Angelo Smith',
			openHref: '/messages/x/',
			mp3Url: 'https://messages.sbf.church/x.mp3'
		});

		const [message] = parseMessagesHtml(html, 10);
		expect(message.title).toBe('He Will Feed & Lead His Flock');
		expect(message.speaker).toBe("D'Angelo Smith");
	});

	it('respects the limit and preserves document order (newest-first)', () => {
		const html = [
			row({ date: '2026-07-05', title: 'A', speaker: 'S', openHref: '/a/', mp3Url: '/a.mp3' }),
			row({ date: '2026-06-28', title: 'B', speaker: 'S', openHref: '/b/', mp3Url: '/b.mp3' }),
			row({ date: '2026-06-21', title: 'C', speaker: 'S', openHref: '/c/', mp3Url: '/c.mp3' })
		].join('\n');

		const messages = parseMessagesHtml(html, 2);
		expect(messages.map((m) => m.title)).toEqual(['A', 'B']);
	});

	it('keys same-day messages by their distinct URLs', () => {
		const html = [
			row({
				date: '2026-07-05',
				title: 'AM Service',
				speaker: 'S',
				openHref: '/am/',
				mp3Url: '/am.mp3'
			}),
			row({
				date: '2026-07-05',
				title: 'PM Service',
				speaker: 'S',
				openHref: '/pm/',
				mp3Url: '/pm.mp3'
			})
		].join('\n');

		const messages = parseMessagesHtml(html, 10);
		expect(messages).toHaveLength(2);
		expect(new Set(messages.map((m) => m.url)).size).toBe(2);
	});

	it('skips a row missing a required field instead of throwing', () => {
		const incomplete = `
			<tr class="messages--row" data-date="2026-01-01" data-title="No Speaker" data-speaker="">
				<a class="messages--openBtn" href="/x/"></a>
				<a class="messages--download" href="/x.mp3"></a>
			</tr>
		`;
		expect(() => parseMessagesHtml(incomplete, 10)).not.toThrow();
		expect(parseMessagesHtml(incomplete, 10)).toEqual([]);
	});

	it('returns an empty array for unrecognized HTML (site redesign fallback)', () => {
		expect(parseMessagesHtml('<div>completely different markup</div>', 10)).toEqual([]);
	});

	it('returns an empty array for empty input', () => {
		expect(parseMessagesHtml('', 10)).toEqual([]);
	});
});
