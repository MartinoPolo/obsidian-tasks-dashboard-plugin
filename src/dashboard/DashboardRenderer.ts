import { EventRef, MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { Priority, IssueProgress, DashboardConfig } from '../types';
import { DeleteConfirmationModal } from '../modals/delete-confirmation-modal';
import { RenameIssueModal } from '../modals/rename-issue-modal';
import { createGitHubCardRenderer } from '../github/GitHubCardRenderer';
import { isGitHubRepoUrl, parseGitHubRepoName } from '../utils/github-url';
import { ICONS, renderIssueActionButtons } from './header-actions';
import { renderSortControls } from './sort-controls';
import { deriveIssueSurfaceColors, getIsDarkTheme, sanitizeHexColor } from '../utils/color';

const REACTIVE_RENDER_DEBOUNCE_MS = 100;
const ISSUE_SURFACE_COLOR_FALLBACK = '#4a8cc7';

const ISSUE_CONTAINER_COLOR_VARIABLES = [
	'--tdc-issue-main-color',
	'--tdc-issue-controls-bg',
	'--tdc-issue-checklist-bg',
	'--tdc-issue-controls-border',
	'--tdc-issue-checklist-border'
] as const;

interface ParsedKeyValueLine {
	key: string;
	value: string;
}

interface IconButtonConfig {
	cls: string;
	ariaLabel: string;
	title?: string;
	icon: string;
	onClick: () => void;
}

interface WorkspaceCustomEventEmitter {
	on: (name: string, callback: () => void) => EventRef;
}

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
		const workspaceEvents = plugin.app.workspace as unknown as WorkspaceCustomEventEmitter;
		this.registerEvent(
			workspaceEvents.on('tasks-dashboard:refresh', () => {
				window.clearTimeout(this.debounceTimer);
				this.debounceTimer = window.setTimeout(() => {
					this.containerEl.empty();
					const result = this.renderFunction(this.source, this.containerEl, this.ctx);
					if (result instanceof Promise) {
						result.catch((error: unknown) => {
							console.error('Tasks Dashboard: reactive render failed', error);
							this.containerEl.createEl('span', { text: 'Failed to render', cls: 'tdc-error' });
						});
					}
				}, REACTIVE_RENDER_DEBOUNCE_MS);
			})
		);
	}
}

