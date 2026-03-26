import { Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { collectDashboardIssueIdSet } from '../settings/dashboard-cleanup';
import type { DashboardConfig } from '../types';
import {
	ISSUE_COLOR_PICKER_COLUMNS,
	collectUsedIssueColors,
	getThemeAwareIssueColorPalette,
	isIssueColorUsed
} from '../utils/issue-colors';
import { getContrastingForegroundColor } from '../utils/color';
import { ISSUE_SURFACE_COLOR_FALLBACK } from './dashboard-renderer-constants';

const COLOR_DROPDOWN_MARGIN = 8;

const positionColorDropdown = (
	dropdown: HTMLElement,
	anchorElement: HTMLElement | undefined,
	capturedAnchorRect?: DOMRect
): void => {
	if (anchorElement === undefined) {
		dropdown.setCssProps({
			left: '50%',
			top: '50%',
			transform: 'translate(-50%, -50%)'
		});
		return;
	}

	const anchorRect = anchorElement.isConnected
		? anchorElement.getBoundingClientRect()
		: capturedAnchorRect;

	if (anchorRect === undefined) {
		dropdown.setCssProps({
			left: '50%',
			top: '50%',
			transform: 'translate(-50%, -50%)'
		});
		return;
	}
	const dropdownRect = dropdown.getBoundingClientRect();
	const maxLeft = window.innerWidth - dropdownRect.width - COLOR_DROPDOWN_MARGIN;
	const preferredLeft = anchorRect.right - dropdownRect.width;
	const left = Math.max(COLOR_DROPDOWN_MARGIN, Math.min(preferredLeft, maxLeft));
	const belowTop = anchorRect.bottom + COLOR_DROPDOWN_MARGIN;
	const aboveTop = anchorRect.top - dropdownRect.height - COLOR_DROPDOWN_MARGIN;
	const hasSpaceBelow =
		belowTop + dropdownRect.height <= window.innerHeight - COLOR_DROPDOWN_MARGIN;
	const top = hasSpaceBelow ? belowTop : Math.max(COLOR_DROPDOWN_MARGIN, aboveTop);

	dropdown.setCssProps({
		left: `${left}px`,
		top: `${top}px`,
		transform: 'none'
	});
};

export const openIssueColorDropdown = async (options: {
	plugin: TasksDashboardPlugin;
	dashboard: DashboardConfig;
	issueId: string;
	container: HTMLElement;
	anchorElement: HTMLElement | undefined;
	applyIssueSurfaceStyles: (element: HTMLElement, mainColor: string | undefined) => void;
}): Promise<void> => {
	const { plugin, dashboard, issueId, container, anchorElement, applyIssueSurfaceStyles } =
		options;
	const capturedAnchorRect = anchorElement?.getBoundingClientRect();
	const dashboardIssueIds = await collectDashboardIssueIdSet(plugin.app, dashboard);
	const palette = getThemeAwareIssueColorPalette();
	const usedColors = collectUsedIssueColors(plugin.settings.issueColors, dashboardIssueIds);
	const currentColor = plugin.settings.issueColors[issueId] ?? ISSUE_SURFACE_COLOR_FALLBACK;
	const originalColor = plugin.settings.issueColors[issueId];
	let didCommitSelection = false;
	const dropdown = document.createElement('div');
	dropdown.className = 'tdc-issue-color-dropdown';
	dropdown.setAttribute('role', 'dialog');

	const title = dropdown.createDiv({
		cls: 'tdc-issue-color-dropdown-title',
		text: 'Issue color'
	});
	title.setAttribute('aria-hidden', 'true');

	const grid = dropdown.createDiv({ cls: 'tdc-color-preset-row tdc-issue-color-dropdown-grid' });
	dropdown.addClass('tdc-color-preset-row-six-columns');

	const colorPickerRow = dropdown.createDiv({
		cls: 'tdc-color-picker-row tdc-issue-color-dropdown-picker'
	});
	colorPickerRow.createSpan({ cls: 'tdc-color-picker-label', text: 'Custom color' });
	const colorPickerCircleWrapper = colorPickerRow.createDiv({
		cls: 'tdc-color-picker-circle-wrapper'
	});
	const colorInput = colorPickerCircleWrapper.createEl('input', {
		type: 'color',
		cls: 'tdc-color-picker-circle',
		attr: {
			'aria-label': 'Custom color'
		}
	});
	colorInput.value = currentColor;
	const colorPreviewLetter = colorPickerCircleWrapper.createSpan({
		cls: 'tdc-color-picker-preview-letter',
		text: 'A',
		attr: { 'aria-hidden': 'true' }
	});
	colorPreviewLetter.style.color = getContrastingForegroundColor(currentColor);

	const closeDropdown = (): void => {
		if (!didCommitSelection) {
			applyIssueSurfaceStyles(container, originalColor);
		}
		document.removeEventListener('mousedown', onDocumentMouseDown, true);
		document.removeEventListener('keydown', onDocumentKeyDown, true);
		window.removeEventListener('resize', onWindowResize);
		dropdown.remove();
	};

	const applyColorSelection = (nextColor: string): void => {
		if (isIssueColorUsed(plugin.settings.issueColors, nextColor, issueId, dashboardIssueIds)) {
			new Notice('Color already assigned. Pick an available color.');
			colorInput.value = plugin.settings.issueColors[issueId] ?? ISSUE_SURFACE_COLOR_FALLBACK;
			colorPreviewLetter.style.color = getContrastingForegroundColor(colorInput.value);
			return;
		}

		const previousColor = plugin.settings.issueColors[issueId];
		if (previousColor === nextColor) {
			didCommitSelection = true;
			applyIssueSurfaceStyles(container, nextColor);
			closeDropdown();
			return;
		}

		plugin.settings.issueColors[issueId] = nextColor;
		didCommitSelection = true;
		void plugin.saveSettings();
		applyIssueSurfaceStyles(container, nextColor);
		closeDropdown();
	};

	for (const entry of palette) {
		const isUnavailable = usedColors.has(entry.background) && entry.background !== currentColor;
		const preset = grid.createEl('button', {
			cls: 'tdc-color-preset-btn',
			attr: {
				type: 'button',
				'aria-disabled': isUnavailable ? 'true' : 'false'
			}
		});
		preset.style.backgroundColor = entry.background;
		preset.style.setProperty('--tdc-swatch-fg', entry.foreground);
		preset.style.setProperty('--tdc-swatch-bg', entry.background);
		preset.disabled = isUnavailable;
		preset.toggleClass('is-disabled', isUnavailable);
		preset.toggleClass('is-selected', entry.background === currentColor);
		const indicator = preset.createSpan({ cls: 'tdc-color-preset-indicator', text: 'A' });
		indicator.style.color = entry.foreground;
		preset.addEventListener('click', () => {
			if (isUnavailable) {
				return;
			}
			colorInput.value = entry.background;
			applyColorSelection(entry.background);
		});
	}

	grid.addEventListener('keydown', (event: KeyboardEvent) => {
		const buttons = Array.from(
			grid.querySelectorAll<HTMLButtonElement>('button.tdc-color-preset-btn')
		);
		const focused = document.activeElement;
		const currentIndex = focused instanceof HTMLButtonElement ? buttons.indexOf(focused) : -1;
		if (currentIndex === -1) {
			return;
		}

		let step: number | undefined;
		if (event.key === 'ArrowRight') {
			step = 1;
		} else if (event.key === 'ArrowLeft') {
			step = -1;
		} else if (event.key === 'ArrowDown') {
			step = ISSUE_COLOR_PICKER_COLUMNS;
		} else if (event.key === 'ArrowUp') {
			step = -ISSUE_COLOR_PICKER_COLUMNS;
		}
		if (step === undefined) {
			return;
		}

		event.preventDefault();
		const total = buttons.length;
		for (let attempt = 0; attempt < total; attempt += 1) {
			const nextIndex = (((currentIndex + step * (attempt + 1)) % total) + total) % total;
			const target = buttons[nextIndex];
			if (!target.disabled) {
				target.focus();
				for (const button of buttons) {
					button.removeClass('is-selected');
				}
				target.addClass('is-selected');
				return;
			}
		}
	});

	colorInput.addEventListener('input', () => {
		colorPreviewLetter.style.color = getContrastingForegroundColor(colorInput.value);
		applyIssueSurfaceStyles(container, colorInput.value);
	});

	colorInput.addEventListener('change', () => {
		applyColorSelection(colorInput.value);
	});

	const onDocumentMouseDown = (event: MouseEvent): void => {
		const target = event.target;
		if (!(target instanceof Node)) {
			return;
		}
		if (dropdown.contains(target)) {
			return;
		}
		if (anchorElement !== undefined && anchorElement.contains(target)) {
			return;
		}
		closeDropdown();
	};

	const onDocumentKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		closeDropdown();
	};

	const onWindowResize = (): void => {
		positionColorDropdown(dropdown, anchorElement, capturedAnchorRect);
	};

	document.body.appendChild(dropdown);
	positionColorDropdown(dropdown, anchorElement, capturedAnchorRect);
	document.addEventListener('mousedown', onDocumentMouseDown, true);
	document.addEventListener('keydown', onDocumentKeyDown, true);
	window.addEventListener('resize', onWindowResize);

	const selectedButton = grid.querySelector<HTMLButtonElement>(
		'button.tdc-color-preset-btn.is-selected'
	);
	const fallbackButton = grid.querySelector<HTMLButtonElement>(
		'button.tdc-color-preset-btn:not(:disabled)'
	);
	(selectedButton ?? fallbackButton)?.focus();
};
