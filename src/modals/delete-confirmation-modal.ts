import { App, Modal } from 'obsidian';
import { setupPromptModal } from './modal-helpers';

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

		this.contentEl.createEl('p', {
			text: `Are you sure you want to delete '${this.issueName}'? This will move the file to trash.`,
			cls: 'tdc-delete-message'
		});

		const btnContainer = this.contentEl.createDiv({ cls: 'tdc-prompt-buttons' });

		const cancelBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-cancel'
		});
		cancelBtn.innerHTML = 'Cancel <kbd>Esc</kbd>';
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		const deleteBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-delete'
		});
		deleteBtn.innerHTML = 'Delete <kbd>↵</kbd>';
		deleteBtn.addEventListener('click', () => {
			this.close();
			this.onConfirm();
		});

		this.contentEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				this.close();
				this.onConfirm();
			}
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}
