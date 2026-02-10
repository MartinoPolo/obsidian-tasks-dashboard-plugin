import { MarkdownPostProcessorContext, MarkdownRenderChild, Notice, TFile } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { Priority, IssueProgress, DashboardConfig, GitHubRepository } from '../types';
import { NamePromptModal, DeleteConfirmationModal, RenameIssueModal } from '../modals/IssueModal';
import { GitHubSearchModal } from '../modals/GitHubSearchModal';
import { RepositoryPickerModal } from '../modals/RepositoryPickerModal';
import { createGitHubCardRenderer } from '../github/GitHubCardRenderer';
import { parseDashboard } from './DashboardParser';

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

const ICONS = {
	trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
	archive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>`,
	up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`,
	down: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>`,
	sort: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>`,
	plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
	chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
	foldAll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-6"/><path d="M12 8V2"/><path d="M4 12H2"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M22 12h-2"/><path d="m15 19-3-3-3 3"/><path d="m15 5-3 3-3-3"/></svg>`,
	unfoldAll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-6"/><path d="M12 8V2"/><path d="M4 12H2"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M22 12h-2"/><path d="m15 16-3 3-3-3"/><path d="m15 8-3-3-3 3"/></svg>`,
	unarchive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9"/><path d="M3 5h18"/><path d="M10 12l2-2 2 2"/><path d="M12 10v6"/></svg>`,
	toTop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V7"/><path d="M5 12l7-7 7 7"/><line x1="5" y1="3" x2="19" y2="3"/></svg>`,
	toBottom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v12"/><path d="M19 12l-7 7-7-7"/><line x1="5" y1="21" x2="19" y2="21"/></svg>`,
	rename: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
	palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z"/></svg>`,
	github: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`
};

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

	const renderHeader = (container: HTMLElement, params: ControlParams): void => {
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
		const isArchived = /\/Issues\/Archive(\/|$)/i.test(params.path);
		const archiveLabel = isArchived ? 'Unarchive' : 'Archive';
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

		const toTopBtn = btnContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-move',
			attr: { 'aria-label': 'Move to top' }
		});
		toTopBtn.innerHTML = ICONS.toTop;
		toTopBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			void plugin.dashboardWriter.moveIssueToPosition(dashboard, params.issue, 'top');
		});

		const toBottomBtn = btnContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-move',
			attr: { 'aria-label': 'Move to bottom' }
		});
		toBottomBtn.innerHTML = ICONS.toBottom;
		toBottomBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			void plugin.dashboardWriter.moveIssueToPosition(dashboard, params.issue, 'bottom');
		});

		const renameBtn = btnContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-rename',
			attr: { 'aria-label': 'Rename' }
		});
		renameBtn.innerHTML = ICONS.rename;
		renameBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			new RenameIssueModal(plugin.app, plugin, dashboard, params.issue, params.name).open();
		});

		const colorBtn = btnContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-color',
			attr: { 'aria-label': 'Header color' }
		});
		colorBtn.innerHTML = ICONS.palette;
		colorBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
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

		if (dashboard.githubEnabled) {
			const hasGithubLinks = params.githubLinks.length > 0;
			const quickOpenBtn = btnContainer.createEl('button', {
				cls: `tdc-btn tdc-btn-github-quickopen${hasGithubLinks ? '' : ' tdc-btn-faded'}`,
				attr: { 'aria-label': hasGithubLinks ? 'Open GitHub link' : 'Add GitHub link' }
			});
			quickOpenBtn.innerHTML = ICONS.github;
			quickOpenBtn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (hasGithubLinks) {
					window.open(params.githubLinks[0], '_blank');
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
			});
		}

		if (dashboard.githubEnabled && plugin.githubService.isAuthenticated()) {
			const githubWrapper = btnContainer.createDiv({ cls: 'tdc-github-btn-wrapper' });

			const githubBtn = githubWrapper.createEl('button', {
				cls: 'tdc-btn tdc-btn-github',
				attr: { 'aria-label': 'Add GitHub link' }
			});
			githubBtn.innerHTML = ICONS.github;

			const githubDropdown = githubWrapper.createDiv({ cls: 'tdc-github-dropdown' });
			githubDropdown.style.display = 'none';
			let githubDropdownOpen = false;
			let githubDropdownMounted = false;

			const issuePrOption = githubDropdown.createDiv({
				cls: 'tdc-github-dropdown-item',
				text: 'Link Issue/PR'
			});
			issuePrOption.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				closeGithubDropdown();
				new GitHubSearchModal(plugin.app, plugin, dashboard, (url, metadata) => {
					if (url === undefined) {
						return;
					}
					void plugin.issueManager.addGitHubLink(dashboard, params.issue, url, metadata);
				}).open();
			});

			const repoOption = githubDropdown.createDiv({
				cls: 'tdc-github-dropdown-item',
				text: 'Link Repository'
			});
			repoOption.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				closeGithubDropdown();
				void openRepositoryPickerForExistingIssue(dashboard, params.issue);
			});

			const positionGithubDropdown = (): void => {
				if (!githubDropdownOpen) {
					return;
				}
				const rect = githubBtn.getBoundingClientRect();
				const viewportPadding = 8;
				const dropdownWidth = Math.max(githubDropdown.offsetWidth, 160);
				const maxLeft = window.innerWidth - dropdownWidth - viewportPadding;
				const left = Math.max(viewportPadding, Math.min(rect.left, maxLeft));
				githubDropdown.style.minWidth = '160px';
				githubDropdown.style.left = `${left}px`;
				githubDropdown.style.top = `${rect.bottom + 4}px`;
			};

			const openGithubDropdown = (): void => {
				githubDropdownOpen = true;
				if (!githubDropdownMounted) {
					document.body.appendChild(githubDropdown);
					githubDropdown.classList.add('tdc-sort-dropdown-portal');
					githubDropdownMounted = true;
				}
				githubDropdown.style.display = 'block';
				requestAnimationFrame(positionGithubDropdown);
				window.addEventListener('scroll', positionGithubDropdown, true);
				window.addEventListener('resize', positionGithubDropdown);
			};

			const closeGithubDropdown = (): void => {
				githubDropdownOpen = false;
				githubDropdown.style.display = 'none';
				window.removeEventListener('scroll', positionGithubDropdown, true);
				window.removeEventListener('resize', positionGithubDropdown);
			};

			githubBtn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (githubDropdownOpen) {
					closeGithubDropdown();
				} else {
					openGithubDropdown();
				}
			});

			const closeGithubDropdownOnClick = (e: MouseEvent): void => {
				const target = e.target as Node;
				if (githubWrapper.contains(target) || githubDropdown.contains(target)) {
					return;
				}
				closeGithubDropdown();
			};

			document.addEventListener('click', closeGithubDropdownOnClick);
		}

		const archiveBtn = btnContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-archive',
			attr: { 'aria-label': archiveLabel, title: archiveLabel }
		});
		archiveBtn.innerHTML = isArchived ? ICONS.unarchive : ICONS.archive;
		archiveBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (isArchived) {
				void plugin.issueManager.unarchiveIssue(dashboard, params.issue);
			} else {
				void plugin.issueManager.archiveIssue(dashboard, params.issue);
			}
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

	const isGitHubRepoUrl = (url: string): boolean => {
		return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(url);
	};

	const parseGitHubRepoUrl = (url: string): { owner: string; repo: string } | undefined => {
		const match = url.match(/github\.com\/([^/]+)\/([^/]+?)\/?$/);
		if (match === null) {
			return undefined;
		}
		return { owner: match[1], repo: match[2] };
	};

	const renderGitHubRepoCard = async (container: HTMLElement, githubUrl: string): Promise<void> => {
		const githubContainer = container.createDiv({ cls: 'tdc-github-container' });

		if (!plugin.githubService.isAuthenticated()) {
			githubCardRenderer.renderSimpleLink(githubContainer, githubUrl);
			return;
		}

		const parsed = parseGitHubRepoUrl(githubUrl);
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
	};

	const renderGitHubCard = async (container: HTMLElement, githubUrl: string): Promise<void> => {
		if (isGitHubRepoUrl(githubUrl)) {
			return renderGitHubRepoCard(container, githubUrl);
		}

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

	const openRepositoryPickerForExistingIssue = async (
		dashboard: DashboardConfig,
		issueId: string
	): Promise<void> => {
		const repositories = await plugin.githubService.getUserRepositories();
		if (repositories.length === 0) {
			new Notice('No repositories found. Check your GitHub token.');
			return;
		}

		new RepositoryPickerModal(plugin.app, repositories, (repository: GitHubRepository) => {
			const repoUrl = `https://github.com/${repository.fullName}`;
			void plugin.issueManager.addGitHubLink(dashboard, issueId, repoUrl);
		}).open();
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

		renderHeader(container, params);

		const controls = container.createDiv({ cls: 'tdc-controls' });
		const progress = await plugin.progressTracker.getProgress(params.path);
		renderProgressBar(controls, progress, params.priority);
		renderButtons(controls, params, dashboard);

		if (dashboard.githubEnabled && params.githubLinks.length > 0) {
			for (const githubUrl of params.githubLinks) {
				await renderGitHubCard(container, githubUrl);
			}
		}

		if (isCollapsed) {
			setIssueCollapsed(el, true);
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
		let dropdownOpen = false;
		let dropdownMounted = false;

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
				closeSortDropdown();
				option.action();
			});
		}

		const positionSortDropdown = (): void => {
			if (!dropdownOpen) {
				return;
			}
			const rect = sortBtn.getBoundingClientRect();
			const viewportPadding = 8;
			const dropdownWidth = Math.max(sortDropdown.offsetWidth, rect.width);
			const maxLeft = window.innerWidth - dropdownWidth - viewportPadding;
			const left = Math.max(viewportPadding, Math.min(rect.left, maxLeft));
			sortDropdown.style.minWidth = `${rect.width}px`;
			sortDropdown.style.left = `${left}px`;
			sortDropdown.style.top = `${rect.bottom + 4}px`;
		};

		const openSortDropdown = (): void => {
			dropdownOpen = true;
			if (!dropdownMounted) {
				document.body.appendChild(sortDropdown);
				sortDropdown.classList.add('tdc-sort-dropdown-portal');
				dropdownMounted = true;
			}
			sortDropdown.style.display = 'block';
			requestAnimationFrame(positionSortDropdown);
			window.addEventListener('scroll', positionSortDropdown, true);
			window.addEventListener('resize', positionSortDropdown);
		};

		const closeSortDropdown = (): void => {
			dropdownOpen = false;
			sortDropdown.style.display = 'none';
			window.removeEventListener('scroll', positionSortDropdown, true);
			window.removeEventListener('resize', positionSortDropdown);
		};

		sortBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (dropdownOpen) {
				closeSortDropdown();
			} else {
				openSortDropdown();
			}
		});

		const closeSortDropdownOnClick = (e: MouseEvent): void => {
			const target = e.target as Node;
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
		collapseAllButton.addEventListener('click', (e) => {
			e.preventDefault();
			void getActiveIssueIds(dashboard).then((issueIds) => {
				for (const issueId of issueIds) {
					plugin.settings.collapsedIssues[issueId] = true;
				}
				void plugin.saveSettings();
				const dashboardEl =
					el.closest('.markdown-preview-view') ??
					el.closest('.markdown-reading-view') ??
					el.closest('.cm-editor') ??
					el.closest('.markdown-source-view');
				if (dashboardEl !== null) {
					for (const controlBlock of Array.from(
						dashboardEl.querySelectorAll('.block-language-tasks-dashboard-controls')
					)) {
						if (controlBlock instanceof HTMLElement) {
							setIssueCollapsed(controlBlock, true);
						}
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
					el.closest('.markdown-preview-view') ??
					el.closest('.markdown-reading-view') ??
					el.closest('.cm-editor') ??
					el.closest('.markdown-source-view');
				if (dashboardEl !== null) {
					for (const controlBlock of Array.from(
						dashboardEl.querySelectorAll('.block-language-tasks-dashboard-controls')
					)) {
						if (controlBlock instanceof HTMLElement) {
							setIssueCollapsed(controlBlock, false);
						}
					}
				}
			});
		});

		const containerRenderChild = new MarkdownRenderChild(container);
		containerRenderChild.onunload = () => {
			document.removeEventListener('click', closeSortDropdownOnClick);
			closeSortDropdown();
			if (dropdownMounted && sortDropdown.parentElement !== null) {
				sortDropdown.parentElement.removeChild(sortDropdown);
			}
		};
		ctx.addChild(containerRenderChild);
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
		await renderGitHubCard(container, params.url);

		ctx.addChild(new MarkdownRenderChild(container));
	};

	return { render, renderSortButton, renderGitHubNoteCard };
}
