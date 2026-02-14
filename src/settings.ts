import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import TasksDashboardPlugin from '../main';
import {
	DashboardConfig,
	ProgressDisplayMode,
	GitHubDisplayMode,
	getDashboardDisplayName
} from './types';
import { generateId } from './utils/slugify';
import { RepositoryPickerModal } from './modals/RepositoryPickerModal';
import { createPlatformService } from './utils/platform';

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

		this.renderGitHubSettings(containerEl);

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
							dashboardFilename: 'Dashboard.md',
							githubEnabled: true
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

	private renderGitHubSettings(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'GitHub Integration' });

		const authSetting = new Setting(containerEl)
			.setName('GitHub Authentication')
			.setDesc('Connect to GitHub to enable issue search and metadata display');

		const authStatus = containerEl.createDiv({ cls: 'tdc-github-auth-status' });
		const rateLimitStatus = containerEl.createDiv({ cls: 'tdc-github-rate-limit' });

		const updateRateLimitDisplay = (): void => {
			rateLimitStatus.empty();
			const currentRateLimit = this.plugin.githubService.getRateLimit();
			if (currentRateLimit === undefined) {
				return;
			}

			const resetDate = new Date(currentRateLimit.resetTimestamp * 1000);
			const now = new Date();
			const minutesUntilReset = Math.max(
				0,
				Math.ceil((resetDate.getTime() - now.getTime()) / 60000)
			);

			const isLow = currentRateLimit.remaining < currentRateLimit.limit * 0.1;
			const statusClass = isLow ? 'tdc-rate-limit-low' : 'tdc-rate-limit-ok';

			const rateLimitContainer = rateLimitStatus.createDiv({
				cls: `tdc-rate-limit-info ${statusClass}`
			});
			rateLimitContainer.createSpan({
				text: `API Rate Limit: ${currentRateLimit.remaining}/${currentRateLimit.limit} remaining`
			});
			rateLimitContainer.createSpan({
				cls: 'tdc-rate-limit-reset',
				text: minutesUntilReset > 0 ? ` (resets in ${minutesUntilReset}m)` : ' (resets now)'
			});
		};

		const updateAuthStatus = async (): Promise<void> => {
			authStatus.empty();
			if (
				this.plugin.settings.githubAuth.method === 'pat' &&
				this.plugin.settings.githubAuth.token !== undefined &&
				this.plugin.settings.githubAuth.token !== ''
			) {
				authStatus.createSpan({ cls: 'tdc-auth-checking', text: 'Checking connection...' });
				const result = await this.plugin.githubService.validateToken();
				authStatus.empty();
				if (result.valid) {
					authStatus.createSpan({
						cls: 'tdc-auth-connected',
						text: `Connected as @${result.username}`
					});
					updateRateLimitDisplay();
				} else {
					authStatus.createSpan({
						cls: 'tdc-auth-error',
						text:
							result.error !== undefined && result.error !== ''
								? result.error
								: 'Authentication failed'
					});
				}
			} else {
				authStatus.createSpan({ cls: 'tdc-auth-none', text: 'Not connected' });
			}
		};

		authSetting.addDropdown((dropdown) =>
			dropdown
				.addOption('none', 'Not configured')
				.addOption('pat', 'Personal Access Token')
				.setValue(this.plugin.settings.githubAuth.method)
				.onChange((value) => {
					this.plugin.settings.githubAuth.method = value as 'none' | 'pat';
					if (value === 'none') {
						this.plugin.settings.githubAuth.token = undefined;
						this.plugin.githubService.setAuth({ method: 'none' });
					}
					void this.plugin.saveSettings();
					this.display();
				})
		);

		if (this.plugin.settings.githubAuth.method === 'pat') {
			const tokenSetting = new Setting(containerEl)
				.setName('Personal Access Token')
				.setDesc(
					'Create a token at GitHub → Settings → Developer settings → Personal access tokens'
				);

			tokenSetting.addText((text) => {
				text.inputEl.type = 'password';
				text.inputEl.addClass('tdc-token-input');
				text
					.setPlaceholder('ghp_xxxxxxxxxxxx')
					.setValue(this.plugin.settings.githubAuth.token ?? '')
					.onChange((value) => {
						this.plugin.settings.githubAuth.token = value;
						this.plugin.githubService.setAuth(this.plugin.settings.githubAuth);
						void this.plugin.saveSettings();
					});
			});

			tokenSetting.addButton((btn) =>
				btn.setButtonText('Test').onClick(() => {
					void updateAuthStatus();
				})
			);

			tokenSetting.addExtraButton((btn) =>
				btn
					.setIcon('external-link')
					.setTooltip('Create new token on GitHub')
					.onClick(() => {
						window.open(
							'https://github.com/settings/tokens/new?scopes=repo&description=Obsidian%20Tasks%20Dashboard',
							'_blank'
						);
					})
			);
		}

		void updateAuthStatus();

		new Setting(containerEl)
			.setName('GitHub Display Mode')
			.setDesc('How much GitHub issue detail to show on the dashboard')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('minimal', 'Minimal (number and status only)')
					.addOption('compact', 'Compact (number, title, status, labels)')
					.addOption('full', 'Full (includes description and assignees)')
					.setValue(this.plugin.settings.githubDisplayMode)
					.onChange((value) => {
						this.plugin.settings.githubDisplayMode = value as GitHubDisplayMode;
						void this.plugin.saveSettings();
						this.plugin.rerenderDashboardViews();
					})
			);
	}

	private renderRepositoryPicker(container: HTMLElement, dashboard: DashboardConfig): void {
		const repoSetting = new Setting(container)
			.setName('GitHub Repository')
			.setDesc(
				'Link this dashboard to a specific repository for filtered issue suggestions (owner/repo)'
			);

		const currentRepo = dashboard.githubRepo ?? '';
		const isAuthenticated = this.plugin.githubService.isAuthenticated();

		if (isAuthenticated) {
			if (currentRepo !== '') {
				repoSetting.setDesc(`Currently linked: ${currentRepo}`);
			}

			repoSetting.addButton((button) =>
				button
					.setButtonText(currentRepo !== '' ? 'Change' : 'Select Repository')
					.setCta()
					.onClick(() => {
						void this.openRepositoryPicker(dashboard);
					})
			);

			if (currentRepo !== '') {
				repoSetting.addButton((button) =>
					button.setButtonText('Clear').onClick(() => {
						dashboard.githubRepo = undefined;
						void this.plugin.saveSettings();
						this.display();
					})
				);
			}
		} else {
			repoSetting.addText((text) =>
				text
					.setPlaceholder('owner/repo')
					.setValue(currentRepo)
					.onChange((value) => {
						dashboard.githubRepo = value !== '' ? value : undefined;
						void this.plugin.saveSettings();
					})
			);
		}
	}

	private async openRepositoryPicker(dashboard: DashboardConfig): Promise<void> {
		const repositories = await this.plugin.githubService.getUserRepositories();

		if (repositories.length === 0) {
			new Notice('No repositories found. Check your GitHub token permissions.');
			return;
		}

		new RepositoryPickerModal(this.app, repositories, (repository) => {
			dashboard.githubRepo = repository.fullName;
			void this.plugin.saveSettings();
			this.display();
		}).open();
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
		new Setting(dashboardContainer)
			.setName('GitHub Integration')
			.setDesc('Enable GitHub issue linking for this dashboard')
			.addToggle((toggle) =>
				toggle.setValue(dashboard.githubEnabled).onChange((value) => {
					dashboard.githubEnabled = value;
					void this.plugin.saveSettings();
					this.display();
				})
			);

		if (dashboard.githubEnabled) {
			this.renderRepositoryPicker(dashboardContainer, dashboard);
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
						void this.plugin.saveSettings();
					})
			);

		projectFolderSetting.addButton((btn) =>
			btn.setButtonText('Browse').onClick(() => {
				const platformService = createPlatformService();
				void platformService.pickFolder(dashboard.projectFolder).then((folderPath) => {
					if (folderPath !== undefined) {
						dashboard.projectFolder = folderPath;
						void this.plugin.saveSettings();
						this.display();
					}
				});
			})
		);

		new Setting(dashboardContainer)
			.setName('Show GitHub Buttons')
			.setDesc('Show GitHub link buttons on each issue')
			.addToggle((toggle) =>
				toggle.setValue(dashboard.showGitHubButtons ?? true).onChange((value) => {
					dashboard.showGitHubButtons = value;
					void this.plugin.saveSettings();
					this.plugin.rerenderDashboardViews();
				})
			);

		new Setting(dashboardContainer)
			.setName('Show Folder Buttons')
			.setDesc('Show folder buttons on each issue and the dashboard header')
			.addToggle((toggle) =>
				toggle.setValue(dashboard.showFolderButtons ?? true).onChange((value) => {
					dashboard.showFolderButtons = value;
					void this.plugin.saveSettings();
					this.plugin.rerenderDashboardViews();
				})
			);

		new Setting(dashboardContainer)
			.setName('Show Terminal Buttons')
			.setDesc('Show terminal buttons on each issue and the dashboard header')
			.addToggle((toggle) =>
				toggle.setValue(dashboard.showTerminalButtons ?? true).onChange((value) => {
					dashboard.showTerminalButtons = value;
					void this.plugin.saveSettings();
					this.plugin.rerenderDashboardViews();
				})
			);

		new Setting(dashboardContainer)
			.setName('Show VS Code Buttons')
			.setDesc('Show VS Code buttons on each issue and the dashboard header')
			.addToggle((toggle) =>
				toggle.setValue(dashboard.showVSCodeButtons ?? true).onChange((value) => {
					dashboard.showVSCodeButtons = value;
					void this.plugin.saveSettings();
					this.plugin.rerenderDashboardViews();
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
