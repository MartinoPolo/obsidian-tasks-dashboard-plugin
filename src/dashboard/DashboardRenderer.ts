import { MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { Priority, PRIORITY_COLORS, IssueProgress, DashboardConfig } from '../types';
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
    sort: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>`
};
export class DashboardRenderer {
    private plugin: TasksDashboardPlugin;
    constructor(plugin: TasksDashboardPlugin) {
        this.plugin = plugin;
    }
    async render(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> {
        const params = this.parseParams(source);
        if (!params) {
            el.createEl('span', { text: 'Invalid control block', cls: 'tdc-error' });
            return;
        }
        const dashboard = this.plugin.settings.dashboards.find(d => d.id === params.dashboard);
        if (!dashboard) return;
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
            if (key && value) {
                const k = key.trim() as keyof ControlParams;
                (params as any)[k] = value;
            }
        }
        if (params.issue && params.name && params.path && params.dashboard && params.priority) {
            return params as ControlParams;
        }
        return null;
    }
    private renderHeader(container: HTMLElement, params: ControlParams): void {
        const header = container.createDiv({ cls: `tdc-issue-header priority-${params.priority}` });
        const link = header.createEl('a', {
            cls: 'internal-link',
            text: params.name
        });
        link.setAttribute('href', params.path);
        link.setAttribute('data-href', params.path);
        link.addEventListener('click', (e) => {
            e.preventDefault();
            this.plugin.app.workspace.openLinkText(params.path, '', false);
        });
    }
    private renderProgressBar(container: HTMLElement, progress: IssueProgress, priority: Priority): void {
        const progressContainer = container.createDiv({ cls: 'tdc-progress' });
        const bar = progressContainer.createDiv({ cls: 'tdc-progress-bar' });
        const fill = bar.createDiv({ cls: 'tdc-progress-fill' });
        fill.style.width = `${progress.percentage}%`;
        fill.style.backgroundColor = PRIORITY_COLORS[priority];
        const text = progressContainer.createSpan({ cls: 'tdc-progress-text' });
        text.setText(`${progress.percentage}% (${progress.done}/${progress.total})`);
    }
    private renderButtons(container: HTMLElement, params: ControlParams, dashboard: DashboardConfig): void {
        const btnContainer = container.createDiv({ cls: 'tdc-btn-group' });
        const upBtn = btnContainer.createEl('button', { cls: 'tdc-btn tdc-btn-move', attr: { 'aria-label': 'Move up' } });
        upBtn.innerHTML = ICONS.up;
        upBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this.plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'up');
        });
        const downBtn = btnContainer.createEl('button', { cls: 'tdc-btn tdc-btn-move', attr: { 'aria-label': 'Move down' } });
        downBtn.innerHTML = ICONS.down;
        downBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this.plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'down');
        });
        const archiveBtn = btnContainer.createEl('button', { cls: 'tdc-btn tdc-btn-archive', attr: { 'aria-label': 'Archive' } });
        archiveBtn.innerHTML = ICONS.trash;
        archiveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await this.plugin.issueManager.archiveIssue(dashboard, params.issue);
        });
    }
    renderSortButton(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
        const dashboardIdMatch = source.match(/dashboard:\s*([\w-]+)/);
        if (!dashboardIdMatch) return;
        const dashboard = this.plugin.settings.dashboards.find(d => d.id === dashboardIdMatch[1]);
        if (!dashboard) return;
        el.empty();
        const container = el.createDiv({ cls: 'tdc-sort-container' });
        const sortBtn = container.createEl('button', { cls: 'tdc-btn tdc-btn-sort' });
        sortBtn.innerHTML = ICONS.sort + ' Sort by Priority';
        sortBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.plugin.dashboardWriter.sortByPriority(dashboard);
        });
        ctx.addChild(new MarkdownRenderChild(container));
    }
}
