interface ListNavigationKeydownHandlers {
	onNext: () => void;
	onPrevious: () => void;
	onConfirm: () => void;
	onClose?: () => void;
	onBack?: () => void;
	includeHorizontalArrowKeys?: boolean;
}

const LIST_OPTION_SELECTED_CLASS = 'is-selected';
const PRESSED_ATTRIBUTE_NAME = 'aria-pressed';

export function handleListNavigationKeydown(
	event: KeyboardEvent,
	handlers: ListNavigationKeydownHandlers
): void {
	const includeHorizontalArrowKeys = handlers.includeHorizontalArrowKeys ?? true;
	const isNextKey =
		event.key === 'ArrowDown' || (includeHorizontalArrowKeys && event.key === 'ArrowRight');
	if (isNextKey) {
		event.preventDefault();
		handlers.onNext();
		return;
	}

	const isPreviousKey =
		event.key === 'ArrowUp' || (includeHorizontalArrowKeys && event.key === 'ArrowLeft');
	if (isPreviousKey) {
		event.preventDefault();
		handlers.onPrevious();
		return;
	}

	if (event.key === 'Backspace' && handlers.onBack !== undefined) {
		event.preventDefault();
		event.stopPropagation();
		handlers.onBack();
		return;
	}

	if (event.key === 'Escape' && handlers.onClose !== undefined) {
		event.preventDefault();
		handlers.onClose();
		return;
	}

	if (event.key === 'Enter') {
		event.preventDefault();
		handlers.onConfirm();
	}
}

export function getWrappedIndex(currentIndex: number, step: number, length: number): number {
	if (length === 0) {
		return 0;
	}

	const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
	return (((safeCurrentIndex + step) % length) + length) % length;
}

export function applySingleSelectionPressedState<T extends string>(
	buttonMap: Map<T, HTMLButtonElement>,
	selectedValue: T,
	focusSelected: boolean
): void {
	for (const [value, button] of buttonMap.entries()) {
		const isSelected = value === selectedValue;
		button.toggleClass(LIST_OPTION_SELECTED_CLASS, isSelected);
		button.setAttribute(PRESSED_ATTRIBUTE_NAME, isSelected ? 'true' : 'false');
		if (isSelected && focusSelected) {
			button.focus();
		}
	}
}
