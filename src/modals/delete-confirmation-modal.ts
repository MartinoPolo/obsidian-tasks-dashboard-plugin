import { App, Modal } from 'obsidian';
import {
	createPromptButtonsContainer,
	createPromptCancelButton,
	createPromptConfirmButton,
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
	private readonly onRemoveWorktreeChange?: (checked: boolean) => void;
	private readonly onResult: (result: DeleteConfirmationResult) => void;
	private removeWorktree = false;
	private hasResolved = false;

	constructor(
		app: App,
		issueName: string,
		hasAssociatedWorktree: boolean,
		initialRemoveWorktree: boolean,
		onRemoveWorktreeChange: ((checked: boolean) => void) | undefined,
		onResult: (result: DeleteConfirmationResult) => void
	) {
		super(app);
		this.issueName = issueName;
		this.hasAssociatedWorktree = hasAssociatedWorktree;
		this.removeWorktree = hasAssociatedWorktree ? initialRemoveWorktree : false;
		this.onRemoveWorktreeChange = onRemoveWorktreeChange;
		this.onResult = onResult;
	}

	onOpen() {
		setupPromptModal(this, 'Confirm Delete');

		this.renderMessage();
		if (this.hasAssociatedWorktree) {
			this.renderRemoveWorktreeCheckbox();
		}

		const btnContainer = createPromptButtonsContainer(this.contentEl);
		void createPromptCancelButton(btnContainer, () => {
			this.cancelDelete();
		});
		void createPromptConfirmButton(
			btnContainer,
			() => {
				this.confirmDelete();
			},
			'Delete',
			'tdc-prompt-btn-delete'
		);

		this.registerEnterKeyConfirmation();
	}

	onClose() {
		if (!this.hasResolved) {
			this.hasResolved = true;
			this.onResult({ confirmed: false, removeWorktree: this.removeWorktree });
		}
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
		checkbox.checked = this.removeWorktree;
		checkboxContainer.createEl('label', {
			text: 'Also remove associated worktree',
			attr: { for: checkboxId }
		});
		checkbox.addEventListener('change', () => {
			this.removeWorktree = checkbox.checked;
			this.onRemoveWorktreeChange?.(checkbox.checked);
		});
	}

	private cancelDelete() {
		if (this.hasResolved) {
			return;
		}

		this.hasResolved = true;
		this.onResult({ confirmed: false, removeWorktree: this.removeWorktree });
		this.close();
	}

	private confirmDelete() {
		if (this.hasResolved) {
			return;
		}

		this.hasResolved = true;
		this.close();
		this.onResult({ confirmed: true, removeWorktree: this.removeWorktree });
	}

	private registerEnterKeyConfirmation() {
		registerEnterShortcut(this.contentEl, () => {
			this.confirmDelete();
		});
	}
}
