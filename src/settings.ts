import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import TasksDashboardPlugin from '../main';
import { DashboardConfig, ProgressDisplayMode } from './types';
import { generateId } from './utils/slugify';
export class TasksDashboardSettingTab extends PluginSettingTab {
    plugin: TasksDashboardPlugin;
    constructor(app: App, plugin: TasksDashboardPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Tasks Dashboard Settings' });
        containerEl.createEl('p', {
            text: 'Configure your task dashboards. Each dashboard manages issues in its own folder.',
            cls: 'setting-item-description'
        });
        new Setting(containerEl)
            .setName('Progress Display')
            .setDesc('How to show task progress for each issue')
            .addDropdown(dropdown => dropdown
                .addOption('number', 'Number only (1/5)')
                .addOption('percentage', 'Percentage only (20%)')
                .addOption('bar', 'Progress bar only')
                .addOption('number-percentage', 'Number & percentage (1/5 (20%))')
                .addOption('all', 'All (bar + percentage + number)')
                .setValue(this.plugin.settings.progressDisplayMode)
                .onChange(async (value) => {
                    this.plugin.settings.progressDisplayMode = value as ProgressDisplayMode;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('Add Dashboard')
            .setDesc('Create a new dashboard configuration')
            .addButton(btn => btn
                .setButtonText('+ Add Dashboard')
                .setCta()
                .onClick(async () => {
                    const newDashboard: DashboardConfig = {
                        id: generateId(),
                        name: 'New Dashboard',
                        rootPath: ''
                    };
                    this.plugin.settings.dashboards.push(newDashboard);
                    await this.plugin.saveSettings();
                    this.plugin.registerDashboardCommands();
                    this.display();
                }));
        if (this.plugin.settings.dashboards.length === 0) {
            containerEl.createEl('p', {
                text: 'No dashboards configured. Add one to get started.',
                cls: 'tdc-no-dashboards'
            });
        }
        this.plugin.settings.dashboards.forEach((dashboard, index) => {
            this.renderDashboardSettings(containerEl, dashboard, index);
        });
    }
    private renderDashboardSettings(containerEl: HTMLElement, dashboard: DashboardConfig, index: number): void {
        const dashboardContainer = containerEl.createDiv({ cls: 'tdc-dashboard-config' });
        dashboardContainer.createEl('h3', { text: `Dashboard: ${dashboard.name || 'Unnamed'}` });
        new Setting(dashboardContainer)
            .setName('Dashboard Name')
            .setDesc('Display name for this dashboard')
            .addText(text => text
                .setPlaceholder('My Project')
                .setValue(dashboard.name)
                .onChange(async (value) => {
                    dashboard.name = value;
                    await this.plugin.saveSettings();
                    this.plugin.registerDashboardCommands();
                }));
        new Setting(dashboardContainer)
            .setName('Root Path')
            .setDesc('Path to the folder containing your dashboard.md file (e.g., "Projects/MyProject")')
            .addText(text => text
                .setPlaceholder('Projects/MyProject')
                .setValue(dashboard.rootPath)
                .onChange(async (value) => {
                    dashboard.rootPath = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(dashboardContainer)
            .setName('Create Dashboard Files')
            .setDesc('Create dashboard.md and issue folders at the specified path')
            .addButton(btn => btn
                .setButtonText('Create Files')
                .setCta()
                .onClick(async () => {
                    if (!dashboard.rootPath) {
                        new Notice('Please set a root path first');
                        return;
                    }
                    try {
                        await this.plugin.createDashboardFiles(dashboard);
                        new Notice(`Dashboard created at ${dashboard.rootPath}/dashboard.md`);
                    } catch (error) {
                        new Notice(`Error: ${(error as Error).message}`);
                    }
                }));
        new Setting(dashboardContainer)
            .setName('Hotkey')
            .setDesc(`Configure hotkey in Obsidian Settings → Hotkeys → Search for "Create Issue: ${dashboard.name}"`)
            .addButton(btn => btn
                .setButtonText('Open Hotkeys')
                .onClick(() => {
                    (this.app as any).setting.openTabById('hotkeys');
                }));
        new Setting(dashboardContainer)
            .setName('Remove Dashboard')
            .setDesc('Delete this dashboard configuration (does not delete files)')
            .addButton(btn => btn
                .setButtonText('Remove')
                .setWarning()
                .onClick(async () => {
                    this.plugin.settings.dashboards.splice(index, 1);
                    await this.plugin.saveSettings();
                    this.plugin.registerDashboardCommands();
                    this.display();
                }));
    }
}
