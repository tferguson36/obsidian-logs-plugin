import { AbstractInputSuggest, App, TAbstractFile, TFile, TFolder } from 'obsidian';

abstract class PathSuggest<T extends TAbstractFile> extends AbstractInputSuggest<T> {
	constructor(
		app: App,
		private readonly inputEl: HTMLInputElement,
	) {
		super(app, inputEl);
	}

	protected abstract candidates(): T[];

	protected getSuggestions(query: string): T[] {
		const lowerQuery = query.toLowerCase();

		return this.candidates().filter((candidate) => candidate.path.toLowerCase().includes(lowerQuery));
	}

	renderSuggestion(value: T, el: HTMLElement): void {
		el.setText(value.path);
	}

	selectSuggestion(value: T): void {
		this.setValue(value.path);
		this.inputEl.dispatchEvent(new Event('input'));
		this.close();
	}
}

export class FileSuggest extends PathSuggest<TFile> {
	protected candidates(): TFile[] {
		return this.app.vault.getMarkdownFiles();
	}
}

export class FolderSuggest extends PathSuggest<TFolder> {
	protected candidates(): TFolder[] {
		return this.app.vault.getAllFolders();
	}
}
