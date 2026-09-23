export type Message = {
	url: string;
	title: string;
	speaker: string;
	date: string;
	mp3Url: string;
};

const ROW = /<tr class="messages--row"[\s\S]*?<\/tr>/g;
const ATTR = (name: string) => new RegExp(`data-${name}="([^"]*)"`);
const HREF = (className: string) => new RegExp(`class="${className}"\\s+href="([^"]*)"`);

const OPEN_HREF = HREF('messages--openBtn');
const DOWNLOAD_HREF = HREF('messages--download');
const DATE_ATTR = ATTR('date');
const TITLE_ATTR = ATTR('title');
const SPEAKER_ATTR = ATTR('speaker');

const ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	'#39': "'"
};

function decodeEntities(value: string): string {
	return value.replace(/&(#\d+|[a-z]+);/gi, (match, code: string) => {
		if (code.startsWith('#')) return String.fromCharCode(Number(code.slice(1)));
		return ENTITIES[code.toLowerCase()] ?? match;
	});
}

/**
 * Parses sbf.church/messages/'s server-rendered row markup into structured
 * messages, newest-first (matching the site's own order). Deliberately
 * tolerant: a row missing an expected field is skipped rather than thrown
 * on, since a future site redesign should degrade to an empty/short list,
 * not a crashed page — see spec.md's fallback-state requirement.
 */
export function parseMessagesHtml(html: string, limit: number): Message[] {
	const messages: Message[] = [];

	for (const match of html.matchAll(ROW)) {
		if (messages.length >= limit) break;

		const row = match[0];
		const date = DATE_ATTR.exec(row)?.[1];
		const title = TITLE_ATTR.exec(row)?.[1];
		const speaker = SPEAKER_ATTR.exec(row)?.[1];
		const openHref = OPEN_HREF.exec(row)?.[1];
		const mp3Url = DOWNLOAD_HREF.exec(row)?.[1];

		if (!date || !title || !speaker || !openHref || !mp3Url) continue;

		messages.push({
			url: new URL(openHref, 'https://sbf.church').toString(),
			title: decodeEntities(title),
			speaker: decodeEntities(speaker),
			date,
			mp3Url
		});
	}

	return messages;
}
