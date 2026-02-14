import { MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { Priority, IssueProgress, DashboardConfig } from '../types';
import { DeleteConfirmationModal } from '../modals/delete-confirmation-modal';
import { RenameIssueModal } from '../modals/rename-issue-modal';
import { createGitHubCardRenderer } from '../github/GitHubCardRenderer';
import { isGitHubRepoUrl, parseGitHubRepoName } from '../utils/github-url';
import { ICONS, renderIssueActionButtons } from './header-actions';
import { renderSortControls } from './sort-controls';

interface ControlParams {
	issue: string;
	name: string;
	path: string;
	dashboard: string;
	priority: Priority;
	/** @deprecated Use githubLinks instead */
	github?: string;
	githubLinks: string[];
}

export interface DashboardRendererInstance {
	render: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => Promise<void>;
	renderSortButton: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void;
	renderGitHubNoteCard: (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) => Promise<void>;
}

type RenderFunction = (
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) => void | Promise<void>;

export class ReactiveRenderChild extends MarkdownRenderChild {
	private debounceTimer: number | undefined;

	constructor(
		containerEl: HTMLElement,
		private source: string,
		private ctx: MarkdownPostProcessorContext,
		plugin: TasksDashboardPlugin,
		private renderFunction: RenderFunction
	) {
		super(containerEl);
		// Register in constructor — ctx.addChild() may never call onload()
		this.registerEvent(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(plugin.app.workspace as any).on('tasks-dashboard:refresh', () => {
				window.clearTimeout(this.debounceTimer);
				this.debounceTimer = window.setTimeout(() => {
					this.containerEl.empty();
					void this.renderFunction(this.source, this.containerEl, this.ctx);
				}, 100);
			})
		);
	}
}

export function createDashboardRenderer(plugin: TasksDashboardPlugin): DashboardRendererInstance {
	const githubCardRenderer = createGitHubCardRenderer();

	const parseParams = (source: string): ControlParams | null => {
		const lines = source.trim().split('\n');
		const params: Partial<ControlParams> = {};
		const collectedGithubLinks: string[] = [];

		for (const line of lines) {
			const [key, ...valueParts] = line.split(':');
			const value = valueParts.join(':').trim();
			if (key !== '' && value !== '') {
				const trimmedKey = key.trim();
				if (trimmedKey === 'priority') {
					params.priority = value as Priority;
				} else if (trimmedKey === 'github') {
					// Legacy single-link format — migrate to array
					params.github = value;
					collectedGithubLinks.push(value);
				} else if (trimmedKey === 'github_link') {
					// New multi-link format: one github_link: per URL
					collectedGithubLinks.push(value);
				} else {
					const k = trimmedKey as keyof ControlParams;
					(params as Record<string, unknown>)[k] = value;
				}
			}
		}

		params.githubLinks = collectedGithubLinks;

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

	const collectIssueContentBlocks = (controlBlock: HTMLElement): HTMLElement[] => {
		const content: HTMLElement[] = [];
		const referenceBlock =
			controlBlock.closest('.cm-embed-block') ??
			controlBlock.closest('.block-language-tasks-dashboard-controls') ??
			controlBlock;

		let cursor = referenceBlock.nextElementSibling as HTMLElement | null;
		while (cursor !== null) {
			if (cursor.classList.contains('block-language-tasks-dashboard-controls')) {
				break;
			}
			if (cursor.querySelector('.block-language-tasks-dashboard-controls') !== null) {
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

	const setIssueCollapsed = (element: HTMLElement, collapsed: boolean): void => {
		const maybeControlBlock = element.closest('.block-language-tasks-dashboard-controls');
		const controlBlock = maybeControlBlock instanceof HTMLElement ? maybeControlBlock : element;

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

	const renderHeader = (
		container: HTMLElement,
		params: ControlParams,
		dashboard: DashboardConfig
	): void => {
		const isCollapsed = plugin.settings.collapsedIssues[params.issue] === true;

		const header = container.createDiv({
			cls: `tdc-issue-header priority-${params.priority}`
		});

		const headerColor = plugin.settings.issueColors[params.issue];
		if (headerColor !== undefined) {
			header.style.background = headerColor;
		}

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
			collapseToggle.setAttribute('aria-label', newCollapsed ? 'Expand' : 'Collapse');
			setIssueCollapsed(container, newCollapsed);
		});

		const link = header.createEl('a', {
			cls: 'internal-link',
			text: params.name
		});
		link.setAttribute('href', params.path);
		link.setAttribute('data-href', params.path);
		link.addEventListener('click', (event) => {
			event.preventDefault();
			void plugin.app.workspace.openLinkText(params.path, '', false);
		});

		header.createDiv({ cls: 'tdc-header-spacer' });

		const headerActions = header.createDiv({ cls: 'tdc-header-actions' });
		renderIssueActionButtons(headerActions, {
			issueId: params.issue,
			githubLinks: params.githubLinks
		}, dashboard, plugin);
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
		const isArchived = /\/Issues\/Archive(\/|$)/i.test(params.path);
		const archiveLabel = isArchived ? 'Unarchive' : 'Archive';
		const buttonContainer = container.createDiv({ cls: 'tdc-btn-group' });

		const upButton = buttonContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-move',
			attr: { 'aria-label': 'Move up' }
		});
		upButton.innerHTML = ICONS.up;
		upButton.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			void plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'up');
		});

		const downButton = buttonContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-move',
			attr: { 'aria-label': 'Move down' }
		});
		downButton.innerHTML = ICONS.down;
		downButton.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			void plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'down');
		});

		const toTopButton = buttonContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-move',
			attr: { 'aria-label': 'Move to top' }
		});
		toTopButton.innerHTML = ICONS.toTop;
		toTopButton.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			void plugin.dashboardWriter.moveIssueToPosition(dashboard, params.issue, 'top');
		});

		const toBottomButton = buttonContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-move',
			attr: { 'aria-label': 'Move to bottom' }
		});
		toBottomButton.innerHTML = ICONS.toBottom;
		toBottomButton.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			void plugin.dashboardWriter.moveIssueToPosition(dashboard, params.issue, 'bottom');
		});

		const renameButton = buttonContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-rename',
			attr: { 'aria-label': 'Rename' }
		});
		renameButton.innerHTML = ICONS.rename;
		renameButton.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			new RenameIssueModal(plugin.app, plugin, dashboard, params.issue, params.name).open();
		});

		const colorButton = buttonContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-color',
			attr: { 'aria-label': 'Header color' }
		});
		colorButton.innerHTML = ICONS.palette;
		colorButton.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			const colorInput = document.createElement('input');
			colorInput.type = 'color';
			colorInput.style.position = 'absolute';
			colorInput.style.opacity = '0';
			colorInput.style.pointerEvents = 'none';
			colorInput.value = plugin.settings.issueColors[params.issue] ?? '#4a8cc7';
			document.body.appendChild(colorInput);
			colorInput.addEventListener('input', () => {
				const headerElement = container
					.closest('.tdc-issue-container')
					?.querySelector('.tdc-issue-header');
				if (headerElement instanceof HTMLElement) {
					headerElement.style.background = colorInput.value;
				}
			});
			colorInput.addEventListener('change', () => {
				plugin.settings.issueColors[params.issue] = colorInput.value;
				void plugin.saveSettings();
				colorInput.remove();
			});
			colorInput.click();
		});

		const archiveButton = buttonContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-archive',
			attr: { 'aria-label': archiveLabel, title: archiveLabel }
		});
		archiveButton.innerHTML = isArchived ? ICONS.unarchive : ICONS.archive;
		archiveButton.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			if (isArchived) {
				void plugin.issueManager.unarchiveIssue(dashboard, params.issue);
			} else {
				void plugin.issueManager.archiveIssue(dashboard, params.issue);
			}
		});

		const deleteButton = buttonContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-delete',
			attr: { 'aria-label': 'Delete' }
		});
		deleteButton.innerHTML = ICONS.trash;
		deleteButton.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			const modal = new DeleteConfirmationModal(plugin.app, params.name, () => {
				void plugin.issueManager.deleteIssue(dashboard, params.issue);
			});
			modal.open();
		});
	};

	const renderGitHubCardWithRefresh = async (
		container: HTMLElement,
		githubUrl: string
	): Promise<void> => {
		const isRepo = isGitHubRepoUrl(githubUrl);

		if (isRepo) {
			const githubContainer = container.createDiv({ cls: 'tdc-github-container' });

			if (!plugin.githubService.isAuthenticated()) {
				githubCardRenderer.renderSimpleLink(githubContainer, githubUrl);
				return;
			}

			const parsed = parseGitHubRepoName(githubUrl);
			if (parsed === undefined) {
				githubCardRenderer.renderSimpleLink(githubContainer, githubUrl);
				return;
			}

			githubCardRenderer.renderLoading(githubContainer);

			const metadata = await plugin.githubService.getRepository(parsed.owner, parsed.repo);
			if (metadata === undefined) {
				githubCardRenderer.renderSimpleLink(githubContainer, githubUrl);
				return;
			}

			const onRefresh = (): void => {
				plugin.githubService.clearCache();
				githubCardRenderer.renderLoading(githubContainer);
				void plugin.githubService.getRepository(parsed.owner, parsed.repo).then((freshMetadata) => {
					if (freshMetadata !== undefined) {
						githubCardRenderer.renderRepoCard(
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

			githubCardRenderer.renderRepoCard(
				githubContainer,
				metadata,
				plugin.settings.githubDisplayMode,
				onRefresh
			);
			return;
		}

		// Issue/PR card
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
			plugin.githubService.clearCacheForUrl(githubUrl);
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
		el.setAttribute('data-tdc-issue', params.issue);

		renderHeader(container, params, dashboard);

		const controls = container.createDiv({ cls: 'tdc-controls' });
		const progress = await plugin.progressTracker.getProgress(params.path);
		renderProgressBar(controls, progress, params.priority);
		renderButtons(controls, params, dashboard);

		if (dashboard.githubEnabled && params.githubLinks.length > 0) {
			for (const githubUrl of params.githubLinks) {
				await renderGitHubCardWithRefresh(container, githubUrl);
			}
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

	const parseGitHubNoteParams = (
		source: string
	): { url: string; dashboard?: string } | undefined => {
		const lines = source.trim().split('\n');
		let url: string | undefined;
		let dashboardId: string | undefined;

		for (const line of lines) {
			const [key, ...valueParts] = line.split(':');
			const value = valueParts.join(':').trim();
			if (key.trim() === 'url' && value !== '') {
				url = value;
			} else if (key.trim() === 'dashboard' && value !== '') {
				dashboardId = value;
			}
		}

		if (url === undefined) {
			return undefined;
		}

		return { url, dashboard: dashboardId };
	};

	const renderGitHubNoteCard = async (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
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
