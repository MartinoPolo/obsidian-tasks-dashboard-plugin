import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import { NamePromptModal } from '../modals/issue-creation-modal';
import { parseDashboard } from './DashboardParser';
import { ICONS, renderGlobalActionButtons } from './header-actions';

type SetIssueCollapsedFn = (element: HTMLElement, collapsed: boolean) => void;

/**
 * Find the nearest dashboard-level DOM container (reading view / editor wrapper).
 */
function findDashboardContainer(element: HTMLElement): Element | null {
	return (
		element.closest('.markdown-preview-view') ??
		element.closest('.markdown-reading-view') ??
		element.closest('.cm-editor') ??
		element.closest('.markdown-source-view')
	);
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
			if (collapsed) {
				plugin.settings.collapsedIssues[issueId] = true;
			} else {
				delete plugin.settings.collapsedIssues[issueId];
			}
		}
		void plugin.saveSettings();
		const dashboardElement = findDashboardContainer(element);
		if (dashboardElement !== null) {
			for (const controlBlock of Array.from(
				dashboardElement.querySelectorAll('.block-language-tasks-dashboard-controls')
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
	const dashboardIdMatch = source.match(/dashboard:\s*([\w-]+)/);
	if (dashboardIdMatch === null) {
		return;
	}

	const dashboard = plugin.settings.dashboards.find((d) => d.id === dashboardIdMatch[1]);
	if (dashboard === undefined) {
		return;
	}

	el.empty();
	const container = el.createDiv({ cls: 'tdc-sort-container' });

	const addButton = container.createEl('button', { cls: 'tdc-btn tdc-btn-action' });
	addButton.innerHTML = ICONS.plus + ' Add Issue';
	addButton.addEventListener('click', (event) => {
		event.preventDefault();
		new NamePromptModal(plugin.app, plugin, dashboard).open();
	});

	const sortWrapper = container.createDiv({ cls: 'tdc-sort-wrapper' });
	const sortButton = sortWrapper.createEl('button', { cls: 'tdc-btn tdc-btn-action' });
	sortButton.innerHTML = ICONS.sort + ' Sort';

	const sortDropdown = sortWrapper.createDiv({ cls: 'tdc-sort-dropdown' });
	sortDropdown.style.display = 'none';
	let dropdownOpen = false;

	const sortOptions: Array<{ label: string; action: () => void }> = [
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

	for (const option of sortOptions) {
		const item = sortDropdown.createDiv({ cls: 'tdc-sort-dropdown-item', text: option.label });
		item.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			closeSortDropdown();
			option.action();
		});
	}

	sortButton.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (dropdownOpen) {
			closeSortDropdown();
		} else {
			openSortDropdown();
		}
	});

	const closeSortDropdownOnClick = (event: MouseEvent): void => {
		const target = event.target as Node;
		if (sortWrapper.contains(target) || sortDropdown.contains(target)) {
			return;
		}
		closeSortDropdown();
	};

	document.addEventListener('click', closeSortDropdownOnClick);

	const collapseAllButton = container.createEl('button', {
		cls: 'tdc-btn tdc-btn-action tdc-btn-action-secondary'
	});
	collapseAllButton.innerHTML = ICONS.foldAll + ' Collapse All';
	collapseAllButton.addEventListener('click', (event) => {
		event.preventDefault();
		toggleAllIssues(true, plugin, dashboard, el, setIssueCollapsed);
	});

	const expandAllButton = container.createEl('button', {
		cls: 'tdc-btn tdc-btn-action tdc-btn-action-secondary'
	});
	expandAllButton.innerHTML = ICONS.unfoldAll + ' Expand All';
	expandAllButton.addEventListener('click', (event) => {
		event.preventDefault();
		toggleAllIssues(false, plugin, dashboard, el, setIssueCollapsed);
	});

	renderGlobalActionButtons(container, dashboard, plugin);

	const containerRenderChild = new MarkdownRenderChild(container);
	const portalDropdown = sortDropdown;
	containerRenderChild.register(() => {
		document.removeEventListener('click', closeSortDropdownOnClick);
		closeSortDropdown();
		if (portalDropdown.parentElement !== null) {
			portalDropdown.parentElement.removeChild(portalDropdown);
		}
	});
	ctx.addChild(containerRenderChild);
}
