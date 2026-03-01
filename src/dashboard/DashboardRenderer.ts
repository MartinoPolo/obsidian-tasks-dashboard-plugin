import {
	EventRef,
	MarkdownPostProcessorContext,
	MarkdownRenderChild,
	Menu,
	Notice
} from 'obsidian';
import TasksDashboardPlugin from '../../main';
import {
	Priority,
	IssueProgress,
	DashboardConfig,
	DashboardIssueActionLayout,
	type IssueActionKey
} from '../types';
import { DeleteConfirmationModal } from '../modals/delete-confirmation-modal';
import { RenameIssueModal } from '../modals/rename-issue-modal';
import { FolderPathModal } from '../modals/FolderPathModal';
import { GitHubSearchModal } from '../modals/GitHubSearchModal';
import { GitHubLinksModal } from '../modals/github-links-modal';
import { createGitHubCardRenderer } from '../github/GitHubCardRenderer';
import { isGitHubRepoUrl, parseGitHubRepoName } from '../utils/github-url';
import { createPlatformService } from '../utils/platform';
import { ICONS, createActionButton, getButtonVisibility } from './header-actions';
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

const ISSUE_ACTION_ORDER: readonly IssueActionKey[] = [
	'folder',
	'terminal',
	'vscode',
	'github',
	'move-up',
	'move-down',
	'move-top',
	'move-bottom',
	'rename',
	'color',
	'archive',
	'delete'
];

const DEFAULT_ROW1_ACTIONS: readonly IssueActionKey[] = [
	'folder',
	'terminal',
	'vscode',
	'github',
	'move-up',
	'move-down'
];

const HEADER_HOVER_TITLE_MIN_WIDTH = 200;

interface IssueActionDescriptor {
	key: IssueActionKey;
	label: string;
	iconKey: keyof typeof ICONS;
	cssClass: string;
	shouldRender: boolean;
	faded: boolean;
	onClick: () => void;
	onContextMenu?: (event: MouseEvent) => void;
}

interface RuntimeIssueActionLayout {
	row1: IssueActionKey[];
	row2: IssueActionKey[];
	hidden: IssueActionKey[];
}

interface ParsedKeyValueLine {
	key: string;
	value: string;
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
							this.containerEl.createEl('span', {
								text: 'Failed to render',
								cls: 'tdc-error'
							});
						});
					}
				}, REACTIVE_RENDER_DEBOUNCE_MS);
			})
		);
	}
}

