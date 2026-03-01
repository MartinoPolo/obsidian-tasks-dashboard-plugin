import { Modal } from 'obsidian';

const TOP_MODAL_CLASS = 'tdc-top-modal';
const PROMPT_MODAL_CLASS = 'tdc-prompt-modal';
const PROMPT_TITLE_CLASS = 'tdc-prompt-title';
const PROMPT_BUTTONS_CLASS = 'tdc-prompt-buttons';
const PROMPT_BUTTON_CLASS = 'tdc-prompt-btn';
const PROMPT_CONFIRM_CLASS = 'tdc-prompt-btn-confirm';
const PROMPT_CANCEL_CLASS = 'tdc-prompt-btn-cancel';
const PROMPT_INPUT_CLASS = 'tdc-prompt-input';

interface PromptButtonOptions {
	label: string;
	shortcut: string;
	className: string;
	onClick: () => void;
}

const applyPromptModalClasses = (modal: Modal): void => {
	const { modalEl, containerEl } = modal;
	containerEl.addClass(TOP_MODAL_CLASS);
	modalEl.addClass(PROMPT_MODAL_CLASS);
};

const createPromptTitle = (contentEl: HTMLElement, titleText: string): void => {
	contentEl.empty();
	contentEl.createEl('div', { cls: PROMPT_TITLE_CLASS, text: titleText });
};

const createShortcutHint = (buttonEl: HTMLButtonElement, shortcut: string): void => {
	buttonEl.appendText(' ');
	buttonEl.createEl('kbd', { text: shortcut });
};

const createPromptButton = (
	containerEl: HTMLElement,
	options: PromptButtonOptions
): HTMLButtonElement => {
	const buttonEl = containerEl.createEl('button', {
		cls: `${PROMPT_BUTTON_CLASS} ${options.className}`,
		text: options.label
	});
	createShortcutHint(buttonEl, options.shortcut);
	buttonEl.addEventListener('click', options.onClick);
	return buttonEl;
};

const bindEnterKeyHandler = (
	inputEl: HTMLInputElement,
	onEnter: () => void
): void => {
	inputEl.addEventListener('keydown', (event: KeyboardEvent) => {
		if (event.key !== 'Enter') {
			return;
		}

		event.preventDefault();
		onEnter();
	});
};

/**
 * Apply standard prompt modal classes and create title element.
 * Shared by NamePromptModal, DeleteConfirmationModal, GithubPromptModal, RenameIssueModal.
 */
export function setupPromptModal(modal: Modal, titleText: string): void {
	const { contentEl } = modal;
	applyPromptModalClasses(modal);
	createPromptTitle(contentEl, titleText);
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
	const buttonContainer = contentEl.createDiv({ cls: PROMPT_BUTTONS_CLASS });
	const confirmBtn = createPromptButton(buttonContainer, {
		label: confirmLabel,
		shortcut: '↵',
		className: PROMPT_CONFIRM_CLASS,
		onClick: onConfirm
	});
	void createPromptButton(buttonContainer, {
		label: 'Cancel',
		shortcut: 'Esc',
		className: PROMPT_CANCEL_CLASS,
		onClick: onCancel
	});
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
		cls: PROMPT_INPUT_CLASS,
		attr: { placeholder }
	});
	input.focus();
	bindEnterKeyHandler(input, onEnter);
	return input;
}
