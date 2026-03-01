import { App, Modal, Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig } from '../types';
import { createPlatformService } from '../utils/platform';

export class FolderPathModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueId: string | undefined;
	private input: HTMLInputElement | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueId?: string
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueId = issueId;
	}

	private getStorageKey(): string | undefined {
		if (this.issueId === undefined) {
			return undefined;
		}
		return `${this.dashboard.id}:${this.issueId}`;
	}

	private getCurrentValue(): string | undefined {
		const key = this.getStorageKey();
		if (key !== undefined) {
			return this.plugin.settings.issueFolders[key];
		}
		return this.dashboard.projectFolder;
	}

	private setValue(value: string | undefined): void {
		const key = this.getStorageKey();
		if (key !== undefined) {
			if (value === undefined) {
				delete this.plugin.settings.issueFolders[key];
			} else {
				this.plugin.settings.issueFolders[key] = value;
			}
		} else {
			this.dashboard.projectFolder = value;
		}
	}

	private getModalTitle(): string {
		if (this.issueId !== undefined) {
			return 'Issue Folder';
		}
		return 'Project Folder';
	}

	private persistChanges(noticeMessage: string): void {
		void this.plugin.saveSettings();
		this.plugin.triggerDashboardRefresh();
		new Notice(noticeMessage);
		this.close();
	}

	private createInput(contentEl: HTMLElement, currentValue: string | undefined): HTMLInputElement {
		const input = contentEl.createEl('input', {
			type: 'text',
			cls: 'tdc-prompt-input',
			attr: { placeholder: 'C:\\Projects\\MyApp' },
			value: currentValue ?? ''
		});

		input.focus();
		if (currentValue !== undefined) {
			input.select();
		}

		input.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				this.confirm();
			}
		});

		return input;
	}

	private createBrowseButton(contentEl: HTMLElement): void {
		const browseButton = contentEl.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-browse',
			text: 'Browse...'
		});

		browseButton.addEventListener('click', () => {
			void this.handleBrowseClick();
		});
	}

	private async handleBrowseClick(): Promise<void> {
		if (this.input === undefined) {
			return;
		}

		const platformService = createPlatformService();
		const inputValue = this.input.value.trim();
		const folderPath = await platformService.pickFolder(inputValue !== '' ? inputValue : undefined);
		if (folderPath !== undefined) {
			this.input.value = folderPath;
			this.input.focus();
		}
	}

	private createActionButtons(contentEl: HTMLElement, currentValue: string | undefined): void {
		const buttonsContainer = contentEl.createDiv({ cls: 'tdc-prompt-buttons' });

		const confirmButton = buttonsContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-confirm'
		});
		confirmButton.innerHTML = 'Save <kbd>↵</kbd>';
		confirmButton.addEventListener('click', () => {
			this.confirm();
		});

		if (currentValue !== undefined) {
			const clearButton = buttonsContainer.createEl('button', {
				cls: 'tdc-prompt-btn tdc-prompt-btn-cancel'
			});
			clearButton.textContent = 'Clear';
			clearButton.addEventListener('click', () => {
				this.setValue(undefined);
				this.persistChanges('Project folder cleared');
			});
		}

		const cancelButton = buttonsContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-cancel'
		});
		cancelButton.innerHTML = 'Cancel <kbd>Esc</kbd>';
		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}

	onOpen() {
		const { contentEl, modalEl, containerEl } = this;
		const currentValue = this.getCurrentValue();

		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');
		contentEl.empty();

		contentEl.createEl('div', { cls: 'tdc-prompt-title', text: this.getModalTitle() });
		contentEl.createEl('p', {
			text: 'Enter the absolute path to your project folder on disk.',
			cls: 'setting-item-description'
		});
		this.input = this.createInput(contentEl, currentValue);
		this.createBrowseButton(contentEl);
		this.createActionButtons(contentEl, currentValue);
	}

	private confirm() {
		const inputValue = this.input?.value.trim() ?? '';
		if (inputValue === '') {
			this.setValue(undefined);
			this.persistChanges('Project folder cleared');
			return;
		}

		this.setValue(inputValue);
		this.persistChanges(`Project folder set: ${inputValue}`);
	}

	onClose() {
		this.input = undefined;
		this.contentEl.empty();
	}
}
