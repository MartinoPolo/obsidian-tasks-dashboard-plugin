import { Modal } from 'obsidian';

/**
 * Apply standard prompt modal classes and create title element.
 * Shared by NamePromptModal, DeleteConfirmationModal, GithubPromptModal, RenameIssueModal.
 */
export function setupPromptModal(modal: Modal, titleText: string): void {
	const { contentEl, modalEl, containerEl } = modal;
	containerEl.addClass('tdc-top-modal');
	modalEl.addClass('tdc-prompt-modal');
	contentEl.empty();
	contentEl.createEl('div', { cls: 'tdc-prompt-title', text: titleText });
}

/**
 * Create confirm and cancel buttons with keyboard shortcut hints.
 * Returns the confirm button element for further customization.
 */
export function createConfirmCancelButtons(
	contentEl: HTMLElement,
	confirmLabel: string,
	onConfirm: () => void,
	onCancel: () => void
): HTMLButtonElement {
	const btnContainer = contentEl.createDiv({ cls: 'tdc-prompt-buttons' });
	const confirmBtn = btnContainer.createEl('button', {
		cls: 'tdc-prompt-btn tdc-prompt-btn-confirm'
	});
	confirmBtn.innerHTML = `${confirmLabel} <kbd>↵</kbd>`;
	confirmBtn.addEventListener('click', onConfirm);
	const cancelBtn = btnContainer.createEl('button', {
		cls: 'tdc-prompt-btn tdc-prompt-btn-cancel'
	});
	cancelBtn.innerHTML = 'Cancel <kbd>Esc</kbd>';
	cancelBtn.addEventListener('click', onCancel);
	return confirmBtn;
}

/**
 * Create a text input that triggers onEnter when Enter key is pressed.
 * Automatically focuses the input.
 */
export function createInputWithEnterHandler(
	contentEl: HTMLElement,
	placeholder: string,
	onEnter: () => void
): HTMLInputElement {
	const input = contentEl.createEl('input', {
		type: 'text',
		cls: 'tdc-prompt-input',
		attr: { placeholder }
	});
	input.focus();
	input.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			onEnter();
		}
	});
	return input;
}
