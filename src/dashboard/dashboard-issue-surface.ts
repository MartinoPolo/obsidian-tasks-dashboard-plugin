import { deriveIssueSurfaceColors, getIsDarkTheme, sanitizeHexColor } from '../utils/color';
import { getForegroundForIssueColor } from '../utils/issue-colors';
import {
	ISSUE_CONTAINER_COLOR_VARIABLES,
	ISSUE_SURFACE_COLOR_FALLBACK
} from './dashboard-renderer-constants';

const collectIssueContentBlocks = (controlBlock: HTMLElement): HTMLElement[] => {
	const content: HTMLElement[] = [];
	const referenceBlock =
		controlBlock.closest('.cm-embed-block') ??
		controlBlock.closest('.block-language-tasks-dashboard-controls') ??
		controlBlock;

	const headingTags = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

	let cursor = referenceBlock.nextElementSibling as HTMLElement | null;
	while (cursor !== null) {
		if (cursor.classList.contains('block-language-tasks-dashboard-controls')) {
			break;
		}
		if (cursor.querySelector('.block-language-tasks-dashboard-controls') !== null) {
			break;
		}
		// Stop at assigned issues boundary
		if (
			cursor.querySelector(
				'.tdc-assigned-issues-details, .block-language-tasks-dashboard-assigned'
			) !== null
		) {
			break;
		}
		// Stop at section boundaries (headings and HRs)
		if (headingTags.has(cursor.tagName)) {
			break;
		}
		if (cursor.querySelector('h1, h2, h3, h4, h5, h6') !== null) {
			break;
		}
		content.push(cursor);
		if (cursor.tagName === 'HR' || cursor.querySelector('hr') !== null) {
			break;
		}
		cursor = cursor.nextElementSibling as HTMLElement | null;
	}

	return content;
};

const resolveIssueControlBlock = (element: HTMLElement): HTMLElement => {
	const embedBlock = element.closest('.cm-embed-block');
	if (embedBlock instanceof HTMLElement) {
		return embedBlock;
	}

	const dashboardControlBlock = element.closest('.block-language-tasks-dashboard-controls');
	if (dashboardControlBlock instanceof HTMLElement) {
		return dashboardControlBlock;
	}

	const codeBlockElement = element.closest('[data-tdc-issue]');
	if (codeBlockElement instanceof HTMLElement) {
		return codeBlockElement;
	}

	return element;
};

/**
 * Toggle collapsed state on sibling content blocks only (external Obsidian DOM).
 * Use from Svelte components that already manage their own CSS classes reactively.
 */
export const setIssueContentBlocksCollapsed = (element: HTMLElement, collapsed: boolean): void => {
	const controlBlock = resolveIssueControlBlock(element);
	const contentBlocks = collectIssueContentBlocks(controlBlock);
	for (const block of contentBlocks) {
		block.classList.toggle('tdc-issue-content-collapsed', collapsed);
	}
};

/**
 * Full imperative collapsed toggle — container class, chevron, and content blocks.
 * Use only from non-Svelte contexts (e.g. SortControls operating on DOM-queried elements).
 */
export const setIssueCollapsed = (element: HTMLElement, collapsed: boolean): void => {
	const controlBlock = resolveIssueControlBlock(element);

	const issueContainer = controlBlock.querySelector('.tdc-issue-container');
	if (issueContainer !== null) {
		issueContainer.classList.toggle('tdc-collapsed', collapsed);
		const chevron = issueContainer.querySelector('.tdc-btn-collapse');
		if (chevron !== null) {
			chevron.classList.toggle('tdc-chevron-collapsed', collapsed);
		}
	}

	const contentBlocks = collectIssueContentBlocks(controlBlock);
	for (const block of contentBlocks) {
		block.classList.toggle('tdc-issue-content-collapsed', collapsed);
	}
};

const applyColorVariables = (
	element: HTMLElement,
	variables: Record<(typeof ISSUE_CONTAINER_COLOR_VARIABLES)[number], string> | undefined
): void => {
	for (const variable of ISSUE_CONTAINER_COLOR_VARIABLES) {
		if (variables !== undefined) {
			element.style.setProperty(variable, variables[variable]);
		} else {
			element.style.removeProperty(variable);
		}
	}
};

