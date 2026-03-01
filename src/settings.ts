import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import TasksDashboardPlugin from '../main';
import { DashboardConfig, getDashboardDisplayName } from './types';
import { generateId } from './utils/slugify';
import { createPlatformService } from './utils/platform';
import { DashboardDeleteConfirmationModal } from './modals/dashboard-delete-modal';
import { ICONS } from './dashboard/header-actions';
import {
	cleanupDashboardSettingData,
	collectDashboardIssueIds,
	trashDashboardFiles
} from './settings/dashboard-cleanup';
import {
	DASHBOARD_VISIBILITY_TOGGLES,
	DEFAULT_DASHBOARD_FILENAME,
	PROGRESS_DISPLAY_OPTIONS,
	isProgressDisplayMode,
	type VisibilityToggleKey
} from './settings/settings-options';
import {
	addDropdownOptions,
	buildVaultPath,
	getDashboardFilename,
	getErrorMessage,
	hasSettingsTabApi,
	resolveCollapsedDashboardSettingsMap,
	withMarkdownExtension
} from './settings/settings-helpers';
import {
	renderGitHubSettings,
	renderRepositoryPicker
} from './settings/github-settings-renderer';

function createVisibilityToggle(
	container: HTMLElement,
	dashboard: DashboardConfig,
	key: VisibilityToggleKey,
	name: string,
	description: string,
	plugin: TasksDashboardPlugin
): void {
	new Setting(container)
		.setName(name)
		.setDesc(description)
		.addToggle((toggle) =>
			toggle.setValue(dashboard[key] ?? true).onChange((value) => {
				dashboard[key] = value;
				void plugin.saveSettings();
				plugin.triggerDashboardRefresh();
			})
		);
}

export class TasksDashboardSettingTab extends PluginSettingTab {
	plugin: TasksDashboardPlugin;
	private platformService = createPlatformService();

	private saveSettings(): void {
		void this.plugin.saveSettings();
	}

	private saveSettingsAndRefreshDashboard(): void {
		this.saveSettings();
		this.plugin.triggerDashboardRefresh();
	}

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
			.addDropdown((dropdown) => {
				addDropdownOptions(dropdown, PROGRESS_DISPLAY_OPTIONS);

				dropdown.setValue(this.plugin.settings.progressDisplayMode).onChange((value) => {
					if (!isProgressDisplayMode(value)) {
						return;
					}

					this.plugin.settings.progressDisplayMode = value;
					this.saveSettingsAndRefreshDashboard();
				});
			});

