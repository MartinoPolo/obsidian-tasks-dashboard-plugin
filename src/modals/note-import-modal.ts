import { App, FuzzySuggestModal, Notice, SuggestModal, TFile } from 'obsidian';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig, Priority } from '../types';

export class NoteImportModal extends FuzzySuggestModal<TFile> {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;

	constructor(app: App, plugin: TasksDashboardPlugin, dashboard: DashboardConfig) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.setPlaceholder('Search vault notes to import...');
	}

	getItems(): TFile[] {
		const issuesPath = `${this.dashboard.rootPath}/Issues/`;
		const dashboardFilename = this.dashboard.dashboardFilename || 'Dashboard.md';
		const dashboardPath = `${this.dashboard.rootPath}/${dashboardFilename}`;

		return this.app.vault.getMarkdownFiles().filter((file) => {
			if (file.path.startsWith(issuesPath)) {
				return false;
			}
			if (file.path === dashboardPath) {
				return false;
			}
			return true;
		});
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	renderSuggestion(match: { item: TFile }, element: HTMLElement): void {
		const file = match.item;
		const container = element.createDiv({ cls: 'tdc-note-import-suggestion' });
		container.createDiv({ cls: 'tdc-note-import-name', text: file.basename });
		const parentPath = file.parent?.path ?? '';
		if (parentPath !== '' && parentPath !== '/') {
			container.createDiv({ cls: 'tdc-note-import-path', text: parentPath });
		}
	}

	onChooseItem(file: TFile): void {
		new ImportPriorityModal(this.app, this.plugin, this.dashboard, file).open();
	}
}

class ImportPriorityModal extends SuggestModal<Priority> {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private sourceFile: TFile;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		sourceFile: TFile
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.sourceFile = sourceFile;
		this.setPlaceholder('Select priority');
	}

	onOpen() {
		void Promise.resolve(super.onOpen());
		setTimeout(() => {
			const event = new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				code: 'ArrowDown',
				bubbles: true
			});
			this.inputEl.dispatchEvent(event);
		}, 0);
	}

	getSuggestions(): Priority[] {
		return ['low', 'medium', 'high', 'top'];
	}

	renderSuggestion(priority: Priority, el: HTMLElement) {
		const container = el.createDiv({ cls: 'tdc-priority-suggestion' });
		container.createSpan({ cls: `tdc-priority-dot priority-${priority}` });
		container.createSpan({ text: priority.charAt(0).toUpperCase() + priority.slice(1) });
	}

	onChooseSuggestion(priority: Priority) {
		void this.importNote(priority);
	}

	private async importNote(priority: Priority): Promise<void> {
		try {
			const issue = await this.plugin.issueManager.importNoteAsIssue({
				file: this.sourceFile,
				priority,
				dashboard: this.dashboard
			});
			new Notice(`Imported note as issue: ${issue.name}`);
		} catch (error) {
			new Notice(`Error importing note: ${(error as Error).message}`);
		}
	}
}
