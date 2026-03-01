import { App, Notice, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import TasksDashboardPlugin from '../main';
import {
	DashboardConfig,
	ProgressDisplayMode,
	GitHubAuthMethod,
	GitHubDisplayMode,
	getDashboardDisplayName
} from './types';
import { generateId } from './utils/slugify';
import { RepositoryPickerModal } from './modals/RepositoryPickerModal';
import { createPlatformService } from './utils/platform';
import { DashboardDeleteConfirmationModal } from './modals/dashboard-delete-modal';
import { parseDashboard } from './dashboard/DashboardParser';
import { ICONS } from './dashboard/header-actions';

type VisibilityToggleKey =
	| 'showGitHubButtons'
	| 'showFolderButtons'
	| 'showTerminalButtons'
	| 'showVSCodeButtons';

interface OptionDefinition<T extends string> {
	value: T;
	label: string;
}

interface DashboardVisibilityToggleDefinition {
	key: VisibilityToggleKey;
	name: string;
	description: string;
}

interface AppWithSettingsTab extends App {
	setting?: {
		openTabById: (tabId: string) => void;
	};
}

const DEFAULT_DASHBOARD_FILENAME = 'Dashboard.md';
const ISSUES_FOLDER_NAME = 'Issues';
const GITHUB_TOKEN_CREATION_URL =
	'https://github.com/settings/tokens/new?scopes=repo&description=Obsidian%20Tasks%20Dashboard';

const PROGRESS_DISPLAY_OPTIONS: OptionDefinition<ProgressDisplayMode>[] = [
	{ value: 'number', label: 'Number only (1/5)' },
	{ value: 'percentage', label: 'Percentage only (20%)' },
	{ value: 'bar', label: 'Progress bar only' },
	{ value: 'number-percentage', label: 'Number & percentage (1/5 (20%))' },
	{ value: 'all', label: 'All (bar + percentage + number)' }
];

const GITHUB_AUTH_METHOD_OPTIONS: OptionDefinition<GitHubAuthMethod>[] = [
	{ value: 'none', label: 'Not configured' },
	{ value: 'pat', label: 'Personal Access Token' }
];

const GITHUB_DISPLAY_MODE_OPTIONS: OptionDefinition<GitHubDisplayMode>[] = [
	{ value: 'minimal', label: 'Minimal (number and status only)' },
	{ value: 'compact', label: 'Compact (number, title, status, labels)' },
	{ value: 'full', label: 'Full (includes description and assignees)' }
];

const DASHBOARD_VISIBILITY_TOGGLES: DashboardVisibilityToggleDefinition[] = [
	{
		key: 'showGitHubButtons',
		name: 'Show GitHub Buttons',
		description: 'Show GitHub link buttons on each issue'
	},
	{
		key: 'showFolderButtons',
		name: 'Show Folder Buttons',
		description: 'Show folder buttons on each issue and the dashboard header'
	},
	{
		key: 'showTerminalButtons',
		name: 'Show Terminal Buttons',
		description: 'Show terminal buttons on each issue and the dashboard header'
	},
	{
		key: 'showVSCodeButtons',
		name: 'Show VS Code Buttons',
		description: 'Show VS Code buttons on each issue and the dashboard header'
	}
];

function addDropdownOptions<T extends string>(
	dropdown: {
		addOption: (value: string, display: string) => typeof dropdown;
	},
	options: OptionDefinition<T>[]
): void {
	for (const option of options) {
		dropdown.addOption(option.value, option.label);
	}
}

function isOneOf<T extends string>(value: string, options: OptionDefinition<T>[]): value is T {
	for (const option of options) {
		if (option.value === value) {
			return true;
		}
	}

	return false;
}

function isGitHubAuthMethod(value: string): value is GitHubAuthMethod {
	return isOneOf(value, GITHUB_AUTH_METHOD_OPTIONS);
}

function isProgressDisplayMode(value: string): value is ProgressDisplayMode {
	return isOneOf(value, PROGRESS_DISPLAY_OPTIONS);
}

function isGitHubDisplayMode(value: string): value is GitHubDisplayMode {
	return isOneOf(value, GITHUB_DISPLAY_MODE_OPTIONS);
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return 'Unknown error';
}

function isNonEmptyString(value: string | undefined): value is string {
	return value !== undefined && value !== '';
}

function resolveCollapsedDashboardSettingsMap(settings: object): Record<string, boolean> {
	const candidate: unknown = Reflect.get(settings, 'collapsedDashboardSettings');
	if (typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)) {
		return candidate as Record<string, boolean>;
	}

	const emptyMap: Record<string, boolean> = {};
	Reflect.set(settings, 'collapsedDashboardSettings', emptyMap);
	return emptyMap;
}

function withMarkdownExtension(filename: string): string {
	return filename.endsWith('.md') ? filename : `${filename}.md`;
}

function getDashboardFilename(dashboard: DashboardConfig): string {
	return dashboard.dashboardFilename || DEFAULT_DASHBOARD_FILENAME;
}

function buildVaultPath(rootPath: string, filename: string): string {
	if (rootPath === '') {
		return filename;
	}

	return `${rootPath}/${filename}`;
}

function getDashboardPath(dashboard: DashboardConfig): string {
	return buildVaultPath(dashboard.rootPath, getDashboardFilename(dashboard));
}

