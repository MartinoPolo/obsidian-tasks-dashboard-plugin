import {
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	Notice,
	setTooltip,
	TFile
} from 'obsidian';
import TasksDashboardPlugin from '../../main';
import {
	openAssignedIssueNamePrompt,
	type QuickCreateDefaults
} from '../modals/issue-creation-modal';
import { DashboardConfig, IssueProgress, Priority, type IssueActionKey } from '../types';
import { collectDashboardIssueIdSet } from '../settings/dashboard-cleanup';
import { getNextAvailableIssueColor } from '../utils/issue-colors';
import { createPlatformService } from '../utils/platform';
import { buildIssueActionDescriptors } from './dashboard-issue-actions';
import {
	applyIssueSurfaceStyles,
	observeContentBlockSiblings,
	setIssueCollapsed
} from './dashboard-issue-surface';
import { createOverflowMenuPanel } from './dashboard-overflow-panel';
import { HEADER_HOVER_TITLE_MIN_WIDTH } from './dashboard-renderer-constants';
import { createGitHubCardRefreshRenderer } from './dashboard-renderer-github-cards';
import { getIssueActionLayout } from './dashboard-renderer-layout';
import {
	parseGitHubNoteParams,
	parseParams,
	parseSourceKeyValueLines
} from './dashboard-renderer-params';
import type {
	ControlParams,
	IssueActionDescriptor,
	RuntimeIssueActionLayout
} from './dashboard-renderer-types';
import { getLinkedRepositories } from './dashboard-writer-helpers';
import { appendInlineSvgIcon, createActionButton, ICONS } from './header-actions';
import { renderSortControls } from './sort-controls';
export { ReactiveRenderChild } from './dashboard-reactive-render-child';

export interface DashboardRendererInstance {
	render: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => Promise<void>;
	renderSortButton: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void;
	renderGitHubNoteCard: (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) => Promise<void>;
	renderAssignedIssuesSection: (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) => Promise<void>;
}

interface IssueInfoPanelOptions {
	infoButton: HTMLElement;
	content: string;
}

function createIssueInfoPanel(options: IssueInfoPanelOptions): () => void {
	let panel: HTMLElement | undefined;
	let isOpen = false;
	let isDisposed = false;

	const createPanel = (): HTMLElement => {
		if (panel !== undefined) {
			return panel;
		}

		const createdPanel = document.createElement('div');
		createdPanel.className =
			'tdc-overflow-panel tdc-overflow-panel-portal tdc-issue-info-panel';
		createdPanel.classList.add('tdc-hidden');
		document.body.appendChild(createdPanel);
		panel = createdPanel;
		return createdPanel;
	};

	const positionPanel = (): void => {
		if (!isOpen || panel === undefined) {
			return;
		}

		if (!options.infoButton.isConnected) {
			closePanel();
			return;
		}

		const triggerRect = options.infoButton.getBoundingClientRect();
		const viewportPadding = 8;
		const panelWidth = Math.max(panel.offsetWidth, 320);
		const verticalOffset = 4;
		const availableSpaceBelow = Math.max(
			120,
			window.innerHeight - triggerRect.bottom - viewportPadding - verticalOffset
		);
		const availableSpaceAbove = Math.max(
			120,
			triggerRect.top - viewportPadding - verticalOffset
		);
		const shouldOpenAbove = availableSpaceAbove > availableSpaceBelow;
		const maxPanelHeight = shouldOpenAbove ? availableSpaceAbove : availableSpaceBelow;
		panel.style.maxHeight = `${maxPanelHeight}px`;

		const panelHeight = panel.offsetHeight;
		const maxLeft = window.innerWidth - panelWidth - viewportPadding;
		const alignedLeft = triggerRect.right - panelWidth;
		const left = Math.max(viewportPadding, Math.min(alignedLeft, maxLeft));

		let top = triggerRect.bottom + verticalOffset;
		if (shouldOpenAbove) {
			top = Math.max(viewportPadding, triggerRect.top - panelHeight - verticalOffset);
		} else {
			const maxTop = window.innerHeight - panelHeight - viewportPadding;
			top = Math.max(viewportPadding, Math.min(top, maxTop));
		}

		panel.style.left = `${left}px`;
		panel.style.top = `${top}px`;
	};

	const closePanelOnOutsideClick = (event: MouseEvent): void => {
		if (panel === undefined) {
			closePanel();
			return;
		}

		const target = event.target;
		if (!(target instanceof Node)) {
			closePanel();
			return;
		}

		if (panel.contains(target) || options.infoButton.contains(target)) {
			return;
		}

		closePanel();
	};

	const closePanelOnEscape = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		closePanel();
	};

	const closePanel = (): void => {
		if (!isOpen && panel === undefined) {
			return;
		}

		isOpen = false;
		options.infoButton.classList.remove('is-open');
		options.infoButton.setAttribute('aria-expanded', 'false');
		if (panel !== undefined) {
			panel.classList.add('tdc-hidden');
			panel.remove();
			panel = undefined;
		}

		window.removeEventListener('scroll', positionPanel, true);
		window.removeEventListener('resize', positionPanel);
		window.removeEventListener('blur', closePanel);
		document.removeEventListener('click', closePanelOnOutsideClick, true);
		document.removeEventListener('keydown', closePanelOnEscape, true);
	};

	const openPanel = (): void => {
		if (isDisposed) {
			return;
		}

		isOpen = true;
		options.infoButton.classList.add('is-open');
		options.infoButton.setAttribute('aria-expanded', 'true');

		const nextPanel = createPanel();
		nextPanel.empty();
		nextPanel.classList.remove('tdc-hidden');
		const content = nextPanel.createDiv({ cls: 'tdc-issue-info-panel-content' });
		content.setText(options.content);

		positionPanel();
		window.addEventListener('scroll', positionPanel, true);
		window.addEventListener('resize', positionPanel);
		window.addEventListener('blur', closePanel);
		document.addEventListener('click', closePanelOnOutsideClick, true);
		document.addEventListener('keydown', closePanelOnEscape, true);
	};

	const togglePanel = (): void => {
		if (isOpen) {
			closePanel();
			return;
		}
		openPanel();
	};

	const handleButtonClick = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		togglePanel();
	};

	options.infoButton.addEventListener('click', handleButtonClick);

	return () => {
		if (isDisposed) {
			return;
		}
		isDisposed = true;
		options.infoButton.removeEventListener('click', handleButtonClick);
		closePanel();
	};
}

