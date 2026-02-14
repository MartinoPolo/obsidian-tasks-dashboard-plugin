import { App, Modal, Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig } from '../types';
import { createPlatformService } from '../utils/platform';

export class FolderPathModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueId: string | undefined;
	private input!: HTMLInputElement;

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

	onOpen() {
		const { contentEl, modalEl, containerEl } = this;
		const currentValue = this.getCurrentValue();

		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');
		contentEl.empty();

		const title = this.issueId !== undefined ? 'Issue Folder' : 'Project Folder';
		contentEl.createEl('div', { cls: 'tdc-prompt-title', text: title });
		contentEl.createEl('p', {
			text: 'Enter the absolute path to your project folder on disk.',
			cls: 'setting-item-description'
		});
		this.input = contentEl.createEl('input', {
			type: 'text',
			cls: 'tdc-prompt-input',
			attr: { placeholder: 'C:\\Projects\\MyApp' },
			value: currentValue ?? ''
		});
		this.input.focus();
		if (currentValue !== undefined) {
			this.input.select();
		}

		const browseBtn = contentEl.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-browse',
			text: 'Browse...'
		});
		browseBtn.addEventListener('click', () => {
			const platformService = createPlatformService();
			const inputValue = this.input.value.trim();
			void platformService
				.pickFolder(inputValue !== '' ? inputValue : undefined)
				.then((folderPath) => {
					if (folderPath !== undefined) {
						this.input.value = folderPath;
						this.input.focus();
					}
				});
		});

		const btnContainer = contentEl.createDiv({ cls: 'tdc-prompt-buttons' });
		const confirmBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-confirm'
		});
		confirmBtn.innerHTML = 'Save <kbd>↵</kbd>';
		confirmBtn.addEventListener('click', () => {
			this.confirm();
		});

		if (currentValue !== undefined) {
			const clearBtn = btnContainer.createEl('button', {
				cls: 'tdc-prompt-btn tdc-prompt-btn-cancel'
			});
			clearBtn.textContent = 'Clear';
			clearBtn.addEventListener('click', () => {
				this.setValue(undefined);
				void this.plugin.saveSettings();
				this.plugin.rerenderDashboardViews();
				new Notice('Project folder cleared');
				this.close();
			});
		}

		const cancelBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-cancel'
		});
		cancelBtn.innerHTML = 'Cancel <kbd>Esc</kbd>';
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		this.input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				this.confirm();
			}
		});
	}

	private confirm() {
		const value = this.input.value.trim();
		if (value === '') {
			this.setValue(undefined);
		} else {
			this.setValue(value);
		}
		void this.plugin.saveSettings();
		this.plugin.rerenderDashboardViews();
		new Notice(value !== '' ? `Project folder set: ${value}` : 'Project folder cleared');
		this.close();
	}

	onClose() {
		this.contentEl.empty();
	}
}
