import { describe, expect, it } from 'vitest';
import {
	buildLogFileName,
	insertNavAfterFrontmatter,
	isCursorAtTagEnd,
	normalizeTag,
	setNavLink,
	stripFrontmatter,
} from './logNote';

describe('normalizeTag', () => {
	it('removes the hash and lowercases', () => {
		expect(normalizeTag('#Test')).toBe('test');
		expect(normalizeTag(' test ')).toBe('test');
	});
});

describe('buildLogFileName', () => {
	it('joins the tag without hash and the date', () => {
		expect(buildLogFileName('#test', '2026-11-15')).toBe('test 2026-11-15');
	});
});

describe('stripFrontmatter', () => {
	it('splits frontmatter from body', () => {
		expect(stripFrontmatter('---\na: 1\n---\nbody')).toEqual({ frontmatter: 'a: 1', body: 'body' });
	});

	it('returns the content untouched when there is no frontmatter', () => {
		expect(stripFrontmatter('body')).toEqual({ frontmatter: '', body: 'body' });
	});
});

describe('insertNavAfterFrontmatter', () => {
	it('inserts the prev link directly after frontmatter', () => {
		const result = insertNavAfterFrontmatter('---\na: 1\n---\nbody', 'test 2026-11-14');

		expect(result).toBe(
			'---\na: 1\n---\n> [!log-nav]\n> [[test 2026-11-14|← test 2026-11-14]]\n\nbody',
		);
	});

	it('inserts at the top when there is no frontmatter', () => {
		expect(insertNavAfterFrontmatter('body', 'a')).toBe('> [!log-nav]\n> [[a|← a]]\n\nbody');
	});
});

describe('setNavLink', () => {
	const withPrev = insertNavAfterFrontmatter('---\na: 1\n---\nbody', 'old');

	it('adds the next link beside the prev link', () => {
		expect(setNavLink(withPrev, 'next', 'new')).toBe(
			'---\na: 1\n---\n> [!log-nav]\n> [[old|← old]] [[new|new →]]\n\nbody',
		);
	});

	it('replaces an existing next link', () => {
		const once = setNavLink(withPrev, 'next', 'first');

		expect(setNavLink(once, 'next', 'second')).toContain('> [[old|← old]] [[second|second →]]');
	});

	it('keeps the next link on the right when there is no prev link', () => {
		expect(setNavLink('---\na: 1\n---\nbody', 'next', 'new')).toBe(
			'---\na: 1\n---\n> [!log-nav]\n> &nbsp; [[new|new →]]\n\nbody',
		);
	});

	it('replaces the placeholder when the prev link is set later', () => {
		const nextOnly = setNavLink('body', 'next', 'new');

		expect(setNavLink(nextOnly, 'prev', 'old')).toContain('> [[old|← old]] [[new|new →]]');
	});

	it('does not interpret replacement patterns in note names', () => {
		expect(setNavLink(withPrev, 'next', "$& $'")).toContain("[[$& $'|$& $' →]]");
	});
});

describe('isCursorAtTagEnd', () => {
	it('is true when the cursor sits right after the tag', () => {
		expect(isCursorAtTagEnd('note #test', 10, '#test')).toBe(true);
	});

	it('is case insensitive', () => {
		expect(isCursorAtTagEnd('note #Test', 10, '#test')).toBe(true);
	});

	it('is false once the cursor has moved past the tag', () => {
		expect(isCursorAtTagEnd('note #test ', 11, '#test')).toBe(false);
	});

	it('is false while a longer tag is being typed', () => {
		expect(isCursorAtTagEnd('note #testing', 13, '#test')).toBe(false);
	});
});