export function createDashboardRenderer(plugin: TasksDashboardPlugin): DashboardRendererInstance {
	const githubCardRenderer = createGitHubCardRenderer();

	const parseSourceKeyValueLines = (source: string): ParsedKeyValueLine[] => {
		const entries: ParsedKeyValueLine[] = [];
		for (const line of source.trim().split('\n')) {
			const [key, ...valueParts] = line.split(':');
			const value = valueParts.join(':').trim();
			const trimmedKey = key.trim();
			if (trimmedKey === '' || value === '') {
				continue;
			}
			entries.push({ key: trimmedKey, value });
		}
		return entries;
	};

	const stopEventAndRun = (event: MouseEvent, action: () => void): void => {
		event.preventDefault();
		event.stopPropagation();
		action();
	};

	const createIconButton = (container: HTMLElement, config: IconButtonConfig): HTMLButtonElement => {
		const button = container.createEl('button', {
			cls: config.cls,
			attr: {
				'aria-label': config.ariaLabel,
				...(config.title !== undefined ? { title: config.title } : {})
			}
		});
		button.innerHTML = config.icon;
		button.addEventListener('click', (event) => {
			stopEventAndRun(event, config.onClick);
		});
		return button;
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

	const renderRefreshableGitHubCard = async <TMetadata>(options: {
		container: HTMLElement;
		githubUrl: string;
		fetchMetadata: () => Promise<TMetadata | undefined>;
		clearCache: () => void;
		renderCard: (metadata: TMetadata, onRefresh: () => void, onUnlink?: () => void) => void;
		onUnlink?: () => void;
	}): Promise<void> => {
		if (!plugin.githubService.isAuthenticated()) {
			githubCardRenderer.renderSimpleLink(options.container, options.githubUrl);
			return;
		}

		githubCardRenderer.renderLoading(options.container);
		const metadata = await options.fetchMetadata();
		if (metadata === undefined) {
			githubCardRenderer.renderSimpleLink(options.container, options.githubUrl);
			return;
		}

		const onRefresh = (): void => {
			options.clearCache();
			githubCardRenderer.renderLoading(options.container);
			void options.fetchMetadata().then((freshMetadata) => {
				if (freshMetadata !== undefined) {
					options.renderCard(freshMetadata, onRefresh, options.onUnlink);
				} else {
					githubCardRenderer.renderError(options.container, 'Failed to refresh');
				}
			});
		};

		options.renderCard(metadata, onRefresh, options.onUnlink);
	};

	const parseParams = (source: string): ControlParams | null => {
		const params: Partial<ControlParams> = {};
		const collectedGithubLinks: string[] = [];

		for (const line of parseSourceKeyValueLines(source)) {
			if (line.key === 'priority') {
				params.priority = line.value as Priority;
				continue;
			}
			if (line.key === 'github') {
				params.github = line.value;
				collectedGithubLinks.push(line.value);
				continue;
			}
			if (line.key === 'github_link') {
				collectedGithubLinks.push(line.value);
				continue;
			}
			const key = line.key as keyof ControlParams;
			(params as Record<string, unknown>)[key] = line.value;
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

	const setIssueCollapsed = (element: HTMLElement, collapsed: boolean): void => {
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

	const applyIssueSurfaceStyles = (element: HTMLElement, mainColor: string | undefined): void => {
		const controlBlock = resolveIssueControlBlock(element);
		const normalizedColor =
			mainColor !== undefined ? sanitizeHexColor(mainColor, ISSUE_SURFACE_COLOR_FALLBACK) : undefined;
		const derivedColors =
			normalizedColor !== undefined
				? deriveIssueSurfaceColors(normalizedColor, getIsDarkTheme())
				: undefined;

		const issueContainer = controlBlock.querySelector('.tdc-issue-container');
		if (issueContainer instanceof HTMLElement) {
			if (derivedColors !== undefined) {
				applyColorVariables(issueContainer, {
					'--tdc-issue-main-color': derivedColors.headerBackground,
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

	const renderHeader = (
		container: HTMLElement,
		params: ControlParams,
		dashboard: DashboardConfig
	): void => {
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

		const text = renderProgressText(progress);

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

		const moveButtons: IconButtonConfig[] = [
			{
				cls: 'tdc-btn tdc-btn-move',
				ariaLabel: 'Move up',
				icon: ICONS.up,
				onClick: () => {
					void plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'up');
				}
			},
			{
				cls: 'tdc-btn tdc-btn-move',
				ariaLabel: 'Move down',
				icon: ICONS.down,
				onClick: () => {
					void plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'down');
				}
			},
			{
				cls: 'tdc-btn tdc-btn-move',
				ariaLabel: 'Move to top',
				icon: ICONS.toTop,
				onClick: () => {
					void plugin.dashboardWriter.moveIssueToPosition(dashboard, params.issue, 'top');
				}
			},
			{
				cls: 'tdc-btn tdc-btn-move',
				ariaLabel: 'Move to bottom',
				icon: ICONS.toBottom,
				onClick: () => {
					void plugin.dashboardWriter.moveIssueToPosition(dashboard, params.issue, 'bottom');
				}
			}
		];

		for (const config of moveButtons) {
			createIconButton(buttonContainer, config);
		}

		createIconButton(buttonContainer, {
			cls: 'tdc-btn tdc-btn-rename',
			ariaLabel: 'Rename',
			icon: ICONS.rename,
			onClick: () => {
				new RenameIssueModal(plugin.app, plugin, dashboard, params.issue, params.name).open();
			}
		});

		createIconButton(buttonContainer, {
			cls: 'tdc-btn tdc-btn-color',
			ariaLabel: 'Header color',
			icon: ICONS.palette,
			onClick: () => {
				const colorInput = document.createElement('input');
				colorInput.type = 'color';
				colorInput.style.position = 'absolute';
				colorInput.style.opacity = '0';
				colorInput.style.pointerEvents = 'none';
				colorInput.value = plugin.settings.issueColors[params.issue] ?? ISSUE_SURFACE_COLOR_FALLBACK;
				document.body.appendChild(colorInput);

				const removeInput = (): void => {
					colorInput.remove();
				};

				colorInput.addEventListener('input', () => {
					applyIssueSurfaceStyles(container, colorInput.value);
				});
				colorInput.addEventListener(
					'change',
					() => {
						plugin.settings.issueColors[params.issue] = colorInput.value;
						void plugin.saveSettings();
						applyIssueSurfaceStyles(container, colorInput.value);
						removeInput();
					},
					{ once: true }
				);
				colorInput.addEventListener('blur', removeInput, { once: true });
				colorInput.click();
			}
		});

		createIconButton(buttonContainer, {
			cls: 'tdc-btn tdc-btn-archive',
			ariaLabel: archiveLabel,
			title: archiveLabel,
			icon: isArchived ? ICONS.unarchive : ICONS.archive,
			onClick: () => {
				if (isArchived) {
					void plugin.issueManager.unarchiveIssue(dashboard, params.issue);
				} else {
					void plugin.issueManager.archiveIssue(dashboard, params.issue);
				}
			}
		});

		createIconButton(buttonContainer, {
			cls: 'tdc-btn tdc-btn-delete',
			ariaLabel: 'Delete',
			icon: ICONS.trash,
			onClick: () => {
				const modal = new DeleteConfirmationModal(plugin.app, params.name, () => {
					void plugin.issueManager.deleteIssue(dashboard, params.issue);
				});
				modal.open();
			}
		});
	};

	const renderGitHubCardWithRefresh = async (
		container: HTMLElement,
		githubUrl: string,
		issueId?: string,
		dashboard?: DashboardConfig
	): Promise<void> => {
		const onUnlink = (issueId !== undefined && dashboard !== undefined)
			? (): void => {
				void plugin.issueManager.removeGitHubLink(dashboard, issueId, githubUrl);
			}
			: undefined;
		const isRepo = isGitHubRepoUrl(githubUrl);

		if (isRepo) {
			const githubContainer = container.createDiv({ cls: 'tdc-github-container' });

			const parsed = parseGitHubRepoName(githubUrl);
			if (parsed === undefined) {
				githubCardRenderer.renderSimpleLink(githubContainer, githubUrl);
				return;
			}

			await renderRefreshableGitHubCard({
				container: githubContainer,
				githubUrl,
				fetchMetadata: () => plugin.githubService.getRepository(parsed.owner, parsed.repo),
				clearCache: () => {
					plugin.githubService.clearCache();
				},
				renderCard: (metadata, onRefresh, unlinkCallback) => {
					githubCardRenderer.renderRepoCard(
						githubContainer,
						metadata,
						plugin.settings.githubDisplayMode,
						onRefresh,
						unlinkCallback
					);
				},
				onUnlink
			});
			return;
		}

		// Issue/PR card
		const githubContainer = container.createDiv({ cls: 'tdc-github-container' });

		await renderRefreshableGitHubCard({
			container: githubContainer,
			githubUrl,
			fetchMetadata: () => plugin.githubService.getMetadataFromUrl(githubUrl),
			clearCache: () => {
				plugin.githubService.clearCacheForUrl(githubUrl);
			},
			renderCard: (metadata, onRefresh, unlinkCallback) => {
				githubCardRenderer.render(
					githubContainer,
					metadata,
					plugin.settings.githubDisplayMode,
					onRefresh,
					unlinkCallback
				);
			},
			onUnlink
		});
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

		renderHeader(container, params, dashboard);

		const controls = container.createDiv({ cls: 'tdc-controls' });
		const placeholderProgress: IssueProgress = { done: 0, total: 0, percentage: 0 };
		renderProgressBar(controls, placeholderProgress, params.priority);
		renderButtons(controls, params, dashboard);
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
					renderGitHubCardWithRefresh(cardContainers[index], githubUrl, params.issue, dashboard)
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

	const parseGitHubNoteParams = (
		source: string
	): { url: string; dashboard?: string } | undefined => {
		let url: string | undefined;
		let dashboardId: string | undefined;

		for (const line of parseSourceKeyValueLines(source)) {
			if (line.key === 'url') {
				url = line.value;
			} else if (line.key === 'dashboard') {
				dashboardId = line.value;
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
