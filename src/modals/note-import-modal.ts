import { App, FuzzySuggestModal, Notice, TFile } from 'obsidian';
import type { Component } from 'svelte';
import type TasksDashboardPlugin from '../../main';
import { getErrorMessage } from '../settings/settings-helpers';
import type { DashboardConfig, Priority } from '../types';
import { getDashboardPath } from '../utils/dashboard-path';
import PrioritySelector from '../components/modals/PrioritySelector.svelte';
import { SvelteModal } from './SvelteModal';

const isRootPath = (path: string): boolean => {
	return path === '' || path === '/';
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

async function importNoteWithPriority(
	plugin: TasksDashboardPlugin,
	dashboard: DashboardConfig,
	file: TFile,
	priority: Priority
): Promise<void> {
	try {
		const issue = await plugin.issueManager.importNoteAsIssue({
			file,
			priority,
			dashboard
		});
		new Notice(`Imported note as issue: ${issue.name}`);
	} catch (error) {
		new Notice(`Error importing note: ${getErrorMessage(error)}`);
	}
}

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
		const dashboardPath = getDashboardPath(this.dashboard);

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
		if (this.dashboard.prioritiesEnabled === false) {
			void importNoteWithPriority(this.plugin, this.dashboard, file, 'low');
			return;
		}
		new ImportPriorityModal(this.app, this.plugin, this.dashboard, file).open();
	}
}

class ImportPriorityModal extends SvelteModal {
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
	}

	protected getComponent(): Component {
		return PrioritySelector as Component;
	}

	protected getProps(): Record<string, unknown> {
		return {
			title: 'Select priority',
			onselect: (priority: Priority) => {
				this.close();
				void importNoteWithPriority(this.plugin, this.dashboard, this.sourceFile, priority);
			},
			oncancel: () => this.close()
		};
	}
}
