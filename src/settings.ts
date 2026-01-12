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
			.addDropdown((dropdown) =>
				dropdown
					.addOption('number', 'Number only (1/5)')
					.addOption('percentage', 'Percentage only (20%)')
					.addOption('bar', 'Progress bar only')
					.addOption('number-percentage', 'Number & percentage (1/5 (20%))')
					.addOption('all', 'All (bar + percentage + number)')
					.setValue(this.plugin.settings.progressDisplayMode)
					.onChange((value) => {
						this.plugin.settings.progressDisplayMode = value as ProgressDisplayMode;
						void this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName('Add Dashboard')
			.setDesc('Create a new dashboard configuration')
			.addButton((btn) =>
				btn
					.setButtonText('+ Add Dashboard')
					.setCta()
					.onClick(() => {
						const newDashboard: DashboardConfig = {
							id: generateId(),
							name: 'New Dashboard',
							rootPath: ''
						};
						this.plugin.settings.dashboards.push(newDashboard);
						void this.plugin.saveSettings();
						this.plugin.registerDashboardCommands();
						this.display();
					})
			);
		if (this.plugin.settings.dashboards.length === 0) {
			containerEl.createEl('p', {
				text: 'No dashboards configured. Add one to get started.',
				cls: 'tdc-no-dashboards'
			});
		}
		for (const [index, dashboard] of this.plugin.settings.dashboards.entries()) {
			this.renderDashboardSettings(containerEl, dashboard, index);
		}
	}

	private renderDashboardSettings(
		containerEl: HTMLElement,
		dashboard: DashboardConfig,
		index: number
	): void {
		const dashboardContainer = containerEl.createDiv({ cls: 'tdc-dashboard-config' });
		const displayName = dashboard.name !== '' ? dashboard.name : 'Unnamed';
		dashboardContainer.createEl('h3', { text: `Dashboard: ${displayName}` });
		new Setting(dashboardContainer)
			.setName('Dashboard Name')
			.setDesc('Display name for this dashboard')
			.addText((text) =>
				text
					.setPlaceholder('My Project')
					.setValue(dashboard.name)
					.onChange((value) => {
						dashboard.name = value;
						void this.plugin.saveSettings();
						this.plugin.registerDashboardCommands();
					})
			);
		new Setting(dashboardContainer)
			.setName('Root Path')
			.setDesc('Path to the folder containing your Dashboard.md file (e.g., "Projects/MyProject")')
			.addText((text) =>
				text
					.setPlaceholder('Projects/MyProject')
					.setValue(dashboard.rootPath)
					.onChange((value) => {
						dashboard.rootPath = value;
						void this.plugin.saveSettings();
					})
			);
		new Setting(dashboardContainer)
			.setName('Create Dashboard Files')
			.setDesc('Create Dashboard.md and Issue folders at the specified path')
			.addButton((btn) =>
				btn
					.setButtonText('Create Files')
					.setCta()
					.onClick(() => {
						if (dashboard.rootPath === '') {
							new Notice('Please set a root path first');
							return;
						}
						this.plugin
							.createDashboardFiles(dashboard)
							.then(() => {
								new Notice(`Dashboard created at ${dashboard.rootPath}/Dashboard.md`);
							})
							.catch((error: unknown) => {
								new Notice(`Error: ${(error as Error).message}`);
							});
					})
			);
		new Setting(dashboardContainer)
			.setName('Hotkey')
			.setDesc(
				`Configure hotkey in Obsidian Settings → Hotkeys → Search for "Create Issue: ${dashboard.name}"`
			)
			.addButton((btn) =>
				btn.setButtonText('Open Hotkeys').onClick(() => {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
					(this.app as any).setting.openTabById('hotkeys');
				})
			);
		new Setting(dashboardContainer)
			.setName('Remove Dashboard')
			.setDesc('Delete this dashboard configuration (does not delete files)')
			.addButton((btn) =>
				btn
					.setButtonText('Remove')
					.setWarning()
					.onClick(() => {
						this.plugin.settings.dashboards.splice(index, 1);
						void this.plugin.saveSettings();
						this.plugin.registerDashboardCommands();
						this.display();
					})
			);
	}
}
