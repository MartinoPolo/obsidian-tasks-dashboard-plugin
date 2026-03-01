import { App, Modal } from 'obsidian';
import { setupPromptModal } from './modal-helpers';

export interface DashboardDeleteResult {
	confirmed: boolean;
	deleteFiles: boolean;
}

export class DashboardDeleteConfirmationModal extends Modal {
	private readonly dashboardName: string;
	private readonly onResult: (result: DashboardDeleteResult) => void;
	private deleteFiles = false;

	constructor(app: App, dashboardName: string, onResult: (result: DashboardDeleteResult) => void) {
		super(app);
		this.dashboardName = dashboardName;
		this.onResult = onResult;
	}

	onOpen() {
		setupPromptModal(this, 'Delete Dashboard');
		this.renderDeleteMessage();
		this.renderDeleteFilesCheckbox();
		this.renderActionButtons();
		this.registerKeyboardShortcuts();
	}

	onClose() {
		this.contentEl.empty();
	}

	private renderDeleteMessage() {
		this.contentEl.createEl('p', {
			text: `Are you sure you want to remove the dashboard "${this.dashboardName}" from settings?`,
			cls: 'tdc-delete-message'
		});
	}

	private renderDeleteFilesCheckbox() {
		const checkboxContainer = this.contentEl.createDiv({ cls: 'tdc-delete-checkbox-row' });
		const checkboxId = 'tdc-delete-files-checkbox';
		const checkbox = checkboxContainer.createEl('input', {
			type: 'checkbox',
			attr: { id: checkboxId }
		});
		checkboxContainer.createEl('label', {
			text: 'Also delete Dashboard file and Issues folder (moved to system trash)',
			attr: { for: checkboxId }
		});
		checkbox.addEventListener('change', () => {
			this.deleteFiles = checkbox.checked;
		});
	}

	private renderActionButtons() {
		const btnContainer = this.contentEl.createDiv({ cls: 'tdc-prompt-buttons' });

		const cancelBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-cancel'
		});
		cancelBtn.innerHTML = 'Cancel <kbd>Esc</kbd>';
		cancelBtn.addEventListener('click', () => {
			this.handleCancel();
		});

		const deleteBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-delete'
		});
		deleteBtn.innerHTML = 'Delete <kbd>↵</kbd>';
		deleteBtn.addEventListener('click', () => {
			this.handleConfirm();
		});
	}

	private registerKeyboardShortcuts() {
		this.contentEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				this.handleConfirm();
			}
		});
	}

	private handleCancel() {
		this.close();
	}

	private handleConfirm() {
		this.close();
		this.onResult({ confirmed: true, deleteFiles: this.deleteFiles });
	}
}
