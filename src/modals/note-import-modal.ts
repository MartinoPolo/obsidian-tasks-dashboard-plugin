import { App, FuzzySuggestModal, Notice, SuggestModal, TFile } from 'obsidian';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig, Priority } from '../types';

const DEFAULT_DASHBOARD_FILENAME = 'Dashboard.md';
const PRIORITY_OPTIONS: Priority[] = ['low', 'medium', 'high', 'top'];

const isRootPath = (path: string): boolean => {
	return path === '' || path === '/';
};

const createDashboardPath = (dashboard: DashboardConfig): string => {
	const dashboardFilename = dashboard.dashboardFilename || DEFAULT_DASHBOARD_FILENAME;
	return `${dashboard.rootPath}/${dashboardFilename}`;
};

const isImportableFile = (file: TFile, issuesPath: string, dashboardPath: string): boolean => {
	if (file.path.startsWith(issuesPath)) {
		return false;
	}

	if (file.path === dashboardPath) {
		return false;
	}

	return true;
};

const formatPriority = (priority: Priority): string => {
	return `${priority.charAt(0).toUpperCase()}${priority.slice(1)}`;
};

const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === 'string') {
		return error;
	}

	return 'Unknown error';
};

const focusFirstPrioritySuggestion = (inputEl: HTMLInputElement): void => {
	setTimeout(() => {
		const arrowDownEvent = new KeyboardEvent('keydown', {
			key: 'ArrowDown',
			code: 'ArrowDown',
			bubbles: true
		});
		inputEl.dispatchEvent(arrowDownEvent);
	}, 0);
};

export class NoteImportModal extends FuzzySuggestModal<TFile> {
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;

	constructor(app: App, plugin: TasksDashboardPlugin, dashboard: DashboardConfig) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.setPlaceholder('Search vault notes to import...');
	}

	override getItems(): TFile[] {
		const issuesPath = `${this.dashboard.rootPath}/Issues/`;
		const dashboardPath = createDashboardPath(this.dashboard);

		return this.app.vault
			.getMarkdownFiles()
			.filter((file) => isImportableFile(file, issuesPath, dashboardPath));
	}

	override getItemText(file: TFile): string {
		return file.path;
	}

	override renderSuggestion(match: { item: TFile }, element: HTMLElement): void {
		const file = match.item;
		const container = element.createDiv({ cls: 'tdc-note-import-suggestion' });
		container.createDiv({ cls: 'tdc-note-import-name', text: file.basename });
		const parentPath = file.parent?.path ?? '';
		if (!isRootPath(parentPath)) {
			container.createDiv({ cls: 'tdc-note-import-path', text: parentPath });
		}
	}

	override onChooseItem(file: TFile): void {
		new ImportPriorityModal(this.app, this.plugin, this.dashboard, file).open();
	}
}

class ImportPriorityModal extends SuggestModal<Priority> {
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;
	private readonly sourceFile: TFile;

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

	override onOpen(): void {
		void Promise.resolve(super.onOpen());
		focusFirstPrioritySuggestion(this.inputEl);
	}

	override getSuggestions(): Priority[] {
		return PRIORITY_OPTIONS;
	}

	override renderSuggestion(priority: Priority, el: HTMLElement): void {
		const container = el.createDiv({ cls: 'tdc-priority-suggestion' });
		container.createSpan({ cls: `tdc-priority-dot priority-${priority}` });
		container.createSpan({ text: formatPriority(priority) });
	}

	override onChooseSuggestion(priority: Priority): void {
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
			new Notice(`Error importing note: ${getErrorMessage(error)}`);
		}
	}
}
