import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import TasksDashboardPlugin from '../main';
import { DashboardConfig, ProgressDisplayMode, getDashboardDisplayName } from './types';
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
							rootPath: '',
							dashboardFilename: 'Dashboard.md'
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
		const displayName = getDashboardDisplayName(dashboard);
		dashboardContainer.createEl('h3', { text: `Dashboard: ${displayName}` });
		new Setting(dashboardContainer)
			.setName('Root Path')
			.setDesc(
				'Path to the folder containing your dashboard file. If you rename the folder in Obsidian, update this path to match.'
			)
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
			.setName('Dashboard Filename')
			.setDesc(
				'Name of the dashboard file (also used as display name). If you rename the file in Obsidian, update this to match.'
			)
			.addText((text) =>
				text
					.setPlaceholder('Dashboard.md')
					.setValue(dashboard.dashboardFilename || 'Dashboard.md')
					.onChange((value) => {
						const filename = value.endsWith('.md') ? value : `${value}.md`;
						dashboard.dashboardFilename = filename;
						void this.plugin.saveSettings();
						this.plugin.registerDashboardCommands();
					})
			);

		const dashboardFilesSetting = new Setting(dashboardContainer).setName('Dashboard Files');

		const updateDashboardButton = (): void => {
			const currentFilename = dashboard.dashboardFilename || 'Dashboard.md';
			const currentPath =
				dashboard.rootPath !== '' ? `${dashboard.rootPath}/${currentFilename}` : '';
			const exists =
				currentPath !== '' && this.app.vault.getAbstractFileByPath(currentPath) !== null;

			dashboardFilesSetting.controlEl.empty();

			if (exists) {
				dashboardFilesSetting.setDesc('Dashboard file exists');
				dashboardFilesSetting.addButton((btn) =>
					btn.setButtonText('Open Dashboard').onClick(() => {
						void this.app.workspace.openLinkText(currentPath, '', false);
					})
				);
			} else {
				dashboardFilesSetting.setDesc(
					`Create ${currentFilename} and Issue folders at the specified path`
				);
				dashboardFilesSetting.addButton((btn) =>
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
									new Notice(`Dashboard created at ${currentPath}`);
									updateDashboardButton();
								})
								.catch((error: unknown) => {
									new Notice(`Error: ${(error as Error).message}`);
								});
						})
				);
			}
		};

		updateDashboardButton();
		new Setting(dashboardContainer)
			.setName('Hotkey')
			.setDesc(
				`Configure hotkey in Obsidian Settings → Hotkeys → Search for "Create Issue: ${displayName}"`
			)
			.addButton((btn) =>
				btn.setButtonText('Open Hotkeys').onClick(() => {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
					(this.app as any).setting.openTabById('hotkeys');
				})
			);
		new Setting(dashboardContainer)
			.setName('Rebuild Dashboard')
			.setDesc('Reconstruct dashboard from issue files (fixes corrupted dashboards)')
			.addButton((btn) =>
				btn
					.setButtonText('Rebuild')
					.setWarning()
					.onClick(() => {
						if (dashboard.rootPath === '') {
							new Notice('Please set a root path first');
							return;
						}
						this.plugin.dashboardWriter
							.rebuildDashboardFromFiles(dashboard)
							.catch((error: unknown) => {
								new Notice(`Error: ${(error as Error).message}`);
							});
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