const OBSERVER_IDLE_TIMEOUT_MS = 500;
const OBSERVER_MAX_LIFETIME_MS = 5000;

export const observeContentBlockSiblings = (
	controlBlockElement: HTMLElement,
	isStillCollapsed: () => boolean,
	onSiblingsFound: (controlBlock: HTMLElement) => void
): (() => void) => {
	const controlBlock = resolveIssueControlBlock(controlBlockElement);
	const parent = controlBlock.parentElement;

	if (parent === null) {
		return () => {};
	}

	let idleTimer: ReturnType<typeof setTimeout> | undefined;
	let disconnected = false;

	const observer = new MutationObserver(() => {
		applyToNewSiblings();
	});

	function disconnect(): void {
		if (disconnected) {
			return;
		}
		disconnected = true;
		observer.disconnect();
		if (idleTimer !== undefined) {
			clearTimeout(idleTimer);
		}
		clearTimeout(maxLifetimeTimer);
	}

	function applyToNewSiblings(): void {
		if (disconnected || !isStillCollapsed()) {
			disconnect();
			return;
		}

		const contentBlocks = collectIssueContentBlocks(controlBlock);
		if (contentBlocks.length === 0) {
			return;
		}

		for (const block of contentBlocks) {
			block.classList.add('tdc-issue-content-collapsed');
		}

		onSiblingsFound(controlBlockElement);

		// Reset idle timer — wait for more siblings to potentially appear
		if (idleTimer !== undefined) {
			clearTimeout(idleTimer);
		}
		idleTimer = setTimeout(() => {
			disconnect();
		}, OBSERVER_IDLE_TIMEOUT_MS);
	}

	observer.observe(parent, { childList: true });

	const maxLifetimeTimer = setTimeout(() => {
		disconnect();
	}, OBSERVER_MAX_LIFETIME_MS);

	// Run once immediately in case siblings already exist
	applyToNewSiblings();

	return disconnect;
};

export const applyIssueSurfaceStyles = (
	element: HTMLElement,
	mainColor: string | undefined
): void => {
	const controlBlock = resolveIssueControlBlock(element);
	const normalizedColor =
		mainColor !== undefined
			? sanitizeHexColor(mainColor, ISSUE_SURFACE_COLOR_FALLBACK)
			: undefined;
	const foregroundColor =
		normalizedColor !== undefined ? getForegroundForIssueColor(normalizedColor) : undefined;
	const derivedColors =
		normalizedColor !== undefined
			? deriveIssueSurfaceColors(normalizedColor, getIsDarkTheme(), foregroundColor)
			: undefined;

	const issueContainer = controlBlock.querySelector('.tdc-issue-container');
	if (issueContainer instanceof HTMLElement) {
		if (derivedColors !== undefined) {
			applyColorVariables(issueContainer, {
				'--tdc-issue-main-color': derivedColors.headerBackground,
				'--tdc-issue-header-link-color': derivedColors.headerText,
				'--tdc-issue-controls-bg': derivedColors.controlsBackground,
				'--tdc-issue-checklist-bg': derivedColors.checklistBackground,
				'--tdc-issue-controls-border': derivedColors.controlsBorder,
				'--tdc-issue-checklist-border': derivedColors.checklistBorder
			});
			const headerElement = issueContainer.querySelector('.tdc-issue-header');
			if (headerElement instanceof HTMLElement) {
				headerElement.style.background = derivedColors.headerBackground;
			}
		} else {
			applyColorVariables(issueContainer, undefined);
			const headerElement = issueContainer.querySelector('.tdc-issue-header');
			if (headerElement instanceof HTMLElement) {
				headerElement.style.removeProperty('background');
			}
		}
	}

	const contentBlocks = collectIssueContentBlocks(controlBlock);
	for (const block of contentBlocks) {
		if (block.tagName === 'HR' || block.querySelector('hr') !== null) {
			continue;
		}
		block.classList.add('tdc-issue-content-block');
		if (derivedColors !== undefined) {
			block.style.setProperty('--tdc-issue-checklist-bg', derivedColors.checklistBackground);
			block.style.setProperty('--tdc-issue-checklist-border', derivedColors.checklistBorder);
		} else {
			block.style.removeProperty('--tdc-issue-checklist-bg');
			block.style.removeProperty('--tdc-issue-checklist-border');
		}
	}
};
