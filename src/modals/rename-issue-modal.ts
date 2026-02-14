import { App, Modal, Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig } from '../types';
import {
	setupPromptModal,
	createConfirmCancelButtons,
	createInputWithEnterHandler
} from './modal-helpers';

export class RenameIssueModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueId: string;
	private currentName: string;
	private input!: HTMLInputElement;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueId: string,
		currentName: string
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueId = issueId;
		this.currentName = currentName;
	}

	onOpen() {
		setupPromptModal(this, 'Rename Issue');
		this.input = createInputWithEnterHandler(
			this.contentEl,
			'Enter new name...',
			() => void this.confirm()
		);
		this.input.value = this.currentName;
		this.input.select();
		createConfirmCancelButtons(
			this.contentEl,
			'Rename',
			() => void this.confirm(),
			() => this.close()
		);
	}

	private async confirm() {
		const value = this.input.value.trim();
		if (value === '') {
			this.input.addClass('tdc-input-error');
			this.input.focus();
			return;
		}
		if (value === this.currentName) {
			this.close();
			return;
		}
		this.close();
		try {
			await this.plugin.issueManager.renameIssue(this.dashboard, this.issueId, value);
		} catch (error) {
			new Notice(`Error renaming issue: ${(error as Error).message}`);
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}
