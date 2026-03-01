import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import { NamePromptModal } from '../modals/issue-creation-modal';
import { NoteImportModal } from '../modals/note-import-modal';
import { parseDashboard } from './DashboardParser';
import { ICONS, renderGlobalActionButtons } from './header-actions';

type SetIssueCollapsedFn = (element: HTMLElement, collapsed: boolean) => void;
type SortOption = { label: string; action: () => void };

const ACTION_BUTTON_CLASS = 'tdc-btn tdc-btn-action';
const SECONDARY_ACTION_BUTTON_CLASS = 'tdc-btn tdc-btn-action tdc-btn-action-secondary';

function setIssueCollapsedState(
	plugin: TasksDashboardPlugin,
	issueId: string,
	collapsed: boolean
): void {
	if (collapsed) {
		plugin.settings.collapsedIssues[issueId] = true;
		return;
	}
	delete plugin.settings.collapsedIssues[issueId];
}

function findDashboardElement(element: HTMLElement): Element | null {
	return (
		element.closest('.markdown-preview-view') ??
		element.closest('.markdown-reading-view') ??
		element.closest('.cm-editor') ??
		element.closest('.markdown-source-view')
	);
}

function createActionButton(
	container: HTMLElement,
	icon: string,
	label: string,
	onClick: () => void,
	cls = ACTION_BUTTON_CLASS
): HTMLButtonElement {
	const button = container.createEl('button', { cls });
	button.innerHTML = `${icon} ${label}`;
	button.addEventListener('click', (event) => {
		event.preventDefault();
		onClick();
	});
	return button;
}

async function getActiveIssueIds(
	plugin: TasksDashboardPlugin,
	dashboard: DashboardConfig
): Promise<string[]> {
	const filename = dashboard.dashboardFilename || 'Dashboard.md';
	const dashboardPath = `${dashboard.rootPath}/${filename}`;
	const file = plugin.app.vault.getAbstractFileByPath(dashboardPath);
	if (!(file instanceof TFile)) {
		return [];
	}
	const content = await plugin.app.vault.read(file);
	const parsed = parseDashboard(content);
	return parsed.activeIssues.map((issue) => issue.id);
}

/**
 * Set collapsed state for all active issues in the dashboard DOM.
 */
function toggleAllIssues(
	collapsed: boolean,
	plugin: TasksDashboardPlugin,
	dashboard: DashboardConfig,
	element: HTMLElement,
	setIssueCollapsed: SetIssueCollapsedFn
): void {
	void getActiveIssueIds(plugin, dashboard).then((issueIds) => {
		for (const issueId of issueIds) {
			setIssueCollapsedState(plugin, issueId, collapsed);
		}
		void plugin.saveSettings();
		const dashboardElement = findDashboardElement(element);
		if (dashboardElement !== null) {
			for (const controlBlock of Array.from(
				dashboardElement.querySelectorAll(
					'.block-language-tasks-dashboard-controls, [data-tdc-issue]'
				)
			)) {
				if (controlBlock instanceof HTMLElement) {
					setIssueCollapsed(controlBlock, collapsed);
				}
			}
		}
	});
}