const DEFAULT_ASSIGNED_ISSUES_LIMIT = 10;

export function createDashboardRenderer(plugin: TasksDashboardPlugin): DashboardRendererInstance {
	const { renderGitHubCardWithRefresh } = createGitHubCardRefreshRenderer(plugin);
	const platformService = createPlatformService();
	const assignedIssuesLimitByDashboard = new Map<string, number>();

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
		const isWorktreeIssue = params.worktree === true;
		const worktreeStatus = params.worktree_setup_state;
		const isPendingWorktreeSetup = worktreeStatus === 'pending';
		const isFailedWorktreeSetup = worktreeStatus === 'failed';
		const issueFolderKey = `${dashboard.id}:${params.issue}`;
		const hasAssignedIssueFolder =
			Object.prototype.hasOwnProperty.call(plugin.settings.issueFolders, issueFolderKey) ===
			true;
		const assignedIssueFolderCandidate: unknown = plugin.settings.issueFolders[issueFolderKey];
		const assignedIssueFolder = hasAssignedIssueFolder
			? typeof assignedIssueFolderCandidate === 'string'
				? assignedIssueFolderCandidate
				: undefined
			: undefined;
		const isSafeToDeleteWorktree = params.worktree_safe_delete === true;
		const worktreeStatusStateClass = isPendingWorktreeSetup
			? 'pending'
			: isFailedWorktreeSetup || isSafeToDeleteWorktree
				? 'danger'
				: 'active';
		const worktreeStatusText = isPendingWorktreeSetup
			? 'Pending worktree setup verification'
			: isFailedWorktreeSetup
				? 'Worktree setup failed — retry available'
				: isSafeToDeleteWorktree
					? 'Worktree safe to delete (merged/closed PR or deleted branch)'
					: 'Worktree active';

		const header = container.createDiv({
			cls: `tdc-issue-header priority-${params.priority}`
		});

		const collapseToggle = header.createEl('button', {
			cls: `tdc-btn tdc-btn-collapse${isCollapsed ? ' tdc-chevron-collapsed' : ''}`
		});
		setTooltip(collapseToggle, isCollapsed ? 'Expand' : 'Collapse', { delay: 500 });
		appendInlineSvgIcon(collapseToggle, ICONS.chevron);
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
				setTooltip(collapseToggle, newCollapsed ? 'Expand' : 'Collapse', { delay: 500 });
				setIssueCollapsed(container, newCollapsed);
			});
		});

		const link = header.createEl('a', {
			cls: 'internal-link tdc-header-link',
			text: params.name
		});
		link.setAttribute('href', params.path);
		link.setAttribute('data-href', params.path);
		link.style.minWidth = `${HEADER_HOVER_TITLE_MIN_WIDTH}px`;
		link.addEventListener('click', (event) => {
			event.preventDefault();
			void plugin.app.workspace.openLinkText(params.path, '', false);
		});

		const githubLinksText =
			params.githubLinks.length > 0 ? params.githubLinks.join('\n') : 'None';
		const worktreeSummary = isWorktreeIssue
			? [
					`branch: ${params.worktree_branch ?? 'n/a'}`,
					`origin: ${params.worktree_origin_folder ?? 'n/a'}`,
					`expected folder: ${params.worktree_expected_folder ?? 'n/a'}`,
					`setup state: ${params.worktree_setup_state ?? 'n/a'}`,
					`base repository: ${params.worktree_base_repository ?? 'n/a'}`
				].join('\n')
			: 'not a worktree issue';

		const infoAffordance = header.createEl('button', {
			cls: 'tdc-issue-info-inline',
			attr: {
				type: 'button',
				'aria-haspopup': 'dialog',
				'aria-expanded': 'false'
			}
		});
		setTooltip(infoAffordance, 'Issue info', { delay: 500 });
		appendInlineSvgIcon(infoAffordance, ICONS.info);
		const issueInfoText = [
			`Issue: ${params.issue}`,
			`Dashboard: ${dashboard.id}`,
			`Path: ${params.path}`,
			`Assigned folder: ${assignedIssueFolder ?? 'None'}`,
			`GitHub links:\n${githubLinksText}`,
			`Worktree:\n${worktreeSummary}`
		].join('\n\n');
		const disposeIssueInfoPanel = createIssueInfoPanel({
			infoButton: infoAffordance,
			content: issueInfoText
		});

		if (isWorktreeIssue) {
			const statusIcon = header.createSpan({
				cls: `tdc-worktree-status tdc-worktree-status-${worktreeStatusStateClass}`,
				attr: { role: 'img' }
			});
			setTooltip(statusIcon, worktreeStatusText, { delay: 500 });
			appendInlineSvgIcon(statusIcon, ICONS.worktree);
		}

		const row1Container = header.createDiv({ cls: 'tdc-header-actions' });
		const overflowWrapper = row1Container.createDiv({ cls: 'tdc-overflow-wrapper' });

		if (isWorktreeIssue && isFailedWorktreeSetup) {
			const retryButton = createActionButton({
				container: row1Container,
				iconKey: 'worktree',
				cssClass: 'tdc-btn-worktree-retry',
				ariaLabel: 'Add worktree later',
				faded: false,
				labelText: 'Add worktree later',
				onClick: () => {
					void plugin.issueManager.retryWorktreeSetup(dashboard, params.issue);
				}
			});
			retryButton.classList.add('tdc-row1-action');
			row1Container.insertBefore(retryButton, overflowWrapper);
		}

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
				onClick: (event) => {
					descriptor.onClick(event);
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
		const handleWindowResize = (): void => {
			applyRow1PriorityLayout();
		};
		window.addEventListener('resize', handleWindowResize);
		let resizeObserver: ResizeObserver | undefined;
		if (typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(() => {
				applyRow1PriorityLayout();
			});
			resizeObserver.observe(header);
		}
		headerRenderChild.register(() => {
			disposeIssueInfoPanel();
			disposeOverflowMenuPanel();
			window.removeEventListener('resize', handleWindowResize);
			resizeObserver?.disconnect();
		});
		ctx.addChild(headerRenderChild);

		const applyRow1PriorityLayout = (): void => {
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
		applyRow1PriorityLayout();
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
			ctx
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

			const disconnect = observeContentBlockSiblings(
				el,
				() => plugin.settings.collapsedIssues[params.issue] === true,
				(controlBlock) =>
					applyIssueSurfaceStyles(controlBlock, plugin.settings.issueColors[params.issue])
			);
			const observerCleanup = new MarkdownRenderChild(el);
			observerCleanup.register(disconnect);
			ctx.addChild(observerCleanup);
		}
	};

	const renderSortButton = (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): void => {
		renderSortControls(source, el, ctx, plugin);
	};

	const renderGitHubNoteCard = async (
		source: string,
		el: HTMLElement,
		_ctx: MarkdownPostProcessorContext
	): Promise<void> => {
		const params = parseGitHubNoteParams(source);
		if (params === undefined) {
			el.createEl('span', { text: 'Invalid GitHub block: missing URL', cls: 'tdc-error' });
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

	const renderAssignedIssuesSection = async (
		source: string,
		el: HTMLElement,
		_ctx: MarkdownPostProcessorContext
	): Promise<void> => {
		const dashboardIdLine = parseSourceKeyValueLines(source).find(
			(line) => line.key === 'dashboard'
		);
		const dashboardId = dashboardIdLine?.value;
		if (dashboardId === undefined || dashboardId.trim() === '') {
			el.createEl('span', {
				text: 'Invalid assigned issues block: missing dashboard',
				cls: 'tdc-error'
			});
			return;
		}

		const dashboard = plugin.settings.dashboards.find((item) => item.id === dashboardId);
		if (dashboard === undefined) {
			el.createDiv({
				cls: 'tdc-assigned-issues-message',
				text: 'Dashboard configuration not found.'
			});
			return;
		}
		if (!dashboard.githubEnabled) {
			el.createDiv({
				cls: 'tdc-assigned-issues-message',
				text: 'Enable GitHub integration in dashboard settings to view assigned issues.'
			});
			return;
		}
		if (!plugin.githubService.isAuthenticated()) {
			el.createDiv({
				cls: 'tdc-assigned-issues-message',
				text: 'Authenticate GitHub in plugin settings to view assigned issues.'
			});
			return;
		}

		const repos = getLinkedRepositories(dashboard);
		if (repos.length === 0) {
			el.createDiv({
				cls: 'tdc-assigned-issues-message',
				text: 'Link a repository in dashboard settings to show assigned issues.'
			});
			return;
		}

		const currentLimit =
			assignedIssuesLimitByDashboard.get(dashboardId) ?? DEFAULT_ASSIGNED_ISSUES_LIMIT;

		const details = el.createEl('details', {
			cls: 'tdc-assigned-issues-details'
		});
		details.setAttribute('open', 'open');

		const summary = details.createEl('summary', {
			cls: 'tdc-assigned-issues-summary'
		});
		summary.setText('Assigned issues');

		const loadingIndicator = details.createDiv({
			cls: 'tdc-assigned-issues-loading'
		});
		loadingIndicator.createSpan({ cls: 'tdc-loading-spinner' });
		loadingIndicator.createSpan({ text: 'Loading assigned issues…' });

		interface RepoResult {
			repoName: string;
			items: import('../types').GitHubIssueMetadata[];
			totalCount: number;
		}

		let repoResults: RepoResult[];
		try {
			const results = await Promise.all(
				repos.map(async (repoName) => {
					const result = await plugin.githubService.getAssignedIssues(
						repoName,
						currentLimit
					);
					return { repoName, items: result.items, totalCount: result.totalCount };
				})
			);
			repoResults = results;
		} catch (error: unknown) {
			loadingIndicator.remove();
			console.error('Tasks Dashboard: failed to fetch assigned issues', error);
			details.createDiv({
				cls: 'tdc-assigned-issues-message',
				text: 'Failed to load assigned issues. Check your GitHub connection.'
			});
			return;
		}

		loadingIndicator.remove();

		// Build set of existing dashboard issue URLs
		const existingUrls = new Set<string>();
		try {
			const filename = dashboard.dashboardFilename || 'Dashboard.md';
			const dashboardPath = `${dashboard.rootPath}/${filename}`;
			const dashboardFile = plugin.app.vault.getAbstractFileByPath(dashboardPath);
			if (dashboardFile instanceof TFile) {
				const dashboardContent = await plugin.app.vault.read(dashboardFile);
				const githubLinkPattern = /github_link:\s*(\S+)/g;
				let match: RegExpExecArray | null;
				while ((match = githubLinkPattern.exec(dashboardContent)) !== null) {
					existingUrls.add(match[1]);
				}
			}
		} catch {
			// ignore — proceed without filtering
		}

		const totalLoaded = repoResults.reduce((sum, r) => sum + r.items.length, 0);
		const totalAvailable = repoResults.reduce((sum, r) => sum + r.totalCount, 0);
		const hasMore = totalLoaded < totalAvailable;

		summary.setText(`Assigned Issues (${totalLoaded}/${totalAvailable} loaded)`);

		const dashboardProjectFolder = dashboard.projectFolder;
		const worktreeCreationAvailable =
			dashboardProjectFolder !== undefined &&
			dashboardProjectFolder !== '' &&
			platformService.isGitRepositoryFolder(dashboardProjectFolder);

		const isMultiRepo = repos.length > 1;

		if (totalLoaded === 0) {
			details.createDiv({
				cls: 'tdc-assigned-issues-message',
				text: `No open assigned issues found.`
			});
			return;
		}

		const list = details.createDiv({ cls: 'tdc-assigned-issues-list' });

		const renderIssueRow = (
			issue: import('../types').GitHubIssueMetadata,
			sourceRepo: string
		): void => {
			const isAlreadyInDashboard = existingUrls.has(issue.url);
			const row = list.createDiv({ cls: 'tdc-assigned-issues-row' });

			const issueLink = row.createEl('a', {
				cls: 'tdc-assigned-issues-link',
				text: `#${issue.number} ${issue.title}`,
				href: issue.url,
				attr: { target: '_blank', rel: 'noopener noreferrer' }
			});
			issueLink.addEventListener('click', (event) => {
				event.stopPropagation();
			});

			if (isAlreadyInDashboard) {
				row.createSpan({
					cls: 'tdc-assigned-issues-in-dashboard',
					text: 'In dashboard'
				});
				return;
			}

			const actionsContainer = row.createDiv({ cls: 'tdc-assigned-issues-actions' });

			createActionButton({
				container: actionsContainer,
				iconKey: 'plus',
				cssClass: 'tdc-btn-square tdc-assigned-issues-add-btn',
				ariaLabel: `Add issue #${issue.number} to dashboard`,
				faded: false,
				onClick: () => {
					openAssignedIssueNamePrompt(plugin.app, plugin, {
						dashboard,
						githubMetadata: issue,
						githubUrl: issue.url
					});
				}
			});

			createActionButton({
				container: actionsContainer,
				iconKey: 'worktree',
				cssClass: `tdc-btn-square tdc-assigned-issues-worktree-btn${!worktreeCreationAvailable ? ' tdc-btn-faded' : ''}`,
				ariaLabel: worktreeCreationAvailable
					? `Quick worktree from #${issue.number}`
					: 'Set dashboard project folder to a Git repository to enable worktree creation',
				faded: !worktreeCreationAvailable,
				onClick: () => {
					if (!worktreeCreationAvailable) {
						new Notice(
							'Set dashboard project folder to a Git repository to enable worktree creation.'
						);
						return;
					}
					void collectDashboardIssueIdSet(plugin.app, dashboard).then(
						(dashboardIssueIds) => {
							const quickDefaults: QuickCreateDefaults = {
								priority: 'medium',
								color: getNextAvailableIssueColor(
									plugin.settings.issueColors,
									dashboardIssueIds
								),
								worktree: true,
								worktreeOriginFolder: dashboardProjectFolder,
								worktreeBaseRepository: sourceRepo
							};
							openAssignedIssueNamePrompt(plugin.app, plugin, {
								dashboard,
								githubMetadata: issue,
								githubUrl: issue.url,
								quickCreateDefaults: quickDefaults
							});
						}
					);
				}
			});
		};

		if (isMultiRepo) {
			for (const { repoName, items, totalCount } of repoResults) {
				if (totalCount === 0) {
					continue;
				}
				const shortName = repoName.includes('/') ? repoName.split('/')[1] : repoName;
				list.createDiv({
					cls: 'tdc-assigned-issues-repo-header',
					text: `${shortName} (${items.length}/${totalCount})`
				});
				for (const issue of items) {
					renderIssueRow(issue, repoName);
				}
			}
		} else {
			const singleRepo = repoResults[0];
			for (const issue of singleRepo.items) {
				renderIssueRow(issue, singleRepo.repoName);
			}
		}

		if (hasMore) {
			const loadMoreButton = details.createEl('button', {
				cls: 'tdc-assigned-issues-load-more',
				text: 'Load more'
			});
			loadMoreButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				const newLimit = currentLimit + DEFAULT_ASSIGNED_ISSUES_LIMIT;
				assignedIssuesLimitByDashboard.set(dashboardId, newLimit);
				el.empty();
				void renderAssignedIssuesSection(source, el, _ctx);
			});
		}
	};

	return { render, renderSortButton, renderGitHubNoteCard, renderAssignedIssuesSection };
}
