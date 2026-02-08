import { MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { Priority, IssueProgress, DashboardConfig } from '../types';
import { NamePromptModal } from '../modals/IssueModal';
import { createGitHubCardRenderer } from '../github/GitHubCardRenderer';

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
	up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`,
	down: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>`,
	sort: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>`,
	plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`
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

	const renderHeader = (container: HTMLElement, params: ControlParams): void => {
		const header = container.createDiv({
			cls: `tdc-issue-header priority-${params.priority}`
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
		archiveBtn.innerHTML = ICONS.trash;
		archiveBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			void plugin.issueManager.archiveIssue(dashboard, params.issue);
		});
	};

	const renderGitHubCard = async (
		container: HTMLElement,
		githubUrl: string
	): Promise<void> => {
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

		const container = el.createDiv({ cls: 'tdc-issue-container' });
		renderHeader(container, params);

		const controls = container.createDiv({ cls: 'tdc-controls' });
		const progress = await plugin.progressTracker.getProgress(params.path);
		renderProgressBar(controls, progress, params.priority);
		renderButtons(controls, params, dashboard);

		if (params.github !== undefined && params.github !== '') {
			await renderGitHubCard(container, params.github);
		}

		ctx.addChild(new MarkdownRenderChild(container));
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

		const sortBtn = container.createEl('button', { cls: 'tdc-btn tdc-btn-action' });
		sortBtn.innerHTML = ICONS.sort + ' Sort';
		sortBtn.addEventListener('click', (e) => {
			e.preventDefault();
			void plugin.dashboardWriter.sortByPriority(dashboard);
		});

		ctx.addChild(new MarkdownRenderChild(container));
	};

	return { render, renderSortButton };
}