export function renderSortControls(
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	plugin: TasksDashboardPlugin,
	setIssueCollapsed: SetIssueCollapsedFn
): void {
	const dashboardId = source.match(/dashboard:\s*([\w-]+)/)?.[1];
	if (dashboardId === undefined) {
		return;
	}

	const dashboard = plugin.settings.dashboards.find((d) => d.id === dashboardId);
	if (dashboard === undefined) {
		return;
	}

	el.empty();
	const container = el.createDiv({ cls: 'tdc-sort-container' });

	createActionButton(container, ICONS.plus, 'Add Issue', () => {
		new NamePromptModal(plugin.app, plugin, dashboard).open();
	});

	createActionButton(container, ICONS.fileInput, 'Import Note', () => {
		new NoteImportModal(plugin.app, plugin, dashboard).open();
	});

	const sortWrapper = container.createDiv({ cls: 'tdc-sort-wrapper' });
	const sortButton = createActionButton(sortWrapper, ICONS.sort, 'Sort', () => {
		if (dropdownOpen) {
			closeSortDropdown();
			return;
		}
		openSortDropdown();
	});
	sortButton.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	const sortDropdown = sortWrapper.createDiv({ cls: 'tdc-sort-dropdown' });
	sortDropdown.style.display = 'none';
	let dropdownOpen = false;

	const sortOptions: SortOption[] = [
		{
			label: 'Priority',
			action: () => void plugin.dashboardWriter.sortByPriority(dashboard)
		},
		{
			label: 'Newest Created',
			action: () => void plugin.dashboardWriter.sortByCreatedDate(dashboard, 'newest')
		},
		{
			label: 'Oldest Created',
			action: () => void plugin.dashboardWriter.sortByCreatedDate(dashboard, 'oldest')
		},
		{
			label: 'Recently Edited',
			action: () => void plugin.dashboardWriter.sortByEditedDate(dashboard, 'newest')
		},
		{
			label: 'Least Recently Edited',
			action: () => void plugin.dashboardWriter.sortByEditedDate(dashboard, 'oldest')
		}
	];

	const positionSortDropdown = (): void => {
		if (!dropdownOpen) {
			return;
		}
		const rect = sortButton.getBoundingClientRect();
		const viewportPadding = 8;
		const dropdownWidth = Math.max(sortDropdown.offsetWidth, rect.width);
		const maxLeft = window.innerWidth - dropdownWidth - viewportPadding;
		const left = Math.max(viewportPadding, Math.min(rect.left, maxLeft));
		sortDropdown.style.minWidth = `${rect.width}px`;
		sortDropdown.style.left = `${left}px`;
		sortDropdown.style.top = `${rect.bottom + 4}px`;
	};

	const closeSortDropdown = (): void => {
		dropdownOpen = false;
		sortDropdown.style.display = 'none';
		window.removeEventListener('scroll', positionSortDropdown, true);
		window.removeEventListener('resize', positionSortDropdown);
	};

	const openSortDropdown = (): void => {
		dropdownOpen = true;
		// Mount to body on first open, keep mounted afterwards
		if (!sortDropdown.classList.contains('tdc-sort-dropdown-portal')) {
			document.body.appendChild(sortDropdown);
			sortDropdown.classList.add('tdc-sort-dropdown-portal');
		}
		sortDropdown.style.display = 'block';
		requestAnimationFrame(positionSortDropdown);
		window.addEventListener('scroll', positionSortDropdown, true);
		window.addEventListener('resize', positionSortDropdown);
	};

	const toggleSortDropdown = (): void => {
		if (dropdownOpen) {
			closeSortDropdown();
			return;
		}
		openSortDropdown();
	};

	for (const option of sortOptions) {
		const item = sortDropdown.createDiv({ cls: 'tdc-sort-dropdown-item', text: option.label });
		item.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			closeSortDropdown();
			option.action();
		});
	}

	sortButton.addEventListener('click', () => {
		toggleSortDropdown();
	});

	const closeSortDropdownOnClick = (event: MouseEvent): void => {
		const { target } = event;
		if (!(target instanceof Node)) {
			closeSortDropdown();
			return;
		}
		if (sortWrapper.contains(target) || sortDropdown.contains(target)) {
			return;
		}
		closeSortDropdown();
	};

	document.addEventListener('click', closeSortDropdownOnClick);

	createActionButton(
		container,
		ICONS.foldAll,
		'Collapse All',
		() => {
		toggleAllIssues(true, plugin, dashboard, el, setIssueCollapsed);
		},
		SECONDARY_ACTION_BUTTON_CLASS
	);

	createActionButton(
		container,
		ICONS.unfoldAll,
		'Expand All',
		() => {
		toggleAllIssues(false, plugin, dashboard, el, setIssueCollapsed);
		},
		SECONDARY_ACTION_BUTTON_CLASS
	);

	renderGlobalActionButtons(container, dashboard, plugin);

	const containerRenderChild = new MarkdownRenderChild(container);
	containerRenderChild.register(() => {
		document.removeEventListener('click', closeSortDropdownOnClick);
		closeSortDropdown();
		if (sortDropdown.parentElement !== null) {
			sortDropdown.parentElement.removeChild(sortDropdown);
		}
	});
	ctx.addChild(containerRenderChild);
}
