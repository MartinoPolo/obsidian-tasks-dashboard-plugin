import { App, Modal } from 'obsidian';
import {
	createPromptButtonsContainer,
	createPromptCancelButton,
	createPromptConfirmButton,
	registerEnterShortcut,
	setupPromptModal
} from './modal-helpers';

export interface DashboardDeleteResult {
	confirmed: boolean;
	deleteFiles: boolean;
}

export class DashboardDeleteConfirmationModal extends Modal {
	private readonly dashboardName: string;
	private readonly onResult: (result: DashboardDeleteResult) => void;
	private deleteFiles = false;
	private hasResolved = false;

	constructor(
		app: App,
		dashboardName: string,
		onResult: (result: DashboardDeleteResult) => void
	) {
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
		if (!this.hasResolved) {
			this.hasResolved = true;
			this.onResult({ confirmed: false, deleteFiles: this.deleteFiles });
		}
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
			text: 'Also delete dashboard file and issues folder (moved to system trash)',
			attr: { for: checkboxId }
		});
		checkbox.addEventListener('change', () => {
			this.deleteFiles = checkbox.checked;
		});
	}

	private renderActionButtons() {
		const btnContainer = createPromptButtonsContainer(this.contentEl);

		void createPromptCancelButton(btnContainer, () => {
			this.handleCancel();
		});

		void createPromptConfirmButton(
			btnContainer,
			() => {
				this.handleConfirm();
			},
			'Delete',
			'tdc-prompt-btn-delete'
		);
	}

	private registerKeyboardShortcuts() {
		registerEnterShortcut(this.contentEl, () => {
			this.handleConfirm();
		});
	}

	private handleCancel() {
		if (this.hasResolved) {
			return;
		}

		this.hasResolved = true;
		this.onResult({ confirmed: false, deleteFiles: this.deleteFiles });
		this.close();
	}

	private handleConfirm() {
		if (this.hasResolved) {
			return;
		}

		this.hasResolved = true;
		this.close();
		this.onResult({ confirmed: true, deleteFiles: this.deleteFiles });
	}
}
