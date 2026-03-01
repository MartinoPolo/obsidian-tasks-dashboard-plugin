import { MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import {
	Priority,
	IssueProgress,
	DashboardConfig,
	type IssueActionKey
} from '../types';
import { createPlatformService } from '../utils/platform';
import { ICONS, createActionButton } from './header-actions';
import { renderSortControls } from './sort-controls';
import { HEADER_HOVER_TITLE_MIN_WIDTH } from './dashboard-renderer-constants';
import { getIssueActionLayout } from './dashboard-renderer-layout';
import { parseGitHubNoteParams, parseParams } from './dashboard-renderer-params';
import { applyIssueSurfaceStyles, setIssueCollapsed } from './dashboard-issue-surface';
import { buildIssueActionDescriptors } from './dashboard-issue-actions';
import { createOverflowMenuPanel } from './dashboard-overflow-panel';
import { createGitHubCardRefreshRenderer } from './dashboard-renderer-github-cards';
export { ReactiveRenderChild } from './dashboard-reactive-render-child';
import type {
	ControlParams,
	IssueActionDescriptor,
	RuntimeIssueActionLayout
} from './dashboard-renderer-types';

export interface DashboardRendererInstance {
	render: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => Promise<void>;
	renderSortButton: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void;
	renderGitHubNoteCard: (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) => Promise<void>;
}


export function createDashboardRenderer(plugin: TasksDashboardPlugin): DashboardRendererInstance {
	const { renderGitHubCardWithRefresh } = createGitHubCardRefreshRenderer(plugin);
	const platformService = createPlatformService();

	const stopEventAndRun = (event: MouseEvent, action: () => void): void => {
		event.preventDefault();
		event.stopPropagation();
		action();
	};

	const renderProgressText = (progress: IssueProgress): string => {
		const mode = plugin.settings.progressDisplayMode;
		if (mode === 'number') {
			return `${progress.done}/${progress.total}`;
		}
		if (mode === 'percentage') {
			return `${progress.percentage}%`;
		}
		if (mode === 'number-percentage') {
			return `${progress.done}/${progress.total} (${progress.percentage}%)`;
		}
		if (mode === 'all') {
			return `${progress.percentage}% (${progress.done}/${progress.total})`;
		}
		return '';
	};

	const renderHeader = (
		container: HTMLElement,
		params: ControlParams,
		dashboard: DashboardConfig,
		actions: Map<IssueActionKey, IssueActionDescriptor>,
		layout: RuntimeIssueActionLayout,
		getRow2VisibleActionKeys: () => Set<IssueActionKey>,
		ctx: MarkdownPostProcessorContext
	): Set<IssueActionKey> => {
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
			stopEventAndRun(event, () => {
				const currentlyCollapsed = plugin.settings.collapsedIssues[params.issue] === true;
				const newCollapsed = !currentlyCollapsed;

				if (newCollapsed) {
					plugin.settings.collapsedIssues[params.issue] = true;
				} else {
					delete plugin.settings.collapsedIssues[params.issue];
				}
				void plugin.saveSettings();
				collapseToggle.setAttribute('aria-label', newCollapsed ? 'Expand' : 'Collapse');
				setIssueCollapsed(container, newCollapsed);
			});
		});

		const link = header.createEl('a', {
			cls: 'internal-link tdc-header-link',
			text: params.name
		});
		link.setAttribute('href', params.path);
		link.setAttribute('data-href', params.path);
		link.addEventListener('click', (event) => {
			event.preventDefault();
			void plugin.app.workspace.openLinkText(params.path, '', false);
		});

		const row1Container = header.createDiv({ cls: 'tdc-header-actions' });
		const overflowWrapper = row1Container.createDiv({ cls: 'tdc-overflow-wrapper' });

		const row1Buttons = new Map<IssueActionKey, HTMLElement>();
		for (const key of layout.row1) {
			if (layout.hidden.includes(key)) {
				continue;
			}
			const descriptor = actions.get(key);
			if (descriptor === undefined || !descriptor.shouldRender) {
				continue;
			}
			const button = createActionButton({
				container: row1Container,
				iconKey: descriptor.iconKey,
				cssClass: descriptor.cssClass,
				ariaLabel: descriptor.label,
				faded: descriptor.faded,
				onClick: () => {
					descriptor.onClick();
				},
				onContextMenu: descriptor.onContextMenu
			});
			button.classList.add('tdc-row1-action');
			row1Container.insertBefore(button, overflowWrapper);
			row1Buttons.set(key, button);
		}

		const overflowButton = createActionButton({
			container: overflowWrapper,
			iconKey: 'more',
			cssClass: 'tdc-btn-overflow',
			ariaLabel: 'More actions',
			faded: false,
			onClick: () => {
				return;
			}
		});
		overflowButton.classList.add('tdc-overflow-trigger');

		const getVisibleActionKeys = (): Set<IssueActionKey> => {
			const visible = new Set<IssueActionKey>();
			for (const [key, button] of row1Buttons) {
				if (!button.classList.contains('tdc-row1-hidden-width')) {
					visible.add(key);
				}
			}
			const isCardCollapsed = container.classList.contains('tdc-collapsed');
			if (!isCardCollapsed) {
				for (const row2Key of getRow2VisibleActionKeys()) {
					visible.add(row2Key);
				}
			}
			return visible;
		};

		const disposeOverflowMenuPanel = createOverflowMenuPanel({
			plugin,
			overflowButton,
			dashboard,
			actions,
			layout,
			getVisibleActionKeys
		});

		const headerRenderChild = new MarkdownRenderChild(header);
		headerRenderChild.register(() => {
			disposeOverflowMenuPanel();
		});
		ctx.addChild(headerRenderChild);

		const applyRow1PriorityLayout = (): void => {
			if (header.classList.contains('tdc-issue-header-hover')) {
				for (const button of row1Buttons.values()) {
					button.classList.remove('tdc-row1-hidden-width');
				}
				return;
			}

			for (const button of row1Buttons.values()) {
				button.classList.remove('tdc-row1-hidden-width');
			}

			const orderedVisibleKeys = layout.row1.filter((key) => row1Buttons.has(key));
			for (const key of [...orderedVisibleKeys].reverse()) {
				const titleIsTruncated = link.scrollWidth > link.clientWidth;
				if (!titleIsTruncated) {
					break;
				}
				const actionButton = row1Buttons.get(key);
				if (actionButton === undefined) {
					continue;
				}
				actionButton.classList.add('tdc-row1-hidden-width');
			}
		};

		header.addEventListener('mouseenter', () => {
			header.classList.add('tdc-issue-header-hover');
			link.style.minWidth = `${HEADER_HOVER_TITLE_MIN_WIDTH}px`;
			applyRow1PriorityLayout();
		});

		header.addEventListener('mouseleave', () => {
			header.classList.remove('tdc-issue-header-hover');
			link.style.removeProperty('min-width');
			applyRow1PriorityLayout();
		});

		window.setTimeout(applyRow1PriorityLayout, 0);

		return getVisibleActionKeys();
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

		const text = renderProgressText(progress);

		if (text !== '') {
			progressContainer.createSpan({ cls: 'tdc-progress-text', text });
		}
	};

	const renderRow2Buttons = (
		container: HTMLElement,
		actions: Map<IssueActionKey, IssueActionDescriptor>,
		layout: RuntimeIssueActionLayout
	): Set<IssueActionKey> => {
		const buttonContainer = container.createDiv({ cls: 'tdc-btn-group' });
		const row2Visible = new Set<IssueActionKey>();

		for (const key of layout.row2) {
			if (layout.hidden.includes(key)) {
				continue;
			}
			const descriptor = actions.get(key);
			if (descriptor === undefined || !descriptor.shouldRender) {
				continue;
			}
			createActionButton({
				container: buttonContainer,
				iconKey: descriptor.iconKey,
				cssClass: descriptor.cssClass,
				ariaLabel: descriptor.label,
				faded: descriptor.faded,
				onClick: () => {
					descriptor.onClick();
				},
				onContextMenu: descriptor.onContextMenu
			});
			row2Visible.add(key);
		}

		return row2Visible;
	};

	const render = async (
		source: string,
		el: HTMLElement,
		_ctx: MarkdownPostProcessorContext
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
			cls: `tdc-issue-container priority-${params.priority}${isCollapsed ? ' tdc-collapsed' : ''}`
		});
		el.setAttribute('data-tdc-issue', params.issue);

		const actionLayout = getIssueActionLayout(dashboard);
		const issueActions = buildIssueActionDescriptors({
			plugin,
			container,
			params,
			dashboard,
			platformService,
			applyIssueSurfaceStyles
		});
		let row2VisibleActionKeys = new Set<IssueActionKey>();

		renderHeader(
			container,
			params,
			dashboard,
			issueActions,
			actionLayout,
			() => row2VisibleActionKeys,
			_ctx
		);

		const controls = container.createDiv({ cls: 'tdc-controls' });
		const placeholderProgress: IssueProgress = { done: 0, total: 0, percentage: 0 };
		renderProgressBar(controls, placeholderProgress, params.priority);
		row2VisibleActionKeys = renderRow2Buttons(controls, issueActions, actionLayout);
		applyIssueSurfaceStyles(el, plugin.settings.issueColors[params.issue]);
		window.setTimeout(() => {
			applyIssueSurfaceStyles(el, plugin.settings.issueColors[params.issue]);
		}, 60);

		void plugin.progressTracker.getProgress(params.path).then((progress) => {
			const placeholderElement = controls.querySelector('.tdc-progress');
			if (placeholderElement !== null) {
				placeholderElement.remove();
			}
			renderProgressBar(controls, progress, params.priority);
			// Move newly appended progress element before buttons
			const updatedProgress = controls.querySelector('.tdc-progress');
			if (updatedProgress !== null) {
				controls.insertBefore(updatedProgress, controls.firstChild);
			}
		});

		if (dashboard.githubEnabled && params.githubLinks.length > 0) {
			const cardContainers = params.githubLinks.map(() => container.createDiv());
			await Promise.all(
				params.githubLinks.map((githubUrl, index) =>
					renderGitHubCardWithRefresh(
						cardContainers[index],
						githubUrl,
						params.issue,
						dashboard
					)
				)
			);
		}

		if (isCollapsed) {
			setIssueCollapsed(el, true);
		}
	};

	const renderSortButton = (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): void => {
		renderSortControls(source, el, ctx, plugin, setIssueCollapsed);
	};

	const renderGitHubNoteCard = async (
		source: string,
		el: HTMLElement,
		_ctx: MarkdownPostProcessorContext
	): Promise<void> => {
		const params = parseGitHubNoteParams(source);
		if (params === undefined) {
			el.createEl('span', { text: 'Invalid GitHub block: missing url', cls: 'tdc-error' });
			return;
		}

		if (params.dashboard !== undefined) {
			const dashboard = plugin.settings.dashboards.find((d) => d.id === params.dashboard);
			if (dashboard !== undefined && !dashboard.githubEnabled) {
				return;
			}
		}

		const container = el.createDiv({ cls: 'tdc-github-note-container' });
		await renderGitHubCardWithRefresh(container, params.url);
	};

	return { render, renderSortButton, renderGitHubNoteCard };
}
