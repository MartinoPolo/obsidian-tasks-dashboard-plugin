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

		this.renderMessage();

		const btnContainer = this.contentEl.createDiv({ cls: 'tdc-prompt-buttons' });
		this.createButton(
			btnContainer,
			'tdc-prompt-btn tdc-prompt-btn-cancel',
			'Cancel <kbd>Esc</kbd>',
			() => {
				this.close();
			}
		);
		this.createButton(
			btnContainer,
			'tdc-prompt-btn tdc-prompt-btn-delete',
			'Delete <kbd>↵</kbd>',
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

	private createButton(
		containerEl: HTMLElement,
		className: string,
		labelHtml: string,
		onClick: () => void
	) {
		const button = containerEl.createEl('button', {
			cls: className
		});
		button.innerHTML = labelHtml;
		button.addEventListener('click', onClick);
	}

	private confirmDelete() {
		this.close();
		this.onConfirm();
	}

	private registerEnterKeyConfirmation() {
		this.contentEl.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter') {
				return;
			}

			event.preventDefault();
			this.confirmDelete();
		});
	}
}