export function createDashboardRenderer(plugin: TasksDashboardPlugin): DashboardRendererInstance {
	const githubCardRenderer = createGitHubCardRenderer();
	const platformService = createPlatformService();

	const getDefaultRow2Actions = (): IssueActionKey[] => {
		return ISSUE_ACTION_ORDER.filter((key) => !DEFAULT_ROW1_ACTIONS.includes(key));
	};

	const isIssueActionKey = (value: string): value is IssueActionKey => {
		return (ISSUE_ACTION_ORDER as readonly string[]).includes(value);
	};

	const dedupeIssueActionKeys = (keys: IssueActionKey[]): IssueActionKey[] => {
		const deduped: IssueActionKey[] = [];
		for (const key of keys) {
			if (!deduped.includes(key)) {
				deduped.push(key);
			}
		}
		return deduped;
	};

	const sanitizeLayoutKeys = (value: unknown): IssueActionKey[] => {
		if (!Array.isArray(value)) {
			return [];
		}

		const sanitized: IssueActionKey[] = [];
		for (const item of value) {
			if (typeof item !== 'string' || !isIssueActionKey(item)) {
				continue;
			}
			sanitized.push(item);
		}

		return dedupeIssueActionKeys(sanitized);
	};

	const getIssueActionLayout = (dashboard: DashboardConfig): RuntimeIssueActionLayout => {
		const rawLayout = dashboard.issueActionLayout;
		const row1 = sanitizeLayoutKeys(rawLayout?.row1);
		const row2 = sanitizeLayoutKeys(rawLayout?.row2);
		const hidden = sanitizeLayoutKeys(rawLayout?.hidden);

		const normalizedRow1 = row1.length > 0 ? row1 : [...DEFAULT_ROW1_ACTIONS];
		const normalizedRow2 = row2.length > 0 ? row2 : getDefaultRow2Actions();

		const usedKeys = new Set<IssueActionKey>();
		const uniqueRow1: IssueActionKey[] = [];
		for (const key of normalizedRow1) {
			if (usedKeys.has(key)) {
				continue;
			}
			usedKeys.add(key);
			uniqueRow1.push(key);
		}

		const uniqueRow2: IssueActionKey[] = [];
		for (const key of normalizedRow2) {
			if (usedKeys.has(key)) {
				continue;
			}
			usedKeys.add(key);
			uniqueRow2.push(key);
		}

		for (const key of ISSUE_ACTION_ORDER) {
			if (usedKeys.has(key)) {
				continue;
			}
			uniqueRow2.push(key);
			usedKeys.add(key);
		}

		const hiddenSet = new Set(hidden);

		return {
			row1: uniqueRow1,
			row2: uniqueRow2,
			hidden: ISSUE_ACTION_ORDER.filter((key) => hiddenSet.has(key))
		};
	};

	const saveIssueActionLayout = (
		dashboard: DashboardConfig,
		layout: RuntimeIssueActionLayout,
		options?: { triggerRefresh?: boolean }
	): void => {
		const shouldTriggerRefresh = options?.triggerRefresh ?? true;
		const nextLayout: DashboardIssueActionLayout = {
			row1: dedupeIssueActionKeys(layout.row1),
			row2: dedupeIssueActionKeys(layout.row2),
			hidden: dedupeIssueActionKeys(layout.hidden)
		};
		dashboard.issueActionLayout = nextLayout;
		void plugin.saveSettings().then(() => {
			if (shouldTriggerRefresh) {
				plugin.triggerDashboardRefresh();
			}
		});
	};

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
			mainColor !== undefined
				? sanitizeHexColor(mainColor, ISSUE_SURFACE_COLOR_FALLBACK)
				: undefined;
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
				block.style.setProperty(
					'--tdc-issue-checklist-bg',
					derivedColors.checklistBackground
				);
				block.style.setProperty(
					'--tdc-issue-checklist-border',
					derivedColors.checklistBorder
				);
			} else {
				block.style.removeProperty('--tdc-issue-checklist-bg');
				block.style.removeProperty('--tdc-issue-checklist-border');
			}
		}
	};

	const isNonEmptyString = (value: string | undefined): value is string => {
		return value !== undefined && value !== '';
	};

	const isGitHubUrl = (url: string): boolean => {
		return /^https?:\/\/github\.com\//.test(url);
	};

	const openFirstGitHubLink = (links: string[]): boolean => {
		const firstLink = links[0];
		if (!isGitHubUrl(firstLink)) {
			return false;
		}

		window.open(firstLink, '_blank');
		return true;
	};

	const openMoveContextMenu = (
		event: MouseEvent,
		dashboard: DashboardConfig,
		issueId: string,
		direction: 'up' | 'down'
	): void => {
		const menu = new Menu();
		if (direction === 'up') {
			menu.addItem((item) => {
				item.setTitle('Move up')
					.setIcon('arrow-up')
					.onClick(() => {
						void plugin.dashboardWriter.moveIssue(dashboard, issueId, 'up');
					});
			});
			menu.addItem((item) => {
				item.setTitle('Move to top')
					.setIcon('chevrons-up')
					.onClick(() => {
						void plugin.dashboardWriter.moveIssueToPosition(dashboard, issueId, 'top');
					});
			});
		} else {
			menu.addItem((item) => {
				item.setTitle('Move down')
					.setIcon('arrow-down')
					.onClick(() => {
						void plugin.dashboardWriter.moveIssue(dashboard, issueId, 'down');
					});
			});
			menu.addItem((item) => {
				item.setTitle('Move to bottom')
					.setIcon('chevrons-down')
					.onClick(() => {
						void plugin.dashboardWriter.moveIssueToPosition(
							dashboard,
							issueId,
							'bottom'
						);
					});
			});
		}

		menu.showAtPosition({ x: event.clientX, y: event.clientY });
	};

	const buildIssueActionDescriptors = (
		container: HTMLElement,
		params: ControlParams,
		dashboard: DashboardConfig
	): Map<IssueActionKey, IssueActionDescriptor> => {
		const issueFolderKey = `${dashboard.id}:${params.issue}`;
		const issueFolder = plugin.settings.issueFolders[issueFolderKey];
		const hasIssueFolder = isNonEmptyString(issueFolder);
		const visibility = getButtonVisibility(dashboard);
		const isArchived = /\/Issues\/Archive(\/|$)/i.test(params.path);

		const openIssueFolderModal = (): void => {
			new FolderPathModal(plugin.app, plugin, dashboard, params.issue).open();
		};

		const descriptors = new Map<IssueActionKey, IssueActionDescriptor>();

		descriptors.set('folder', {
			key: 'folder',
			label: hasIssueFolder ? 'Open issue folder' : 'Set issue folder',
			iconKey: 'folder',
			cssClass: 'tdc-btn-folder',
			shouldRender: visibility.folder,
			faded: !hasIssueFolder,
			onClick: () => {
				if (isNonEmptyString(issueFolder)) {
					platformService.openInFileExplorer(issueFolder);
					return;
				}
				openIssueFolderModal();
			},
			onContextMenu: hasIssueFolder
				? () => {
						openIssueFolderModal();
					}
				: undefined
		});

		descriptors.set('terminal', {
			key: 'terminal',
			label: hasIssueFolder ? 'Open terminal' : 'Set issue folder',
			iconKey: 'terminal',
			cssClass: 'tdc-btn-terminal',
			shouldRender: visibility.terminal && (hasIssueFolder || !visibility.folder),
			faded: !hasIssueFolder,
			onClick: () => {
				if (isNonEmptyString(issueFolder)) {
					const issueColor = plugin.settings.issueColors[params.issue];
					platformService.openTerminal(issueFolder, issueColor);
					return;
				}
				openIssueFolderModal();
			},
			onContextMenu: () => {
				openIssueFolderModal();
			}
		});

		descriptors.set('vscode', {
			key: 'vscode',
			label: hasIssueFolder ? 'Open in VS Code' : 'Set issue folder',
			iconKey: 'vscode',
			cssClass: 'tdc-btn-vscode',
			shouldRender: visibility.vscode && (hasIssueFolder || !visibility.folder),
			faded: !hasIssueFolder,
			onClick: () => {
				if (isNonEmptyString(issueFolder)) {
					platformService.openVSCode(issueFolder);
					return;
				}
				openIssueFolderModal();
			},
			onContextMenu: () => {
				openIssueFolderModal();
			}
		});

		descriptors.set('github', {
			key: 'github',
			label: params.githubLinks.length > 0 ? 'Open GitHub link' : 'Add GitHub link',
			iconKey: 'github',
			cssClass: 'tdc-btn-github-quickopen',
			shouldRender: visibility.github,
			faded: params.githubLinks.length === 0,
			onClick: () => {
				const hasLinks = params.githubLinks.length > 0;
				if (hasLinks) {
					openFirstGitHubLink(params.githubLinks);
					return;
				}
				if (!plugin.githubService.isAuthenticated()) {
					new Notice('Configure GitHub token in settings to search for issues.');
					return;
				}
				new GitHubSearchModal(plugin.app, plugin, dashboard, (url, metadata) => {
					if (url === undefined) {
						return;
					}
					void plugin.issueManager.addGitHubLink(dashboard, params.issue, url, metadata);
				}).open();
			},
			onContextMenu:
				params.githubLinks.length > 0
					? () => {
							new GitHubLinksModal(
								plugin,
								dashboard,
								params.issue,
								params.githubLinks
							).open();
						}
					: undefined
		});

		descriptors.set('move-up', {
			key: 'move-up',
			label: 'Move up',
			iconKey: 'up',
			cssClass: 'tdc-btn-move',
			shouldRender: true,
			faded: false,
			onClick: () => {
				void plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'up');
			},
			onContextMenu: (event) => {
				openMoveContextMenu(event, dashboard, params.issue, 'up');
			}
		});

		descriptors.set('move-down', {
			key: 'move-down',
			label: 'Move down',
			iconKey: 'down',
			cssClass: 'tdc-btn-move',
			shouldRender: true,
			faded: false,
			onClick: () => {
				void plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'down');
			},
			onContextMenu: (event) => {
				openMoveContextMenu(event, dashboard, params.issue, 'down');
			}
		});

		descriptors.set('move-top', {
			key: 'move-top',
			label: 'Move to top',
			iconKey: 'toTop',
			cssClass: 'tdc-btn-move',
			shouldRender: true,
			faded: false,
			onClick: () => {
				void plugin.dashboardWriter.moveIssueToPosition(dashboard, params.issue, 'top');
			}
		});

		descriptors.set('move-bottom', {
			key: 'move-bottom',
			label: 'Move to bottom',
			iconKey: 'toBottom',
			cssClass: 'tdc-btn-move',
			shouldRender: true,
			faded: false,
			onClick: () => {
				void plugin.dashboardWriter.moveIssueToPosition(dashboard, params.issue, 'bottom');
			}
		});

		descriptors.set('rename', {
			key: 'rename',
			label: 'Rename',
			iconKey: 'rename',
			cssClass: 'tdc-btn-rename',
			shouldRender: true,
			faded: false,
			onClick: () => {
				new RenameIssueModal(
					plugin.app,
					plugin,
					dashboard,
					params.issue,
					params.name
				).open();
			}
		});

		descriptors.set('color', {
			key: 'color',
			label: 'Header color',
			iconKey: 'palette',
			cssClass: 'tdc-btn-color',
			shouldRender: true,
			faded: false,
			onClick: () => {
				const colorInput = document.createElement('input');
				colorInput.type = 'color';
				colorInput.style.position = 'absolute';
				colorInput.style.opacity = '0';
				colorInput.style.pointerEvents = 'none';
				colorInput.value =
					plugin.settings.issueColors[params.issue] ?? ISSUE_SURFACE_COLOR_FALLBACK;
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

		descriptors.set('archive', {
			key: 'archive',
			label: isArchived ? 'Unarchive' : 'Archive',
			iconKey: isArchived ? 'unarchive' : 'archive',
			cssClass: 'tdc-btn-archive',
			shouldRender: true,
			faded: false,
			onClick: () => {
				if (isArchived) {
					void plugin.issueManager.unarchiveIssue(dashboard, params.issue);
				} else {
					void plugin.issueManager.archiveIssue(dashboard, params.issue);
				}
			}
		});

		descriptors.set('delete', {
			key: 'delete',
			label: 'Delete',
			iconKey: 'trash',
			cssClass: 'tdc-btn-delete',
			shouldRender: true,
			faded: false,
			onClick: () => {
				const modal = new DeleteConfirmationModal(plugin.app, params.name, () => {
					void plugin.issueManager.deleteIssue(dashboard, params.issue);
				});
				modal.open();
			}
		});

		return descriptors;
	};

	const createOverflowMenuPanel = (options: {
		overflowButton: HTMLElement;
		dashboard: DashboardConfig;
		actions: Map<IssueActionKey, IssueActionDescriptor>;
		layout: RuntimeIssueActionLayout;
		getVisibleActionKeys: () => Set<IssueActionKey>;
	}): () => void => {
		let panel: HTMLElement | undefined;
		let isOpen = false;
		let inSettingsMode = false;
		let hasAutoSavedLayoutChanges = false;
		let isDisposed = false;

		const draftLayout: RuntimeIssueActionLayout = {
			row1: [],
			row2: [],
			hidden: []
		};

		const resetDraftLayout = (): void => {
			draftLayout.row1 = [...options.layout.row1];
			draftLayout.row2 = [...options.layout.row2];
			draftLayout.hidden = [...options.layout.hidden];
		};

		resetDraftLayout();

		const createPanel = (): HTMLElement => {
			if (panel !== undefined) {
				return panel;
			}

			const createdPanel = document.createElement('div');
			createdPanel.className = 'tdc-overflow-panel tdc-overflow-panel-portal';
			createdPanel.style.display = 'none';
			document.body.appendChild(createdPanel);
			panel = createdPanel;
			return createdPanel;
		};

		const ensureActionPlacement = (): void => {
			for (const key of ISSUE_ACTION_ORDER) {
				const existsInRow1 = draftLayout.row1.includes(key);
				const existsInRow2 = draftLayout.row2.includes(key);
				if (!existsInRow1 && !existsInRow2) {
					draftLayout.row2.push(key);
				}
			}
			draftLayout.row1 = dedupeIssueActionKeys(draftLayout.row1);
			draftLayout.row2 = dedupeIssueActionKeys(
				draftLayout.row2.filter((key) => !draftLayout.row1.includes(key))
			);
			draftLayout.hidden = dedupeIssueActionKeys(draftLayout.hidden);
		};

		const persistDraftLayout = (): void => {
			ensureActionPlacement();
			saveIssueActionLayout(options.dashboard, draftLayout, { triggerRefresh: false });
			options.layout.row1 = [...draftLayout.row1];
			options.layout.row2 = [...draftLayout.row2];
			options.layout.hidden = [...draftLayout.hidden];
			hasAutoSavedLayoutChanges = true;
		};

		const positionPanel = (): void => {
			if (!isOpen || panel === undefined) {
				return;
			}

			if (!options.overflowButton.isConnected) {
				closePanel();
				return;
			}

			const triggerRect = options.overflowButton.getBoundingClientRect();
			const viewportPadding = 8;
			const panelWidth = Math.max(panel.offsetWidth, 280);
			const panelHeight = panel.offsetHeight;
			const maxLeft = window.innerWidth - panelWidth - viewportPadding;
			const alignedLeft = triggerRect.right - panelWidth;
			const left = Math.max(viewportPadding, Math.min(alignedLeft, maxLeft));

			let top = triggerRect.bottom + 4;
			const maxTop = window.innerHeight - panelHeight - viewportPadding;
			if (top > maxTop) {
				top = Math.max(viewportPadding, triggerRect.top - panelHeight - 4);
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

			if (panel.contains(target) || options.overflowButton.contains(target)) {
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
			inSettingsMode = false;
			resetDraftLayout();
			if (panel !== undefined) {
				panel.style.display = 'none';
				panel.remove();
				panel = undefined;
			}

			window.removeEventListener('scroll', positionPanel, true);
			window.removeEventListener('resize', positionPanel);
			window.removeEventListener('blur', closePanel);
			document.removeEventListener('click', closePanelOnOutsideClick, true);
			document.removeEventListener('keydown', closePanelOnEscape, true);

			if (hasAutoSavedLayoutChanges) {
				hasAutoSavedLayoutChanges = false;
				plugin.triggerDashboardRefresh();
			}
		};

		const renderActionsView = (): void => {
			if (panel === undefined) {
				return;
			}
			panel.empty();
			const actionsContainer = panel.createDiv({ cls: 'tdc-overflow-actions' });
			const visibleActionKeys = options.getVisibleActionKeys();
			let hasOverflowActions = false;

			for (const key of ISSUE_ACTION_ORDER) {
				const descriptor = options.actions.get(key);
				if (descriptor === undefined || !descriptor.shouldRender) {
					continue;
				}
				if (visibleActionKeys.has(key)) {
					continue;
				}

				hasOverflowActions = true;
				createActionButton({
					container: actionsContainer,
					iconKey: descriptor.iconKey,
					cssClass: `tdc-overflow-item ${descriptor.cssClass}`,
					ariaLabel: descriptor.label,
					faded: descriptor.faded,
					labelText: descriptor.label,
					onClick: (event) => {
						event.preventDefault();
						event.stopPropagation();
						descriptor.onClick();
						closePanel();
					}
				});
			}

			if (!hasOverflowActions) {
				actionsContainer.createDiv({
					cls: 'tdc-overflow-empty',
					text: 'No hidden actions'
				});
			}

			const settingsTrigger = panel.createEl('button', {
				cls: 'tdc-btn tdc-overflow-settings-toggle',
				text: 'Layout settings'
			});
			settingsTrigger.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				inSettingsMode = true;
				renderSettingsView();
			});
		};

		const renderSettingsRows = (container: HTMLElement, rowName: 'row1' | 'row2'): void => {
			const getActionPosition = (
				actionKey: IssueActionKey
			): { row: 'row1' | 'row2'; index: number } | undefined => {
				const row1Index = draftLayout.row1.indexOf(actionKey);
				if (row1Index !== -1) {
					return { row: 'row1', index: row1Index };
				}

				const row2Index = draftLayout.row2.indexOf(actionKey);
				if (row2Index !== -1) {
					return { row: 'row2', index: row2Index };
				}

				return undefined;
			};

			const canMoveAction = (
				actionKey: IssueActionKey,
				direction: 'up' | 'down'
			): boolean => {
				const position = getActionPosition(actionKey);
				if (position === undefined) {
					return false;
				}

				if (direction === 'up') {
					if (position.row === 'row1') {
						return position.index > 0;
					}
					return position.index >= 0;
				}

				if (position.row === 'row2') {
					return position.index < draftLayout.row2.length - 1;
				}
				return position.index <= draftLayout.row1.length - 1;
			};

			const moveActionByOne = (actionKey: IssueActionKey, direction: 'up' | 'down'): void => {
				const position = getActionPosition(actionKey);
				if (position === undefined) {
					return;
				}

				if (direction === 'up') {
					if (position.row === 'row1') {
						if (position.index === 0) {
							return;
						}
						const previousKey = draftLayout.row1[position.index - 1];
						draftLayout.row1[position.index - 1] = actionKey;
						draftLayout.row1[position.index] = previousKey;
						return;
					}

					if (position.index > 0) {
						const previousKey = draftLayout.row2[position.index - 1];
						draftLayout.row2[position.index - 1] = actionKey;
						draftLayout.row2[position.index] = previousKey;
						return;
					}

					draftLayout.row2.shift();
					draftLayout.row1.push(actionKey);
					return;
				}

				if (position.row === 'row2') {
					if (position.index >= draftLayout.row2.length - 1) {
						return;
					}
					const nextKey = draftLayout.row2[position.index + 1];
					draftLayout.row2[position.index + 1] = actionKey;
					draftLayout.row2[position.index] = nextKey;
					return;
				}

				if (position.index < draftLayout.row1.length - 1) {
					const nextKey = draftLayout.row1[position.index + 1];
					draftLayout.row1[position.index + 1] = actionKey;
					draftLayout.row1[position.index] = nextKey;
					return;
				}

				draftLayout.row1.pop();
				draftLayout.row2.unshift(actionKey);
			};

			for (const key of draftLayout[rowName]) {
				const descriptor = options.actions.get(key);
				if (descriptor === undefined) {
					continue;
				}

				const actionRow = container.createDiv({ cls: 'tdc-overflow-settings-row' });
				const actionInfo = actionRow.createDiv({
					cls: 'tdc-overflow-settings-action-info'
				});
				const actionIcon = actionInfo.createSpan({
					cls: 'tdc-overflow-settings-item-icon'
				});
				actionIcon.innerHTML = ICONS[descriptor.iconKey];
				actionInfo.createSpan({ text: descriptor.label });

				const actionButtons = actionRow.createDiv({ cls: 'tdc-overflow-settings-actions' });
				const isVisible = !draftLayout.hidden.includes(key);
				if (!isVisible) {
					actionRow.classList.add('tdc-overflow-settings-row-hidden');
				}
				const canMoveUp = canMoveAction(key, 'up');
				const canMoveDown = canMoveAction(key, 'down');
				createActionButton({
					container: actionButtons,
					iconKey: isVisible ? 'eye' : 'eyeOff',
					cssClass: 'tdc-overflow-settings-visibility',
					ariaLabel: isVisible ? `Hide ${descriptor.label}` : `Show ${descriptor.label}`,
					faded: false,
					onClick: () => {
						if (isVisible) {
							draftLayout.hidden.push(key);
						} else {
							draftLayout.hidden = draftLayout.hidden.filter(
								(hiddenKey) => hiddenKey !== key
							);
						}
						draftLayout.hidden = dedupeIssueActionKeys(draftLayout.hidden);
						persistDraftLayout();
						renderSettingsView();
					}
				});

				createActionButton({
					container: actionButtons,
					iconKey: 'up',
					cssClass: 'tdc-overflow-settings-move',
					ariaLabel: `Move ${descriptor.label} up`,
					faded: !canMoveUp,
					onClick: () => {
						if (!canMoveUp) {
							return;
						}
						moveActionByOne(key, 'up');
						persistDraftLayout();
						renderSettingsView();
					}
				});

				createActionButton({
					container: actionButtons,
					iconKey: 'down',
					cssClass: 'tdc-overflow-settings-move',
					ariaLabel: `Move ${descriptor.label} down`,
					faded: !canMoveDown,
					onClick: () => {
						if (!canMoveDown) {
							return;
						}
						moveActionByOne(key, 'down');
						persistDraftLayout();
						renderSettingsView();
					}
				});
			}
		};

		const renderSettingsView = (): void => {
			if (panel === undefined) {
				return;
			}
			panel.empty();
			ensureActionPlacement();

			const settingsContainer = panel.createDiv({ cls: 'tdc-overflow-settings' });
			renderSettingsRows(settingsContainer, 'row1');
			settingsContainer.createDiv({ cls: 'tdc-overflow-settings-divider' });
			renderSettingsRows(settingsContainer, 'row2');
		};

		const renderPanel = (): void => {
			if (inSettingsMode) {
				renderSettingsView();
				return;
			}
			renderActionsView();
		};

		const openPanel = (startInSettingsMode = false): void => {
			if (isDisposed) {
				return;
			}
			const overflowPanel = createPanel();
			inSettingsMode = startInSettingsMode;
			if (!startInSettingsMode) {
				resetDraftLayout();
			}
			overflowPanel.style.display = 'block';
			isOpen = true;
			renderPanel();
			requestAnimationFrame(positionPanel);

			window.addEventListener('scroll', positionPanel, true);
			window.addEventListener('resize', positionPanel);
			window.addEventListener('blur', closePanel);
			document.addEventListener('click', closePanelOnOutsideClick, true);
			document.addEventListener('keydown', closePanelOnEscape, true);
		};

		const handleOverflowButtonClick = (event: MouseEvent): void => {
			event.preventDefault();
			event.stopPropagation();
			if (isOpen) {
				closePanel();
				return;
			}
			openPanel(false);
		};

		const handleOverflowButtonContextMenu = (event: MouseEvent): void => {
			event.preventDefault();
			event.stopPropagation();
			if (isOpen) {
				inSettingsMode = true;
				renderPanel();
				requestAnimationFrame(positionPanel);
				return;
			}
			openPanel(true);
		};

		options.overflowButton.addEventListener('click', handleOverflowButtonClick);
		options.overflowButton.addEventListener('contextmenu', handleOverflowButtonContextMenu);

		return () => {
			if (isDisposed) {
				return;
			}
			isDisposed = true;
			closePanel();
			options.overflowButton.removeEventListener('click', handleOverflowButtonClick);
			options.overflowButton.removeEventListener(
				'contextmenu',
				handleOverflowButtonContextMenu
			);
		};
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

	const renderGitHubCardWithRefresh = async (
		container: HTMLElement,
		githubUrl: string,
		issueId?: string,
		dashboard?: DashboardConfig
	): Promise<void> => {
		const onUnlink =
			issueId !== undefined && dashboard !== undefined
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

		const actionLayout = getIssueActionLayout(dashboard);
		const issueActions = buildIssueActionDescriptors(container, params, dashboard);
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