		renderGitHubSettings({
			app: this.app,
			containerEl,
			settings: this.plugin.settings,
			githubService: this.plugin.githubService,
			saveSettings: () => {
				this.saveSettings();
			},
			saveSettingsAndRefreshDashboard: () => {
				this.saveSettingsAndRefreshDashboard();
			},
			display: () => {
				this.display();
			}
		});

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
							dashboardFilename: DEFAULT_DASHBOARD_FILENAME,
							githubEnabled: true
						};
						this.plugin.settings.dashboards.push(newDashboard);
						this.saveSettings();
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

	private isDashboardSettingsCollapsed(dashboard: DashboardConfig): boolean {
		const collapsedDashboardSettings = resolveCollapsedDashboardSettingsMap(
			this.plugin.settings
		);
		return collapsedDashboardSettings[dashboard.id] === true;
	}

	private setDashboardSettingsCollapsed(dashboard: DashboardConfig, collapsed: boolean): void {
		const collapsedDashboardSettings = resolveCollapsedDashboardSettingsMap(
			this.plugin.settings
		);
		if (collapsed) {
			collapsedDashboardSettings[dashboard.id] = true;
		} else {
			delete collapsedDashboardSettings[dashboard.id];
		}
		this.saveSettings();
	}

	private renderDashboardSettings(
		containerEl: HTMLElement,
		dashboard: DashboardConfig,
		index: number
	): void {
		const dashboardContainer = containerEl.createDiv({ cls: 'tdc-dashboard-config' });
		const displayName = getDashboardDisplayName(dashboard);
		const isCollapsed = this.isDashboardSettingsCollapsed(dashboard);
		const dashboardHeader = dashboardContainer.createDiv({
			cls: 'tdc-dashboard-config-header'
		});
		const collapseToggle = dashboardHeader.createEl('button', {
			cls: `tdc-btn-collapse${isCollapsed ? ' tdc-chevron-collapsed' : ''}`,
			attr: {
				type: 'button',
				'aria-expanded': String(!isCollapsed),
				'aria-label': isCollapsed
					? `Expand settings for ${displayName}`
					: `Collapse settings for ${displayName}`
			}
		});
		collapseToggle.innerHTML = ICONS.chevron;
		const titleContainer = dashboardHeader.createDiv({ cls: 'tdc-dashboard-config-title' });
		titleContainer.createEl('h3', { text: `Dashboard: ${displayName}` });
		collapseToggle.addEventListener('click', () => {
			this.setDashboardSettingsCollapsed(dashboard, !isCollapsed);
			this.display();
		});

		if (isCollapsed) {
			return;
		}

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
						this.saveSettings();
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
					.setValue(getDashboardFilename(dashboard))
					.onChange((value) => {
						dashboard.dashboardFilename = withMarkdownExtension(value);
						this.saveSettings();
						this.plugin.registerDashboardCommands();
					})
			);
		new Setting(dashboardContainer)
			.setName('GitHub Integration')
			.setDesc('Enable GitHub issue linking for this dashboard')
			.addToggle((toggle) =>
				toggle.setValue(dashboard.githubEnabled).onChange((value) => {
					dashboard.githubEnabled = value;
					this.saveSettingsAndRefreshDashboard();
					this.display();
				})
			);

		if (dashboard.githubEnabled) {
			renderRepositoryPicker(dashboardContainer, dashboard, {
				app: this.app,
				githubService: this.plugin.githubService,
				saveSettings: () => {
					this.saveSettings();
				},
				display: () => {
					this.display();
				}
			});
		}

		const projectFolderSetting = new Setting(dashboardContainer)
			.setName('Project Folder')
			.setDesc(
				'Absolute path to the on-disk project folder. Enables Open Folder and Terminal buttons on the dashboard.'
			)
			.addText((text) =>
				text
					.setPlaceholder('C:\\Projects\\MyApp')
					.setValue(dashboard.projectFolder ?? '')
					.onChange((value) => {
						dashboard.projectFolder = value !== '' ? value : undefined;
						this.saveSettingsAndRefreshDashboard();
					})
			);

		projectFolderSetting.addButton((btn) =>
			btn.setButtonText('Browse').onClick(() => {
				void this.platformService.pickFolder(dashboard.projectFolder).then((folderPath) => {
					if (folderPath !== undefined) {
						dashboard.projectFolder = folderPath;
						this.saveSettings();
						this.display();
					}
				});
			})
		);

		for (const toggle of DASHBOARD_VISIBILITY_TOGGLES) {
			createVisibilityToggle(
				dashboardContainer,
				dashboard,
				toggle.key,
				toggle.name,
				toggle.description,
				this.plugin
			);
		}

		const dashboardFilesSetting = new Setting(dashboardContainer).setName('Dashboard Files');

		const updateDashboardButton = (): void => {
			const currentFilename = getDashboardFilename(dashboard);
			const currentPath =
				dashboard.rootPath !== '' ? buildVaultPath(dashboard.rootPath, currentFilename) : '';
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
									new Notice(`Error: ${getErrorMessage(error)}`);
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
					if (hasSettingsTabApi(this.app)) {
						this.app.setting?.openTabById('hotkeys');
					}
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
								new Notice(`Error: ${getErrorMessage(error)}`);
							});
					})
			);
		new Setting(dashboardContainer)
			.setName('Remove Dashboard')
			.setDesc('Delete this dashboard configuration and clean up related settings')
			.addButton((btn) =>
				btn
					.setButtonText('Remove')
					.setWarning()
					.onClick(() => {
						const displayName = getDashboardDisplayName(dashboard);
						new DashboardDeleteConfirmationModal(this.app, displayName, (result) => {
							if (!result.confirmed) {
								return;
							}
							void this.deleteDashboard(dashboard, index, result.deleteFiles);
						}).open();
					})
			);
	}

	private async deleteDashboard(
		dashboard: DashboardConfig,
		index: number,
		deleteFiles: boolean
	): Promise<void> {
		const issueIds = await collectDashboardIssueIds(this.app, dashboard);
		cleanupDashboardSettingData(this.plugin.settings, dashboard, issueIds);

		if (deleteFiles) {
			await trashDashboardFiles(this.app, dashboard);
		}

		this.plugin.settings.dashboards.splice(index, 1);
		await this.plugin.saveSettings();
		this.plugin.registerDashboardCommands();
		this.display();
	}
}
