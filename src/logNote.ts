export type NavDirection = 'prev' | 'next';

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const NAV_CALLOUT_PATTERN = /^> \[!log-nav\]\r?\n> .*(?:\r?\n|$)/m;
const PREV_LINK_PATTERN = /\[\[[^\]]*\|←[^\]]*\]\]/;
const NEXT_LINK_PATTERN = /\[\[[^\]]*→\]\]/;
const EMPTY_PREV_SLOT = '&nbsp;';

export function normalizeTag(tag: string): string {
	return tag.trim().replace(/^#/, '').toLowerCase();
}

export function buildLogFileName(tag: string, formattedDate: string): string {
	return `${normalizeTag(tag)} ${formattedDate}`;
}

export function stripFrontmatter(content: string): { frontmatter: string; body: string } {
	const match = FRONTMATTER_PATTERN.exec(content);

	if (!match) {
		return { frontmatter: '', body: content };
	}

	return { frontmatter: match[1] ?? '', body: content.slice(match[0].length) };
}

export function insertNavAfterFrontmatter(content: string, prevName?: string): string {
	return insertNavBlock(content, buildNavBlock(prevName ? buildLink('prev', prevName) : undefined, undefined));
}

export function setNavLink(content: string, direction: NavDirection, noteName: string): string {
	const link = buildLink(direction, noteName);
	const existing = NAV_CALLOUT_PATTERN.exec(content);

	if (!existing) {
		const [prev, next] = direction === 'prev' ? [link, undefined] : [undefined, link];

		return insertNavBlock(content, buildNavBlock(prev, next));
	}

	const prev = direction === 'prev' ? link : PREV_LINK_PATTERN.exec(existing[0])?.[0];
	const next = direction === 'next' ? link : NEXT_LINK_PATTERN.exec(existing[0])?.[0];

	const rebuiltBlock = buildNavBlock(prev, next, false);

	return content.replace(existing[0], () => rebuiltBlock);
}

export function isCursorAtTagEnd(line: string, cursorColumn: number, tag: string): boolean {
	const textBeforeCursor = line.slice(0, cursorColumn).toLowerCase();

	return textBeforeCursor.endsWith(`#${normalizeTag(tag)}`);
}

function buildLink(direction: NavDirection, noteName: string): string {
	return direction === 'prev' ? `[[${noteName}|← ${noteName}]]` : `[[${noteName}|${noteName} →]]`;
}

function buildNavBlock(prev: string | undefined, next: string | undefined, trailingBlankLine = true): string {
	const row = [prev ?? EMPTY_PREV_SLOT, next].filter(Boolean).join(' ');

	return `> [!log-nav]\n> ${row}\n${trailingBlankLine ? '\n' : ''}`;
}

function insertNavBlock(content: string, navBlock: string): string {
	const { body } = stripFrontmatter(content);
	const frontmatterLength = content.length - body.length;

	return content.slice(0, frontmatterLength) + navBlock + body;
}
