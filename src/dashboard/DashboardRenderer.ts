import { MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { Priority, IssueProgress, DashboardConfig } from '../types';
import { NamePromptModal, DeleteConfirmationModal } from '../modals/IssueModal';
import { createGitHubCardRenderer } from '../github/GitHubCardRenderer';
import { parseDashboard } from './DashboardParser';

interface ControlParams {
	issue: string;
	name: string;
	path: string;
	dashboard: string;
	priority: Priority;
	github?: string;
}

const ICONS = {
	trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
	archive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>`,
	up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`,
	down: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>`,
	sort: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>`,
	plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
	chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
	foldAll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-6"/><path d="M12 8V2"/><path d="M4 12H2"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M22 12h-2"/><path d="m15 19-3-3-3 3"/><path d="m15 5-3 3-3-3"/></svg>`,
	unfoldAll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-6"/><path d="M12 8V2"/><path d="M4 12H2"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M22 12h-2"/><path d="m15 16-3 3-3-3"/><path d="m15 8-3-3-3 3"/></svg>`
};

export interface DashboardRendererInstance {
	render: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => Promise<void>;
	renderSortButton: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void;
}

export function createDashboardRenderer(plugin: TasksDashboardPlugin): DashboardRendererInstance {
	const githubCardRenderer = createGitHubCardRenderer();

	const parseParams = (source: string): ControlParams | null => {
		const lines = source.trim().split('\n');
		const params: Partial<ControlParams> = {};

		for (const line of lines) {
			const [key, ...valueParts] = line.split(':');
			const value = valueParts.join(':').trim();
			if (key !== '' && value !== '') {
				const k = key.trim() as keyof ControlParams;
				if (k === 'priority') {
					params[k] = value as Priority;
				} else if (k === 'github') {
					params[k] = value;
				} else {
					params[k] = value;
				}
			}
		}

		const hasAllParams =
			params.issue !== undefined &&
			params.name !== undefined &&
			params.path !== undefined &&
			params.dashboard !== undefined &&
			params.priority !== undefined;

		if (hasAllParams) {
			return params as ControlParams;
		}

		return null;
	};

	// Hide/show sibling elements after our code block (tasks query + hr separator)
	const setIssueSiblingsVisibility = (codeBlockEl: HTMLElement, collapsed: boolean): void => {
		// Our container is inside `el` which is the code block's rendered div.
		// Walk up to find the code block wrapper, then hide subsequent siblings
		// until we hit another issue container or the section end marker.
		const codeBlockWrapper = codeBlockEl.closest('.block-language-tasks-dashboard-controls');
		if (codeBlockWrapper === null) {
			return;
		}

		let sibling = codeBlockWrapper.nextElementSibling;
		while (sibling !== null) {
			// Stop at the next tasks-dashboard-controls block (next issue)
			if (sibling.classList.contains('block-language-tasks-dashboard-controls')) {
				break;
			}
			// Stop at tasks-dashboard-sort block (toolbar)
			if (sibling.classList.contains('block-language-tasks-dashboard-sort')) {
				break;
			}

			if (collapsed) {
				(sibling as HTMLElement).style.display = 'none';
			} else {
				(sibling as HTMLElement).style.display = '';
			}
			sibling = sibling.nextElementSibling;
		}
	};

	const renderHeader = (container: HTMLElement, params: ControlParams, codeBlockEl: HTMLElement): void => {
		const isCollapsed = plugin.settings.collapsedIssues[params.issue] === true;

		const header = container.createDiv({
			cls: `tdc-issue-header priority-${params.priority}`
		});

		const collapseToggle = header.createEl('button', {
			cls: `tdc-btn tdc-btn-collapse${isCollapsed ? ' tdc-chevron-collapsed' : ''}`,
			attr: { 'aria-label': isCollapsed ? 'Expand' : 'Collapse' }
		});
		collapseToggle.innerHTML = ICONS.chevron;
		collapseToggle.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();

			const currentlyCollapsed = plugin.settings.collapsedIssues[params.issue] === true;
			const newCollapsed = !currentlyCollapsed;

			if (newCollapsed) {
				plugin.settings.collapsedIssues[params.issue] = true;
			} else {
				delete plugin.settings.collapsedIssues[params.issue];
			}
			void plugin.saveSettings();

			if (newCollapsed) {
				container.classList.add('tdc-collapsed');
				collapseToggle.classList.add('tdc-chevron-collapsed');
				collapseToggle.setAttribute('aria-label', 'Expand');
			} else {
				container.classList.remove('tdc-collapsed');
				collapseToggle.classList.remove('tdc-chevron-collapsed');
				collapseToggle.setAttribute('aria-label', 'Collapse');
			}
			setIssueSiblingsVisibility(codeBlockEl, newCollapsed);
		});

		const link = header.createEl('a', {
			cls: 'internal-link',
			text: params.name
		});
		link.setAttribute('href', params.path);
		link.setAttribute('data-href', params.path);
		link.addEventListener('click', (e) => {
			e.preventDefault();
			void plugin.app.workspace.openLinkText(params.path, '', false);
		});
	};

	const renderProgressBar = (
		container: HTMLElement,
		progress: IssueProgress,
		priority: Priority
	): void => {
		const mode = plugin.settings.progressDisplayMode;
		const progressContainer = container.createDiv({ cls: 'tdc-progress' });

		if (mode === 'bar' || mode === 'all') {
			const bar = progressContainer.createDiv({ cls: 'tdc-progress-bar' });
			const fill = bar.createDiv({ cls: `tdc-progress-fill tdc-progress-fill-${priority}` });
			fill.style.width = `${progress.percentage}%`;
		}

		let text = '';
		if (mode === 'number') {
			text = `${progress.done}/${progress.total}`;
		} else if (mode === 'percentage') {
			text = `${progress.percentage}%`;
		} else if (mode === 'number-percentage') {
			text = `${progress.done}/${progress.total} (${progress.percentage}%)`;
		} else if (mode === 'all') {
			text = `${progress.percentage}% (${progress.done}/${progress.total})`;
		}

		if (text !== '') {
			progressContainer.createSpan({ cls: 'tdc-progress-text', text });
		}
	};

	const renderButtons = (
		container: HTMLElement,
		params: ControlParams,
		dashboard: DashboardConfig
	): void => {
		const btnContainer = container.createDiv({ cls: 'tdc-btn-group' });

		const upBtn = btnContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-move',
			attr: { 'aria-label': 'Move up' }
		});
		upBtn.innerHTML = ICONS.up;
		upBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			void plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'up');
		});

		const downBtn = btnContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-move',
			attr: { 'aria-label': 'Move down' }
		});
		downBtn.innerHTML = ICONS.down;
		downBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			void plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'down');
		});

		const archiveBtn = btnContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-archive',
			attr: { 'aria-label': 'Archive' }
		});
		archiveBtn.innerHTML = ICONS.archive;
		archiveBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			void plugin.issueManager.archiveIssue(dashboard, params.issue);
		});

		const deleteBtn = btnContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-delete',
			attr: { 'aria-label': 'Delete' }
		});
		deleteBtn.innerHTML = ICONS.trash;
		deleteBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const modal = new DeleteConfirmationModal(plugin.app, params.name, () => {
				void plugin.issueManager.deleteIssue(dashboard, params.issue);
			});
			modal.open();
		});
	};

	const renderGitHubCard = async (container: HTMLElement, githubUrl: string): Promise<void> => {
		const githubContainer = container.createDiv({ cls: 'tdc-github-container' });

		if (!plugin.githubService.isAuthenticated()) {
			githubCardRenderer.renderSimpleLink(githubContainer, githubUrl);
			return;
		}

		githubCardRenderer.renderLoading(githubContainer);

		const metadata = await plugin.githubService.getMetadataFromUrl(githubUrl);
		if (metadata === undefined) {
			githubCardRenderer.renderSimpleLink(githubContainer, githubUrl);
			return;
		}

		const onRefresh = (): void => {
			plugin.githubService.clearCache();
			githubCardRenderer.renderLoading(githubContainer);
			void plugin.githubService.getMetadataFromUrl(githubUrl).then((freshMetadata) => {
				if (freshMetadata !== undefined) {
					githubCardRenderer.render(
						githubContainer,
						freshMetadata,
						plugin.settings.githubDisplayMode,
						onRefresh
					);
				} else {
					githubCardRenderer.renderError(githubContainer, 'Failed to refresh');
				}
			});
		};

		githubCardRenderer.render(
			githubContainer,
			metadata,
			plugin.settings.githubDisplayMode,
			onRefresh
		);
	};

	const render = async (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> => {
		const params = parseParams(source);
		if (params === null) {
			el.createEl('span', { text: 'Invalid control block', cls: 'tdc-error' });
			return;
		}

		const dashboard = plugin.settings.dashboards.find((d) => d.id === params.dashboard);
		if (dashboard === undefined) {
			return;
		}

		const isCollapsed = plugin.settings.collapsedIssues[params.issue] === true;
		const container = el.createDiv({
			cls: `tdc-issue-container${isCollapsed ? ' tdc-collapsed' : ''}`
		});
		renderHeader(container, params, el);

		const controls = container.createDiv({ cls: 'tdc-controls' });
		const progress = await plugin.progressTracker.getProgress(params.path);
		renderProgressBar(controls, progress, params.priority);
		renderButtons(controls, params, dashboard);

		if (params.github !== undefined && params.github !== '') {
			await renderGitHubCard(container, params.github);
		}

		// Apply initial collapsed state to sibling elements (tasks query block + separator)
		// Use setTimeout so the DOM siblings are rendered first by Obsidian
		if (isCollapsed) {
			setTimeout(() => {
				setIssueSiblingsVisibility(el, true);
			}, 0);
		}

		ctx.addChild(new MarkdownRenderChild(container));
	};

	const getActiveIssueIds = async (dashboard: DashboardConfig): Promise<string[]> => {
		const filename = dashboard.dashboardFilename || 'Dashboard.md';
		const dashboardPath = `${dashboard.rootPath}/${filename}`;
		const file = plugin.app.vault.getAbstractFileByPath(dashboardPath);
		if (!(file instanceof TFile)) {
			return [];
		}
		const content = await plugin.app.vault.read(file);
		const parsed = parseDashboard(content);
		return parsed.activeIssues.map((issue) => issue.id);
	};

	const renderSortButton = (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): void => {
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

		const addBtn = container.createEl('button', { cls: 'tdc-btn tdc-btn-action' });
		addBtn.innerHTML = ICONS.plus + ' Add Issue';
		addBtn.addEventListener('click', (e) => {
			e.preventDefault();
			new NamePromptModal(plugin.app, plugin, dashboard).open();
		});

		const sortWrapper = container.createDiv({ cls: 'tdc-sort-wrapper' });
		const sortBtn = sortWrapper.createEl('button', { cls: 'tdc-btn tdc-btn-action' });
		sortBtn.innerHTML = ICONS.sort + ' Sort';

		const sortDropdown = sortWrapper.createDiv({ cls: 'tdc-sort-dropdown' });
		sortDropdown.style.display = 'none';

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

		for (const option of sortOptions) {
			const item = sortDropdown.createDiv({ cls: 'tdc-sort-dropdown-item', text: option.label });
			item.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				sortDropdown.style.display = 'none';
				option.action();
			});
		}

		sortBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			const isVisible = sortDropdown.style.display !== 'none';
			sortDropdown.style.display = isVisible ? 'none' : 'block';
		});

		const closeSortDropdown = (e: MouseEvent): void => {
			if (!sortWrapper.contains(e.target as Node)) {
				sortDropdown.style.display = 'none';
			}
		};

		document.addEventListener('click', closeSortDropdown);

		const collapseAllButton = container.createEl('button', {
			cls: 'tdc-btn tdc-btn-action tdc-btn-action-secondary'
		});
		collapseAllButton.innerHTML = ICONS.foldAll + ' Collapse All';
		collapseAllButton.addEventListener('click', (e) => {
			e.preventDefault();
			void getActiveIssueIds(dashboard).then((issueIds) => {
				for (const issueId of issueIds) {
					plugin.settings.collapsedIssues[issueId] = true;
				}
				void plugin.saveSettings();
				const dashboardEl =
					el.closest('.markdown-preview-view') ?? el.closest('.markdown-reading-view');
				if (dashboardEl !== null) {
					for (const controlBlock of Array.from(
						dashboardEl.querySelectorAll('.block-language-tasks-dashboard-controls')
					)) {
						const issueContainer = controlBlock.querySelector('.tdc-issue-container');
						if (issueContainer !== null) {
							issueContainer.classList.add('tdc-collapsed');
							const chevron = issueContainer.querySelector('.tdc-btn-collapse');
							if (chevron !== null) {
								chevron.classList.add('tdc-chevron-collapsed');
							}
						}
						setIssueSiblingsVisibility(controlBlock as HTMLElement, true);
					}
				}
			});
		});

		const expandAllButton = container.createEl('button', {
			cls: 'tdc-btn tdc-btn-action tdc-btn-action-secondary'
		});
		expandAllButton.innerHTML = ICONS.unfoldAll + ' Expand All';
		expandAllButton.addEventListener('click', (e) => {
			e.preventDefault();
			void getActiveIssueIds(dashboard).then((issueIds) => {
				for (const issueId of issueIds) {
					delete plugin.settings.collapsedIssues[issueId];
				}
				void plugin.saveSettings();
				const dashboardEl =
					el.closest('.markdown-preview-view') ?? el.closest('.markdown-reading-view');
				if (dashboardEl !== null) {
					for (const controlBlock of Array.from(
						dashboardEl.querySelectorAll('.block-language-tasks-dashboard-controls')
					)) {
						const issueContainer = controlBlock.querySelector('.tdc-issue-container');
						if (issueContainer !== null) {
							issueContainer.classList.remove('tdc-collapsed');
							const chevron = issueContainer.querySelector('.tdc-btn-collapse');
							if (chevron !== null) {
								chevron.classList.remove('tdc-chevron-collapsed');
							}
						}
						setIssueSiblingsVisibility(controlBlock as HTMLElement, false);
					}
				}
			});
		});

		const containerRenderChild = new MarkdownRenderChild(container);
		containerRenderChild.onunload = () => {
			document.removeEventListener('click', closeSortDropdown);
		};
		ctx.addChild(containerRenderChild);
	};

	return { render, renderSortButton };
}
