import { App, Modal } from 'obsidian';
import {
	createPromptButtonsContainer,
	createPromptCancelButton,
	createPromptConfirmButton,
	registerEnterShortcut,
	setupPromptModal
} from './modal-helpers';

export interface ArchiveConfirmationResult {
	confirmed: boolean;
	removeWorktree: boolean;
}

export class ArchiveConfirmationModal extends Modal {
	private readonly issueName: string;
	private readonly hasAssociatedWorktree: boolean;
	private readonly onResult: (result: ArchiveConfirmationResult) => void;
	private removeWorktree = true;
	private hasResolved = false;

	constructor(
		app: App,
		issueName: string,
		hasAssociatedWorktree: boolean,
		onResult: (result: ArchiveConfirmationResult) => void
	) {
		super(app);
		this.issueName = issueName;
		this.hasAssociatedWorktree = hasAssociatedWorktree;
		this.onResult = onResult;
	}

	onOpen() {
		setupPromptModal(this, 'Confirm Archive');

		this.renderMessage();
		if (this.hasAssociatedWorktree) {
			this.renderRemoveWorktreeCheckbox();
		}

		const buttonContainer = createPromptButtonsContainer(this.contentEl);
		void createPromptCancelButton(buttonContainer, () => {
			this.cancel();
		});
		void createPromptConfirmButton(
			buttonContainer,
			() => {
				this.confirm();
			},
			'Archive'
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
			text: `Are you sure you want to archive '${this.issueName}'?`,
			cls: 'tdc-delete-message'
		});
	}

	private renderRemoveWorktreeCheckbox() {
		const checkboxContainer = this.contentEl.createDiv({ cls: 'tdc-delete-checkbox-row' });
		const checkboxId = 'tdc-archive-remove-worktree-checkbox';
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
		});
	}

	private cancel() {
		if (this.hasResolved) {
			return;
		}

		this.hasResolved = true;
		this.onResult({ confirmed: false, removeWorktree: this.removeWorktree });
		this.close();
	}

	private confirm() {
		if (this.hasResolved) {
			return;
		}

		this.hasResolved = true;
		this.close();
		this.onResult({ confirmed: true, removeWorktree: this.removeWorktree });
	}

	private registerEnterKeyConfirmation() {
		registerEnterShortcut(this.contentEl, () => {
			this.confirm();
		});
	}
}
