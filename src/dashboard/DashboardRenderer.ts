import { MarkdownPostProcessorContext, MarkdownRenderChild, Notice, MarkdownView } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { Priority, PRIORITY_COLORS, IssueProgress, DashboardConfig } from '../types';
import { NamePromptModal } from '../modals/IssueModal';

interface ControlParams {
	issue: string;
	name: string;
	path: string;
	dashboard: string;
	priority: Priority;
}

const ICONS = {
	trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
	up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`,
	down: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>`,
	sort: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>`,
	refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`,
	plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`
};

export class DashboardRenderer {
	private plugin: TasksDashboardPlugin;

	constructor(plugin: TasksDashboardPlugin) {
		this.plugin = plugin;
	}

	async render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
		const params = this.parseParams(source);
		if (params === null) {
			el.createEl('span', { text: 'Invalid control block', cls: 'tdc-error' });
			return;
		}
		const dashboard = this.plugin.settings.dashboards.find((d) => d.id === params.dashboard);
		if (dashboard === undefined) {
			return;
		}
		const container = el.createDiv({ cls: 'tdc-issue-container' });
		this.renderHeader(container, params);
		const controls = container.createDiv({ cls: 'tdc-controls' });
		const progress = await this.plugin.progressTracker.getProgress(params.path);
		this.renderProgressBar(controls, progress, params.priority);
		this.renderButtons(controls, params, dashboard);
		ctx.addChild(new MarkdownRenderChild(container));
	}

	private parseParams(source: string): ControlParams | null {
		const lines = source.trim().split('\n');
		const params: Partial<ControlParams> = {};
		for (const line of lines) {
			const [key, ...valueParts] = line.split(':');
			const value = valueParts.join(':').trim();
			if (key !== '' && value !== '') {
				const k = key.trim() as keyof ControlParams;
				if (k === 'priority') {
					params[k] = value as Priority;
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
	}

	private renderHeader(container: HTMLElement, params: ControlParams): void {
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
			void this.plugin.app.workspace.openLinkText(params.path, '', false);
		});
	}

	private renderProgressBar(
		container: HTMLElement,
		progress: IssueProgress,
		priority: Priority
	): void {
		const mode = this.plugin.settings.progressDisplayMode;
		const progressContainer = container.createDiv({ cls: 'tdc-progress' });
		if (mode === 'bar' || mode === 'all') {
			const bar = progressContainer.createDiv({ cls: 'tdc-progress-bar' });
			const fill = bar.createDiv({ cls: 'tdc-progress-fill' });
			fill.style.width = `${progress.percentage}%`;
			fill.style.backgroundColor = PRIORITY_COLORS[priority];
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
	}

	private renderButtons(
		container: HTMLElement,
		params: ControlParams,
		dashboard: DashboardConfig
	): void {
		const btnContainer = container.createDiv({ cls: 'tdc-btn-group' });
		const upBtn = btnContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-move',
			attr: { 'aria-label': 'Move up' }
		});
		upBtn.innerHTML = ICONS.up;
		upBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			void this.plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'up');
		});
		const downBtn = btnContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-move',
			attr: { 'aria-label': 'Move down' }
		});
		downBtn.innerHTML = ICONS.down;
		downBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			void this.plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'down');
		});
		const archiveBtn = btnContainer.createEl('button', {
			cls: 'tdc-btn tdc-btn-archive',
			attr: { 'aria-label': 'Archive' }
		});
		archiveBtn.innerHTML = ICONS.trash;
		archiveBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			void this.plugin.issueManager.archiveIssue(dashboard, params.issue);
		});
	}

	renderSortButton(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
		const dashboardIdMatch = source.match(/dashboard:\s*([\w-]+)/);
		if (dashboardIdMatch === null) {
			return;
		}
		const dashboard = this.plugin.settings.dashboards.find((d) => d.id === dashboardIdMatch[1]);
		if (dashboard === undefined) {
			return;
		}
		el.empty();
		const container = el.createDiv({ cls: 'tdc-sort-container' });
		const addBtn = container.createEl('button', { cls: 'tdc-btn tdc-btn-add' });
		addBtn.innerHTML = ICONS.plus + ' Add Issue';
		addBtn.addEventListener('click', (e) => {
			e.preventDefault();
			new NamePromptModal(this.plugin.app, this.plugin, dashboard).open();
		});
		const sortBtn = container.createEl('button', { cls: 'tdc-btn tdc-btn-sort' });
		sortBtn.innerHTML = ICONS.sort + ' Sort';
		sortBtn.addEventListener('click', (e) => {
			e.preventDefault();
			void this.plugin.dashboardWriter.sortByPriority(dashboard);
		});
		const refreshBtn = container.createEl('button', { cls: 'tdc-btn tdc-btn-refresh' });
		refreshBtn.innerHTML = ICONS.refresh + ' Refresh';
		refreshBtn.addEventListener('click', (e) => {
			e.preventDefault();
			void this.refreshDashboard();
		});
		ctx.addChild(new MarkdownRenderChild(container));
	}

	async refreshDashboard(): Promise<void> {
		this.plugin.progressTracker.invalidateCache();
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (view === null || view.file === null) {
			new Notice('No active view to refresh');
			return;
		}
		const file = view.file;
		const leaf = view.leaf;
		const currentMode = view.getMode();
		await leaf.setViewState({
			type: 'markdown',
			state: { file: file.path, mode: currentMode }
		});
		new Notice('Progress refreshed');
	}
}
