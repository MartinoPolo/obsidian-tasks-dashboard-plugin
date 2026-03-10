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
import { WorktreeRetryModal } from '../modals/worktree-retry-modal';
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
import { extractLastPathSegment } from '../utils/path-utils';
import {
	renderBranchBadge,
	renderPrBadge,
	renderIssueBadge,
	applyPrStateAccent,
	showBadgeContextMenu
} from './git-status-indicator';
import { getLinkedRepositories } from './dashboard-writer-helpers';
import { appendInlineSvgIcon, createActionButton, ICONS } from './header-actions';
import { renderSortControls } from './sort-controls';
export { ReactiveRenderChild } from './dashboard-reactive-render-child';

export interface DashboardRendererInstance {
	render: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void;
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
	getContent: () => string;
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
		content.setText(options.getContent());

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

const DEFAULT_ASSIGNED_ISSUES_PER_REPO = 10;

function formatRelativeTime(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 60) {
		return 'just now';
	}
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return `${minutes} min ago`;
	}
	const hours = Math.floor(minutes / 60);
	return `${hours}h ago`;
}

export function createDashboardRenderer(plugin: TasksDashboardPlugin): DashboardRendererInstance {
	const { renderGitHubCardWithRefresh } = createGitHubCardRefreshRenderer(plugin);
	const platformService = createPlatformService();
	const assignedIssuesLimitByRepo = new Map<string, number>();
	const defaultBranchCache = new Map<string, string | undefined>();

	const getCachedDefaultBranch = (originFolder: string): string | undefined => {
		if (defaultBranchCache.has(originFolder)) {
			return defaultBranchCache.get(originFolder);
		}
		const result = platformService.getDefaultBranch(originFolder);
		defaultBranchCache.set(originFolder, result);
		return result;
	};

	const buildWorktreeLocationTooltip = (
		originFolder: string | undefined,
		checkedOutBranch: string | undefined,
		storedBaseBranch?: string
	): string => {
		if (originFolder === undefined || originFolder.trim() === '') {
			return 'Worktree active';
		}

		const baseFolderName = extractLastPathSegment(originFolder);
		const baseBranch = storedBaseBranch ?? getCachedDefaultBranch(originFolder);
		const branchDisplay = checkedOutBranch ?? 'unknown';

		if (baseBranch !== undefined) {
			return `${baseFolderName}/${baseBranch} \u2192 ${branchDisplay}`;
		}

		return `${baseFolderName} \u2192 ${branchDisplay}`;
	};

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
			: isFailedWorktreeSetup
				? 'failed'
				: isSafeToDeleteWorktree
					? 'inactive'
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
					`base repository: ${params.worktree_base_repository ?? 'n/a'}`,
					`base branch: ${params.worktree_base_branch ?? 'n/a'}`
				].join('\n')
			: 'not a worktree issue';

		const isWorktreeClickable =
			isWorktreeIssue && (isFailedWorktreeSetup || worktreeStatus === undefined);
		const isWorktreeActive = isWorktreeIssue && worktreeStatusStateClass === 'active';

		if (isWorktreeIssue) {
			if (isWorktreeClickable) {
				const worktreeRetryButton = createActionButton({
					container: header,
					iconKey: 'worktree',
					cssClass: 'tdc-worktree-action tdc-worktree-action-retry',
					ariaLabel: 'Retry worktree setup',
					faded: false,
					onClick: () => {
						const suggestedBranchName =
							params.worktree_branch !== undefined && params.worktree_branch !== ''
								? params.worktree_branch
								: params.issue;
						new WorktreeRetryModal(plugin.app, plugin, {
							dashboard,
							issueId: params.issue,
							suggestedBranchName,
							worktreeOriginFolder: params.worktree_origin_folder
						}).open();
					}
				});
				worktreeRetryButton.classList.add('tdc-worktree-status-failed');
			} else if (isWorktreeActive) {
				const worktreeRefreshButton = header.createEl('button', {
					cls: `tdc-worktree-action tdc-worktree-status tdc-worktree-status-${worktreeStatusStateClass}`,
					attr: { type: 'button' }
				});
				const worktreeActiveTooltip = buildWorktreeLocationTooltip(
					params.worktree_origin_folder,
					params.worktree_branch,
					params.worktree_base_branch
				);
				setTooltip(worktreeRefreshButton, worktreeActiveTooltip, { delay: 500 });
				appendInlineSvgIcon(worktreeRefreshButton, ICONS.worktree);
				worktreeRefreshButton.addEventListener('click', (event) => {
					event.preventDefault();
					event.stopPropagation();
					void plugin.issueManager.refreshWorktreeState(dashboard, params.issue);
				});
			} else {
				const worktreeIndicator = header.createSpan({
					cls: `tdc-worktree-action tdc-worktree-status tdc-worktree-status-${worktreeStatusStateClass}`,
					attr: { role: 'img' }
				});
				setTooltip(worktreeIndicator, worktreeStatusText, { delay: 500 });
				appendInlineSvgIcon(worktreeIndicator, ICONS.worktree);
			}
		}

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

		const headerBadges = header.createDiv({
			cls: 'tdc-header-badges'
		});

		let gitStatusInfoLines: string[] = [];

		const buildInfoContent = (): string => {
			const sections: string[] = [
				`Dashboard: ${dashboard.id}\nIssue: ${params.issue}`,
				`Assigned folder: ${assignedIssueFolder ?? 'None'}`,
				`GitHub links:\n${githubLinksText}`,
				`Worktree:\n${worktreeSummary}`
			];
			if (gitStatusInfoLines.length > 0) {
				sections.push(gitStatusInfoLines.join('\n'));
			} else {
				sections.push('Last refreshed: Not yet');
			}
			return sections.join('\n\n');
		};

		const disposeIssueInfoPanel = createIssueInfoPanel({
			infoButton: infoAffordance,
			getContent: buildInfoContent
		});

		// Async-fetch git status and update info panel data
		let isDestroyed = false;
		let handleBadgesContextMenu: ((event: MouseEvent) => void) | undefined;
		if (isWorktreeIssue || params.githubLinks.length > 0) {
			headerBadges.classList.add('tdc-header-badges-loading');
			const linkedReposForInfo = getLinkedRepositories(dashboard);
			void plugin.gitStatusService
				.getIssueGitStatus({
					branchName: params.worktree_branch,
					originFolder: params.worktree_origin_folder,
					baseBranch: params.worktree_base_branch,
					githubLinks: params.githubLinks,
					dashboardId: dashboard.id,
					issueId: params.issue,
					linkedRepos: linkedReposForInfo
				})
				.then((gitStatus) => {
					if (isDestroyed) {
						return;
					}
					const lines: string[] = [];
					if (gitStatus.branchName !== undefined) {
						lines.push(`Branch: ${gitStatus.branchName} (${gitStatus.branchStatus})`);
						if (gitStatus.baseBranch !== undefined) {
							lines.push(`Base branch: ${gitStatus.baseBranch}`);
						}
					}
					if (gitStatus.linkedPullRequests.length > 0) {
						const prLines = gitStatus.linkedPullRequests.map(
							(pr) => `  #${pr.number} ${pr.state} — ${pr.title}`
						);
						lines.push(`PRs:\n${prLines.join('\n')}`);
					}
					lines.push(`Last refreshed: ${formatRelativeTime(gitStatus.fetchedAt)}`);
					gitStatusInfoLines = lines;

					// Render header badges
					headerBadges.classList.remove('tdc-header-badges-loading');
					renderBranchBadge(headerBadges, gitStatus);
					for (const pr of gitStatus.linkedPullRequests) {
						renderPrBadge(headerBadges, pr);
					}
					for (const linkedIssue of gitStatus.linkedIssues) {
						renderIssueBadge(headerBadges, linkedIssue);
					}
					applyPrStateAccent(header, gitStatus.aggregatePrState);
					applyBadgeCompaction();
				})
				.catch(() => {
					gitStatusInfoLines = ['Last refreshed: Error'];
					headerBadges.classList.remove('tdc-header-badges-loading');
				});

			// Right-click context menu on badges container (event delegation)
			handleBadgesContextMenu = (event: MouseEvent): void => {
				const target = event.target;
				if (!(target instanceof Element)) {
					return;
				}
				if (target.closest('.tdc-git-badge') === null) {
					return;
				}
				showBadgeContextMenu(event, () => {
					plugin.gitStatusService.invalidate(dashboard.id, params.issue);
					plugin.triggerDashboardRefresh();
				});
			};
			headerBadges.addEventListener('contextmenu', handleBadgesContextMenu);
		}

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
		const applyBadgeCompaction = (): void => {
			const titleTruncated = link.scrollWidth > link.clientWidth;
			headerBadges.classList.toggle('tdc-badges-compact', titleTruncated);
		};

		if (typeof ResizeObserver !== 'undefined') {
			resizeObserver = new ResizeObserver(() => {
				applyRow1PriorityLayout();
				applyBadgeCompaction();
			});
			resizeObserver.observe(header);
		}
		headerRenderChild.register(() => {
			isDestroyed = true;
			disposeIssueInfoPanel();
			disposeOverflowMenuPanel();
			window.removeEventListener('resize', handleWindowResize);
			resizeObserver?.disconnect();
			if (handleBadgesContextMenu !== undefined) {
				headerBadges.removeEventListener('contextmenu', handleBadgesContextMenu);
			}
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
		applyBadgeCompaction();
		window.setTimeout(() => {
			applyRow1PriorityLayout();
			applyBadgeCompaction();
		}, 0);

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

	const render = (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void => {
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
		const prioritiesDisabled = dashboard.prioritiesEnabled === false;
		const container = el.createDiv({
			cls: `tdc-issue-container priority-${params.priority}${isCollapsed ? ' tdc-collapsed' : ''}${prioritiesDisabled ? ' tdc-priorities-disabled' : ''}`
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
		const progressBarPriority = prioritiesDisabled ? 'low' : params.priority;
		renderProgressBar(controls, placeholderProgress, progressBarPriority);
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
			renderProgressBar(controls, progress, progressBarPriority);
			// Move newly appended progress element before buttons
			const updatedProgress = controls.querySelector('.tdc-progress');
			if (updatedProgress !== null) {
				controls.insertBefore(updatedProgress, controls.firstChild);
			}
		});

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

		const getRepoLimit = (repoName: string): number => {
			const repoKey = `${dashboardId}:${repoName}`;
			return assignedIssuesLimitByRepo.get(repoKey) ?? DEFAULT_ASSIGNED_ISSUES_PER_REPO;
		};

		let repoResults: RepoResult[];
		try {
			const results = await Promise.all(
				repos.map(async (repoName) => {
					const repoLimit = getRepoLimit(repoName);
					const result = await plugin.githubService.getAssignedIssues(
						repoName,
						repoLimit
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
		const existingDashboardUrls = new Set<string>();
		try {
			const filename = dashboard.dashboardFilename || 'Dashboard.md';
			const dashboardPath = `${dashboard.rootPath}/${filename}`;
			const dashboardFile = plugin.app.vault.getAbstractFileByPath(dashboardPath);
			if (dashboardFile instanceof TFile) {
				const dashboardContent = await plugin.app.vault.read(dashboardFile);
				const githubLinkPattern = /github_link:\s*(\S+)/g;
				let match: RegExpExecArray | null;
				while ((match = githubLinkPattern.exec(dashboardContent)) !== null) {
					existingDashboardUrls.add(match[1]);
				}
			}
		} catch {
			// ignore — proceed without filtering
		}

		const totalLoaded = repoResults.reduce((sum, r) => sum + r.items.length, 0);
		const totalAvailable = repoResults.reduce((sum, r) => sum + r.totalCount, 0);

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
			parentContainer: HTMLElement,
			issue: import('../types').GitHubIssueMetadata,
			sourceRepo: string,
			isLinkedToDashboard: boolean
		): void => {
			const row = parentContainer.createDiv({ cls: 'tdc-assigned-issues-row' });

			const issueLink = row.createEl('a', {
				cls: 'tdc-assigned-issues-link',
				text: `#${issue.number} ${issue.title}`,
				href: issue.url,
				attr: { target: '_blank', rel: 'noopener noreferrer' }
			});
			issueLink.addEventListener('click', (event) => {
				event.stopPropagation();
			});

			if (isLinkedToDashboard) {
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
					void collectDashboardIssueIdSet(plugin.app, dashboard)
						.then((dashboardIssueIds) => {
							const quickDefaults: QuickCreateDefaults = {
								priority: dashboard.prioritiesEnabled === false ? 'low' : 'medium',
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
						})
						.catch(() => {
							new Notice('Failed to load dashboard issues');
						});
				}
			});
		};

		const renderRepoIssuesWithDashboardDivider = (
			parentContainer: HTMLElement,
			issues: import('../types').GitHubIssueMetadata[],
			sourceRepo: string
		): void => {
			const unlinkedIssues = issues.filter((issue) => !existingDashboardUrls.has(issue.url));
			const linkedIssues = issues.filter((issue) => existingDashboardUrls.has(issue.url));

			for (const issue of unlinkedIssues) {
				renderIssueRow(parentContainer, issue, sourceRepo, false);
			}

			if (linkedIssues.length > 0) {
				parentContainer.createDiv({
					cls: 'tdc-assigned-issues-divider',
					text: 'In dashboard'
				});
				for (const issue of linkedIssues) {
					renderIssueRow(parentContainer, issue, sourceRepo, true);
				}
			}
		};

		const renderRepoLoadMoreButton = (
			parentContainer: HTMLElement,
			repoName: string,
			loadedCount: number,
			totalCount: number
		): void => {
			if (loadedCount >= totalCount) {
				return;
			}
			const repoKey = `${dashboardId}:${repoName}`;
			const currentRepoLimit = getRepoLimit(repoName);
			const loadMoreButton = parentContainer.createEl('button', {
				cls: 'tdc-assigned-issues-load-more',
				text: `Load more (${loadedCount}/${totalCount} loaded)`
			});
			loadMoreButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				const newLimit = currentRepoLimit + DEFAULT_ASSIGNED_ISSUES_PER_REPO;
				assignedIssuesLimitByRepo.set(repoKey, newLimit);
				el.empty();
				void renderAssignedIssuesSection(source, el, _ctx);
			});
		};

		if (isMultiRepo) {
			for (const { repoName, items, totalCount } of repoResults) {
				if (totalCount === 0) {
					continue;
				}
				const shortName = repoName.includes('/') ? repoName.split('/')[1] : repoName;
				const repoSection = list.createDiv({ cls: 'tdc-assigned-issues-repo-section' });
				repoSection.createDiv({
					cls: 'tdc-assigned-issues-repo-header',
					text: `${shortName} (${items.length}/${totalCount} loaded)`
				});
				renderRepoIssuesWithDashboardDivider(repoSection, items, repoName);
				renderRepoLoadMoreButton(repoSection, repoName, items.length, totalCount);
			}
		} else {
			const singleRepo = repoResults[0];
			renderRepoIssuesWithDashboardDivider(list, singleRepo.items, singleRepo.repoName);
			renderRepoLoadMoreButton(
				list,
				singleRepo.repoName,
				singleRepo.items.length,
				singleRepo.totalCount
			);
		}
	};

	return { render, renderSortButton, renderGitHubNoteCard, renderAssignedIssuesSection };
}
