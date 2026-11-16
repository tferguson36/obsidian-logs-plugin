import { App, PluginSettingTab, Setting, moment } from 'obsidian';
import TagLogsPlugin from './main';
import { buildLogFileName } from './logNote';
import { FileSuggest, FolderSuggest } from './suggest';

export interface LogRule {
	tag: string;
	dateFormat: string;
	templatePath: string;
	folder: string;
}

export interface TagLogsSettings {
	rules: LogRule[];
}

export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';

export const DEFAULT_SETTINGS: TagLogsSettings = {
	rules: [],
};

export class TagLogsSettingTab extends PluginSettingTab {
	plugin: TagLogsPlugin;

	constructor(app: App, plugin: TagLogsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		for (const rule of this.plugin.settings.rules) {
			this.renderRule(containerEl, rule);
		}

		new Setting(containerEl).addButton((button) =>
			button
				.setButtonText('Add rule')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.rules.push({
						tag: '#',
						dateFormat: DEFAULT_DATE_FORMAT,
						templatePath: '',
						folder: '',
					});
					await this.plugin.saveSettings();
					this.display();
				}),
		);
	}

	private renderRule(containerEl: HTMLElement, rule: LogRule): void {
		const ruleEl = containerEl.createDiv();
		let fileNamePreview: HTMLElement;

		new Setting(ruleEl)
			.setName('Tag')
			.setDesc('Tag that triggers this rule, for example #test.')
			.addText((text) =>
				text.setValue(rule.tag).onChange(async (value) => {
					rule.tag = value.trim();
					fileNamePreview.setText(this.previewFileName(rule));
					await this.plugin.saveSettings();
				}),
			)
			.addExtraButton((button) =>
				button
					.setIcon('trash')
					.setTooltip('Delete rule')
					.onClick(async () => {
						this.plugin.settings.rules.remove(rule);
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		const dateFormatSetting = new Setting(ruleEl).setName('Date format').addText((text) =>
			text
				.setPlaceholder(DEFAULT_DATE_FORMAT)
				.setValue(rule.dateFormat)
				.onChange(async (value) => {
					rule.dateFormat = value;
					fileNamePreview.setText(this.previewFileName(rule));
					await this.plugin.saveSettings();
				}),
		);

		fileNamePreview = dateFormatSetting.descEl.createSpan({ text: this.previewFileName(rule) });

		new Setting(ruleEl)
			.setName('Template note')
			.setDesc('Note whose content is appended to the log.')
			.addText((text) => {
				new FileSuggest(this.app, text.inputEl);
				text.setValue(rule.templatePath).onChange(async (value) => {
					rule.templatePath = value.trim();
					await this.plugin.saveSettings();
				});
			});

		new Setting(ruleEl)
			.setName('Folder')
			.setDesc('Folder the log is moved to. Leave empty for the vault root.')
			.addText((text) => {
				new FolderSuggest(this.app, text.inputEl);
				text.setValue(rule.folder).onChange(async (value) => {
					rule.folder = value.trim();
					await this.plugin.saveSettings();
				});
			});
	}

	private previewFileName(rule: LogRule): string {
		return `${buildLogFileName(rule.tag, moment().format(rule.dateFormat || DEFAULT_DATE_FORMAT))}.md`;
	}
}
