import { App, Modal } from 'obsidian';
import {
	createPromptShortcutButton,
	registerEnterShortcut,
	setupPromptModal
} from './modal-helpers';

export interface DeleteConfirmationResult {
	confirmed: boolean;
	removeWorktree: boolean;
}

export class DeleteConfirmationModal extends Modal {
	private readonly issueName: string;
	private readonly hasAssociatedWorktree: boolean;
	private readonly onResult: (result: DeleteConfirmationResult) => void;
	private removeWorktree = false;

	constructor(
		app: App,
		issueName: string,
		hasAssociatedWorktree: boolean,
		onResult: (result: DeleteConfirmationResult) => void
	) {
		super(app);
		this.issueName = issueName;
		this.hasAssociatedWorktree = hasAssociatedWorktree;
		this.onResult = onResult;
	}

	onOpen() {
		setupPromptModal(this, 'Confirm Delete');

		this.renderMessage();
		if (this.hasAssociatedWorktree) {
			this.renderRemoveWorktreeCheckbox();
		}

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

	private renderRemoveWorktreeCheckbox() {
		const checkboxContainer = this.contentEl.createDiv({ cls: 'tdc-delete-checkbox-row' });
		const checkboxId = 'tdc-delete-remove-worktree-checkbox';
		const checkbox = checkboxContainer.createEl('input', {
			type: 'checkbox',
			attr: { id: checkboxId }
		});
		checkboxContainer.createEl('label', {
			text: 'Also remove associated worktree',
			attr: { for: checkboxId }
		});
		checkbox.addEventListener('change', () => {
			this.removeWorktree = checkbox.checked;
		});
	}

	private confirmDelete() {
		this.close();
		this.onResult({ confirmed: true, removeWorktree: this.removeWorktree });
	}

	private registerEnterKeyConfirmation() {
		registerEnterShortcut(this.contentEl, () => {
			this.confirmDelete();
		});
	}
}
