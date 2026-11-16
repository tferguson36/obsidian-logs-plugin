import { Plugin } from 'obsidian';
import { LogProcessor } from './processor';
import { DEFAULT_SETTINGS, TagLogsSettings, TagLogsSettingTab } from './settings';

export default class TagLogsPlugin extends Plugin {
	settings: TagLogsSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new TagLogsSettingTab(this.app, this));

		const processor = new LogProcessor(this.app, this.settings);

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(this.app.metadataCache.on('changed', (file) => void processor.handleChange(file)));
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<TagLogsSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
