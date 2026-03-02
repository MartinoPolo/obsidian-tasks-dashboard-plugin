import { App, Modal } from 'obsidian';
import {
	createPromptShortcutButton,
	registerEnterShortcut,
	setupPromptModal
} from './modal-helpers';

export interface ArchiveConfirmationResult {
	removeWorktree: boolean;
}

export class ArchiveConfirmationModal extends Modal {
	private readonly issueName: string;
	private readonly onResult: (result: ArchiveConfirmationResult) => void;
	private hasResolved = false;

	constructor(
		app: App,
		issueName: string,
		onResult: (result: ArchiveConfirmationResult) => void
	) {
		super(app);
		this.issueName = issueName;
		this.onResult = onResult;
	}

	onOpen() {
		setupPromptModal(this, 'Worktree linked');
		this.renderMessage();
		this.renderActionButtons();
		this.registerKeyboardShortcuts();
	}

	onClose() {
		if (!this.hasResolved) {
			this.hasResolved = true;
			this.onResult({ removeWorktree: false });
		}
		this.contentEl.empty();
	}

	private renderMessage() {
		this.contentEl.createEl('p', {
			text: `Remove associated worktree for '${this.issueName}' before archiving?`,
			cls: 'tdc-delete-message'
		});
	}

	private renderActionButtons() {
		const buttonContainer = this.contentEl.createDiv({ cls: 'tdc-prompt-buttons' });

		void createPromptShortcutButton(
			buttonContainer,
			'Keep worktree',
			'Esc',
			'tdc-prompt-btn-cancel',
			() => {
				this.submit(false);
			}
		);

		void createPromptShortcutButton(
			buttonContainer,
			'Remove worktree',
			'↵',
			'tdc-prompt-btn-confirm',
			() => {
				this.submit(true);
			}
		);
	}

	private registerKeyboardShortcuts() {
		registerEnterShortcut(this.contentEl, () => {
			this.submit(true);
		});
	}

	private submit(removeWorktree: boolean) {
		if (this.hasResolved) {
			return;
		}

		this.hasResolved = true;
		this.onResult({ removeWorktree });
		this.close();
	}
}
