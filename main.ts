import { Plugin, MarkdownPostProcessorContext, Notice } from 'obsidian';
import { TasksDashboardSettings, DEFAULT_SETTINGS, DashboardConfig } from './src/types';
import { TasksDashboardSettingTab } from './src/settings';
import { NamePromptModal } from './src/modals/IssueModal';
import { IssueManager } from './src/issues/IssueManager';
import { ProgressTracker } from './src/issues/ProgressTracker';
import { DashboardWriter } from './src/dashboard/DashboardWriter';
import { DashboardRenderer } from './src/dashboard/DashboardRenderer';
import { DashboardParser } from './src/dashboard/DashboardParser';
export default class TasksDashboardPlugin extends Plugin {
    settings: TasksDashboardSettings;
    issueManager: IssueManager;
    progressTracker: ProgressTracker;
    dashboardWriter: DashboardWriter;
    dashboardRenderer: DashboardRenderer;
    private registeredCommands: string[] = [];
    async onload() {
        await this.loadSettings();
        this.issueManager = new IssueManager(this.app, this);
        this.progressTracker = new ProgressTracker(this.app);
        this.dashboardWriter = new DashboardWriter(this.app, this);
        this.dashboardRenderer = new DashboardRenderer(this);
        this.registerMarkdownCodeBlockProcessor(
            'tasks-dashboard-controls',
            (source, el, ctx) => this.dashboardRenderer.render(source, el, ctx)
        );
        this.registerMarkdownCodeBlockProcessor(
            'tasks-dashboard-sort',
            (source, el, ctx) => this.dashboardRenderer.renderSortButton(source, el, ctx)
        );
        this.registerDashboardCommands();
        this.addSettingTab(new TasksDashboardSettingTab(this.app, this));
        this.addRibbonIcon('list-checks', 'Tasks Dashboard', () => {
            this.showDashboardSelector();
        });
        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                if (file.path.includes('/issues/')) {
                    this.progressTracker.invalidateCache(file.path);
                }
            })
        );
    }
    onunload() {
        this.registeredCommands.forEach(id => {
            (this.app as any).commands.removeCommand(id);
        });
    }
    registerDashboardCommands() {
        this.registeredCommands.forEach(id => {
            (this.app as any).commands.removeCommand(id);
        });
        this.registeredCommands = [];
        this.settings.dashboards.forEach(dashboard => {
            const commandId = `tasks-dashboard:create-issue-${dashboard.id}`;
            this.addCommand({
                id: `create-issue-${dashboard.id}`,
                name: `Create Issue: ${dashboard.name}`,
                callback: () => {
                    new NamePromptModal(this.app, this, dashboard).open();
                }
            });
            this.registeredCommands.push(commandId);
        });
        if (this.settings.dashboards.length > 0) {
            this.addCommand({
                id: 'create-issue-default',
                name: 'Create Issue (Select Dashboard)',
                hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'e' }],
                callback: () => {
                    this.showDashboardSelector();
                }
            });
            this.registeredCommands.push('tasks-dashboard:create-issue-default');
        }
    }
    private showDashboardSelector() {
        if (this.settings.dashboards.length === 0) {
            const { Notice } = require('obsidian');
            new Notice('No dashboards configured. Please add one in settings.');
            return;
        }
        if (this.settings.dashboards.length === 1) {
            new NamePromptModal(this.app, this, this.settings.dashboards[0]).open();
            return;
        }
        const { FuzzySuggestModal } = require('obsidian');
        class DashboardSelectorModal extends FuzzySuggestModal<DashboardConfig> {
            plugin: TasksDashboardPlugin;
            constructor(plugin: TasksDashboardPlugin) {
                super(plugin.app);
                this.plugin = plugin;
            }
            getItems(): DashboardConfig[] {
                return this.plugin.settings.dashboards;
            }
            getItemText(item: DashboardConfig): string {
                return item.name;
            }
            onChooseItem(item: DashboardConfig): void {
                new NamePromptModal(this.plugin.app, this.plugin, item).open();
            }
        }
        new DashboardSelectorModal(this).open();
    }
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
    async createDashboardFiles(dashboard: DashboardConfig): Promise<void> {
        const rootPath = dashboard.rootPath;
        if (!rootPath) throw new Error('Root path is required');
        await this.ensureFolder(rootPath);
        await this.ensureFolder(`${rootPath}/issues`);
        await this.ensureFolder(`${rootPath}/issues/active`);
        await this.ensureFolder(`${rootPath}/issues/archive`);
        const dashboardPath = `${rootPath}/dashboard.md`;
        if (!this.app.vault.getAbstractFileByPath(dashboardPath)) {
            const parser = new DashboardParser();
            const content = parser.initializeStructure(dashboard.id);
            await this.app.vault.create(dashboardPath, content);
        }
    }
    private async ensureFolder(path: string): Promise<void> {
        if (!this.app.vault.getAbstractFileByPath(path)) {
            await this.app.vault.createFolder(path);
        }
    }
}
