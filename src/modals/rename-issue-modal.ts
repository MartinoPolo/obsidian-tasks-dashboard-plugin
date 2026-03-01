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
	private input: HTMLInputElement | undefined;

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
		const input = createInputWithEnterHandler(
			this.contentEl,
			'Enter new name...',
			() => void this.confirm()
		);
		input.value = this.currentName;
		input.select();
		this.input = input;
		createConfirmCancelButtons(
			this.contentEl,
			'Rename',
			() => void this.confirm(),
			() => this.close()
		);
	}

	private getInput(): HTMLInputElement | undefined {
		return this.input;
	}

	private async confirm() {
		const input = this.getInput();
		if (input === undefined) {
			return;
		}

		const value = input.value.trim();
		if (value === '') {
			input.addClass('tdc-input-error');
			input.focus();
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
			const message = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Error renaming issue: ${message}`);
		}
	}

	onClose() {
		this.input = undefined;
		this.contentEl.empty();
	}
}
