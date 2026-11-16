import { MarkdownView, Notice, TFile, getAllTags, moment, normalizePath, parseYaml } from 'obsidian';
import type { App } from 'obsidian';
import {
	buildLogFileName,
	insertNavAfterFrontmatter,
	isCursorAtTagEnd,
	normalizeTag,
	setNavLink,
	stripFrontmatter,
} from './logNote';
import { DEFAULT_DATE_FORMAT } from './settings';
import type { LogRule, TagLogsSettings } from './settings';

const PROCESSED_KEY = 'log-processed';

export class LogProcessor {
	private readonly filesInFlight = new Set<TFile>();

	constructor(
		private readonly app: App,
		private readonly settings: TagLogsSettings,
	) {}

	async handleChange(file: TFile): Promise<void> {
		const rule = this.findRuleToProcess(file);

		if (!rule) {
			return;
		}

		this.filesInFlight.add(file);

		try {
			await this.process(file, rule);
		} catch (error) {
			console.error('Tag Logs: failed to process note', error);
			new Notice('Failed to process note. See the console for details.');
		} finally {
			this.filesInFlight.delete(file);
		}
	}

	private findRuleToProcess(file: TFile): LogRule | undefined {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);

		if (!view || view.file !== file || this.filesInFlight.has(file)) {
			return undefined;
		}

		const cache = this.app.metadataCache.getFileCache(file);

		if (!cache || cache.frontmatter?.[PROCESSED_KEY] === true) {
			return undefined;
		}

		const tags = getAllTags(cache) ?? [];
		const rule = this.settings.rules.find(
			(candidate) =>
				normalizeTag(candidate.tag) !== '' &&
				tags.some((tag) => normalizeTag(tag) === normalizeTag(candidate.tag)),
		);

		if (!rule || normalizePath(rule.templatePath) === file.path) {
			return undefined;
		}

		const cursor = view.editor.getCursor();
		const isStillTyping = isCursorAtTagEnd(view.editor.getLine(cursor.line), cursor.ch, rule.tag);

		return isStillTyping ? undefined : rule;
	}

	private async process(file: TFile, rule: LogRule): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			frontmatter[PROCESSED_KEY] = true;
		});

		const previousEntry = this.findPreviousEntry(file, rule);

		await this.appendTemplate(file, rule);
		await this.moveToLogFolder(file, rule);

		if (previousEntry) {
			await this.app.vault.process(file, (content) => insertNavAfterFrontmatter(content, previousEntry.basename));
			await this.app.vault.process(previousEntry, (content) => setNavLink(content, 'next', file.basename));
		}
	}

	private findPreviousEntry(file: TFile, rule: LogRule): TFile | undefined {
		const entries = this.app.vault.getMarkdownFiles().filter((candidate) => {
			const cache = this.app.metadataCache.getFileCache(candidate);
			const tags = cache ? (getAllTags(cache) ?? []) : [];

			return (
				candidate !== file &&
				cache?.frontmatter?.[PROCESSED_KEY] === true &&
				tags.some((tag) => normalizeTag(tag) === normalizeTag(rule.tag))
			);
		});

		return entries.reduce<TFile | undefined>(
			(latest, entry) => (!latest || entry.stat.ctime > latest.stat.ctime ? entry : latest),
			undefined,
		);
	}

	private async appendTemplate(file: TFile, rule: LogRule): Promise<void> {
		const templateFile = this.app.vault.getFileByPath(normalizePath(rule.templatePath));

		if (!templateFile) {
			new Notice(`Template note "${rule.templatePath}" not found.`);
			return;
		}

		const { frontmatter, body } = stripFrontmatter(await this.app.vault.cachedRead(templateFile));
		const templateProperties = (frontmatter ? parseYaml(frontmatter) : null) as Record<string, unknown> | null;

		if (templateProperties) {
			await this.app.fileManager.processFrontMatter(file, (properties: Record<string, unknown>) => {
				for (const [key, value] of Object.entries(templateProperties)) {
					properties[key] ??= value;
				}
			});
		}

		if (body.trim()) {
			await this.app.vault.process(file, (content) => `${content.trimEnd()}\n\n${body}`);
		}
	}

	private async moveToLogFolder(file: TFile, rule: LogRule): Promise<void> {
		const folder = normalizePath(rule.folder);
		const isRoot = folder === '/' || folder === '.';

		if (!isRoot) {
			await this.ensureFolderExists(folder);
		}

		const baseName = buildLogFileName(rule.tag, moment().format(rule.dateFormat || DEFAULT_DATE_FORMAT));
		const pathPrefix = isRoot ? '' : `${folder}/`;
		let path = `${pathPrefix}${baseName}.md`;

		for (let attempt = 2; this.app.vault.getAbstractFileByPath(path); attempt++) {
			path = `${pathPrefix}${baseName} ${attempt}.md`;
		}

		await this.app.fileManager.renameFile(file, path);
	}

	private async ensureFolderExists(folder: string): Promise<void> {
		let currentPath = '';

		for (const segment of folder.split('/')) {
			currentPath = currentPath ? `${currentPath}/${segment}` : segment;

			if (!this.app.vault.getFolderByPath(currentPath)) {
				await this.app.vault.createFolder(currentPath);
			}
		}
	}
}
