import { App, FuzzySuggestModal, Modal, Notice, TFile } from 'obsidian';
import type TasksDashboardPlugin from '../../main';
import { getErrorMessage } from '../settings/settings-helpers';
import type { DashboardConfig, Priority } from '../types';
import { getDashboardPath } from '../utils/dashboard-path';
import {
	createPromptButtonsContainer,
	createPromptCancelButton,
	createPromptConfirmButton,
	setupPromptModal
} from './modal-helpers';
import {
	applySingleSelectionPressedState,
	getWrappedIndex,
	handleListNavigationKeydown
} from './modal-keyboard-helpers';

const PRIORITY_OPTIONS: Priority[] = ['low', 'medium', 'high', 'top'];

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

const formatPriority = (priority: Priority): string => {
	return `${priority.charAt(0).toUpperCase()}${priority.slice(1)}`;
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
		new ImportPriorityModal(this.app, this.plugin, this.dashboard, file).open();
	}
}

class ImportPriorityModal extends Modal {
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;
	private readonly sourceFile: TFile;
	private selectedPriority: Priority = PRIORITY_OPTIONS[0];
	private priorityButtons: Map<Priority, HTMLButtonElement> = new Map();

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

	override onOpen(): void {
		setupPromptModal(this, 'Select priority');
		const priorityList = this.contentEl.createDiv({ cls: 'tdc-selectable-option-list' });

		for (const priority of PRIORITY_OPTIONS) {
			const optionButton = priorityList.createEl('button', {
				cls: 'tdc-selectable-option-btn',
				attr: {
					type: 'button',
					'aria-pressed': 'false'
				}
			});
			const container = optionButton.createDiv({ cls: 'tdc-priority-suggestion' });
			container.createSpan({ cls: `tdc-priority-dot priority-${priority}` });
			container.createSpan({ text: formatPriority(priority) });
			optionButton.addEventListener('click', () => {
				this.selectPriority(priority, true);
			});
			this.priorityButtons.set(priority, optionButton);
		}

		this.selectPriority(this.selectedPriority, true);

		const buttonContainer = createPromptButtonsContainer(this.contentEl);
		void createPromptCancelButton(buttonContainer, () => {
			this.close();
		});
		void createPromptConfirmButton(buttonContainer, () => {
			this.confirmSelection();
		});

		this.contentEl.addEventListener('keydown', (event) => {
			this.handleKeydown(event);
		});
	}

	private handleKeydown(event: KeyboardEvent): void {
		handleListNavigationKeydown(event, {
			onNext: () => {
				this.moveSelection(1);
			},
			onPrevious: () => {
				this.moveSelection(-1);
			},
			onClose: () => {
				this.close();
			},
			onConfirm: () => {
				this.confirmSelection();
			}
		});
	}

	private moveSelection(step: number): void {
		const currentIndex = PRIORITY_OPTIONS.indexOf(this.selectedPriority);
		const nextIndex = getWrappedIndex(currentIndex, step, PRIORITY_OPTIONS.length);
		this.selectPriority(PRIORITY_OPTIONS[nextIndex], true);
	}

	private selectPriority(priority: Priority, focusButton: boolean): void {
		this.selectedPriority = priority;
		applySingleSelectionPressedState(this.priorityButtons, priority, focusButton);
	}

	private confirmSelection(): void {
		this.close();
		void this.importNote(this.selectedPriority);
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