function getDashboardIssuesFolderPath(dashboard: DashboardConfig): string {
	return buildVaultPath(dashboard.rootPath, ISSUES_FOLDER_NAME);
}

function hasSettingsTabApi(app: unknown): app is AppWithSettingsTab {
	if (typeof app !== 'object' || app === null) {
		return false;
	}

	if (!('setting' in app)) {
		return false;
	}

	const candidateSetting = app.setting;
	if (typeof candidateSetting !== 'object' || candidateSetting === null) {
		return false;
	}

	if (!('openTabById' in candidateSetting)) {
		return false;
	}

	return typeof candidateSetting.openTabById === 'function';
}

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
				isNonEmptyString(this.plugin.settings.githubAuth.token)
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

		authSetting.addDropdown((dropdown) => {
			addDropdownOptions(dropdown, GITHUB_AUTH_METHOD_OPTIONS);

			dropdown.setValue(this.plugin.settings.githubAuth.method).onChange((value) => {
				if (!isGitHubAuthMethod(value)) {
					return;
				}

				this.plugin.settings.githubAuth.method = value;
				if (value === 'none') {
					this.plugin.settings.githubAuth.token = undefined;
					this.plugin.githubService.setAuth({ method: 'none' });
				}

				this.saveSettingsAndRefreshDashboard();
				this.display();
			});
		});

		if (this.plugin.settings.githubAuth.method === 'pat') {
			const tokenSetting = new Setting(containerEl)
				.setName('Personal Access Token')
				.setDesc(
					'Create a token at GitHub → Settings → Developer settings → Personal access tokens'
				);

			tokenSetting.addText((text) => {
				text.inputEl.type = 'password';
				text.inputEl.addClass('tdc-token-input');
				text.setPlaceholder('ghp_xxxxxxxxxxxx')
					.setValue(this.plugin.settings.githubAuth.token ?? '')
					.onChange((value) => {
						this.plugin.settings.githubAuth.token = value;
						this.plugin.githubService.setAuth(this.plugin.settings.githubAuth);
						this.saveSettingsAndRefreshDashboard();
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
						window.open(GITHUB_TOKEN_CREATION_URL, '_blank');
					})
			);
		}

		void updateAuthStatus();

		new Setting(containerEl)
			.setName('GitHub Display Mode')
			.setDesc('How much GitHub issue detail to show on the dashboard')
			.addDropdown((dropdown) => {
				addDropdownOptions(dropdown, GITHUB_DISPLAY_MODE_OPTIONS);

				dropdown.setValue(this.plugin.settings.githubDisplayMode).onChange((value) => {
					if (!isGitHubDisplayMode(value)) {
						return;
					}

					this.plugin.settings.githubDisplayMode = value;
					this.saveSettingsAndRefreshDashboard();
				});
			});
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
						this.saveSettings();
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
						this.saveSettings();
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
			this.saveSettings();
			this.display();
		}).open();
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
				dashboard.rootPath !== ''
					? buildVaultPath(dashboard.rootPath, currentFilename)
					: '';
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
		const issueIds = await this.collectDashboardIssueIds(dashboard);

		for (const issueId of issueIds) {
			delete this.plugin.settings.collapsedIssues[issueId];
			delete this.plugin.settings.issueColors[issueId];
		}

		const issueFolderPrefix = dashboard.id + ':';
		for (const key of Object.keys(this.plugin.settings.issueFolders)) {
			if (key.startsWith(issueFolderPrefix)) {
				delete this.plugin.settings.issueFolders[key];
			}
		}

		const collapsedDashboardSettings = resolveCollapsedDashboardSettingsMap(
			this.plugin.settings
		);
		delete collapsedDashboardSettings[dashboard.id];

		if (deleteFiles) {
			await this.trashDashboardFiles(dashboard);
		}

		this.plugin.settings.dashboards.splice(index, 1);
		await this.plugin.saveSettings();
		this.plugin.registerDashboardCommands();
		this.display();
	}

	private async collectDashboardIssueIds(dashboard: DashboardConfig): Promise<string[]> {
		const dashboardPath = getDashboardPath(dashboard);
		const file = this.app.vault.getAbstractFileByPath(dashboardPath);

		if (!(file instanceof TFile)) {
			return [];
		}

		try {
			const content = await this.app.vault.cachedRead(file);
			const parsed = parseDashboard(content);
			const activeIds = parsed.activeIssues.map((issue) => issue.id);
			const archivedIds = parsed.archivedIssues.map((issue) => issue.id);
			return [...activeIds, ...archivedIds];
		} catch {
			return [];
		}
	}

	private async trashDashboardFiles(dashboard: DashboardConfig): Promise<void> {
		const dashboardPath = getDashboardPath(dashboard);
		const issuesFolderPath = getDashboardIssuesFolderPath(dashboard);

		const dashboardFile = this.app.vault.getAbstractFileByPath(dashboardPath);
		if (dashboardFile instanceof TFile) {
			try {
				await this.app.vault.trash(dashboardFile, true);
			} catch {
				new Notice(`Could not delete dashboard file: ${dashboardPath}`);
			}
		}

		const issuesFolder = this.app.vault.getAbstractFileByPath(issuesFolderPath);
		if (issuesFolder instanceof TFolder) {
			try {
				await this.app.vault.trash(issuesFolder, true);
			} catch {
				new Notice(`Could not delete Issues folder: ${issuesFolderPath}`);
			}
		}
	}
}
