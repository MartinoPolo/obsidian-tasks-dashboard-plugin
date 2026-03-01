import { App, Modal } from 'obsidian';
import {
	createPromptShortcutButton,
	registerEnterShortcut,
	setupPromptModal
} from './modal-helpers';

export class DeleteConfirmationModal extends Modal {
	private issueName: string;
	private onConfirm: () => void;

	constructor(app: App, issueName: string, onConfirm: () => void) {
		super(app);
		this.issueName = issueName;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		setupPromptModal(this, 'Confirm Delete');

		this.renderMessage();

		const btnContainer = this.contentEl.createDiv({ cls: 'tdc-prompt-buttons' });
		void createPromptShortcutButton(
			btnContainer,
			'Cancel',
			'Esc',
			'tdc-prompt-btn-cancel',
			() => {
				this.close();
			}
		);
		void createPromptShortcutButton(
			btnContainer,
			'Delete',
			'↵',
			'tdc-prompt-btn-delete',
			() => {
				this.confirmDelete();
			}
		);

		this.registerEnterKeyConfirmation();
	}

	onClose() {
		this.contentEl.empty();
	}

	private renderMessage() {
		this.contentEl.createEl('p', {
			text: `Are you sure you want to delete '${this.issueName}'? This will move the file to trash.`,
			cls: 'tdc-delete-message'
		});
	}

	private confirmDelete() {
		this.close();
		this.onConfirm();
	}

	private registerEnterKeyConfirmation() {
		registerEnterShortcut(this.contentEl, () => {
			this.confirmDelete();
		});
	}
}
