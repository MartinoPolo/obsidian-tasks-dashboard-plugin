import { Modal } from 'obsidian';

const TOP_MODAL_CLASS = 'tdc-top-modal';
const PROMPT_MODAL_CLASS = 'tdc-prompt-modal';
const PROMPT_TITLE_CLASS = 'tdc-prompt-title';
const PROMPT_BUTTONS_CLASS = 'tdc-prompt-buttons';
const PROMPT_BUTTON_CLASS = 'tdc-prompt-btn';
const PROMPT_CONFIRM_CLASS = 'tdc-prompt-btn-confirm';
const PROMPT_CANCEL_CLASS = 'tdc-prompt-btn-cancel';
const PROMPT_INPUT_CLASS = 'tdc-prompt-input';
const MOUSE_BACK_BUTTON = 3;

interface PromptButtonOptions {
	label: string;
	shortcut?: string;
	className: string;
	onClick: () => void;
}

interface PromptModalSetupOptions {
	additionalModalClasses?: string[];
}

const applyPromptModalClasses = (
	modal: Modal,
	options: PromptModalSetupOptions | undefined
): void => {
	const { modalEl, containerEl } = modal;
	containerEl.addClass(TOP_MODAL_CLASS);
	const additionalModalClasses = options?.additionalModalClasses ?? [];
	modalEl.addClass(PROMPT_MODAL_CLASS, ...additionalModalClasses);
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
	if (options.shortcut !== undefined) {
		createShortcutHint(buttonEl, options.shortcut);
	}
	buttonEl.addEventListener('click', options.onClick);
	return buttonEl;
};

export const registerEnterShortcut = (elementEl: HTMLElement, onEnter: () => void): void => {
	elementEl.addEventListener('keydown', (event: KeyboardEvent) => {
		if (event.key !== 'Enter') {
			return;
		}

		event.preventDefault();
		onEnter();
	});
};

export function setupPromptModal(
	modal: Modal,
	titleText: string,
	options?: PromptModalSetupOptions
): void {
	const { contentEl } = modal;
	applyPromptModalClasses(modal, options);
	createPromptTitle(contentEl, titleText);
}

export function createPromptShortcutButton(
	containerEl: HTMLElement,
	label: string,
	shortcut: string,
	className: string,
	onClick: () => void
): HTMLButtonElement {
	return createPromptButton(containerEl, {
		label,
		shortcut,
		className,
		onClick
	});
}

export function createPromptButtonsContainer(contentEl: HTMLElement): HTMLDivElement {
	return contentEl.createDiv({ cls: PROMPT_BUTTONS_CLASS });
}

export function createPromptBackButton(
	containerEl: HTMLElement,
	onClick: () => void,
	label = 'Back'
): HTMLButtonElement {
	return createPromptButton(containerEl, {
		label,
		shortcut: '⟵',
		className: 'tdc-prompt-btn-secondary',
		onClick
	});
}

export function createPromptConfirmButton(
	containerEl: HTMLElement,
	onClick: () => void,
	label = 'Confirm',
	className: string = PROMPT_CONFIRM_CLASS
): HTMLButtonElement {
	return createPromptButton(containerEl, {
		label,
		shortcut: '↵',
		className,
		onClick
	});
}

export function createPromptCancelButton(
	containerEl: HTMLElement,
	onClick: () => void,
	label = 'Cancel',
	className: string = PROMPT_CANCEL_CLASS
): HTMLButtonElement {
	return createPromptButton(containerEl, {
		label,
		shortcut: 'Esc',
		className,
		onClick
	});
}

export function registerMouseBackShortcut(elementEl: HTMLElement, onBack: () => void): void {
	const handleMouseBack = (event: MouseEvent): void => {
		if (event.button !== MOUSE_BACK_BUTTON) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		onBack();
	};

	elementEl.addEventListener('mousedown', handleMouseBack);
	elementEl.addEventListener('mouseup', handleMouseBack);
	elementEl.addEventListener('auxclick', handleMouseBack);
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
	const buttonContainer = createPromptButtonsContainer(contentEl);
	const confirmBtn = createPromptConfirmButton(buttonContainer, onConfirm, confirmLabel);
	void createPromptCancelButton(buttonContainer, onCancel);
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
	input.addEventListener('keydown', (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			return;
		}

		event.stopPropagation();
	});
	input.focus();
	registerEnterShortcut(input, onEnter);
	return input;
}
