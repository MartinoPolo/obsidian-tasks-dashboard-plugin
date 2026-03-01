import { App, Notice, Setting } from 'obsidian';
import { RepositoryPickerModal } from '../modals/RepositoryPickerModal';
import { DashboardConfig, GitHubRepository, TasksDashboardSettings } from '../types';
import {
	GITHUB_AUTH_METHOD_OPTIONS,
	GITHUB_DISPLAY_MODE_OPTIONS,
	GITHUB_TOKEN_CREATION_URL,
	isGitHubAuthMethod,
	isGitHubDisplayMode
} from './settings-options';
import { addDropdownOptions, isNonEmptyString } from './settings-helpers';

interface GitHubRateLimit {
	limit: number;
	remaining: number;
	resetTimestamp: number;
}

interface GitHubValidateResult {
	valid: boolean;
	username?: string;
	error?: string;
}

interface GitHubServiceLike {
	getRateLimit(): GitHubRateLimit | undefined;
	validateToken(): Promise<GitHubValidateResult>;
	setAuth(auth: TasksDashboardSettings['githubAuth']): void;
	isAuthenticated(): boolean;
	getUserRepositories(): Promise<GitHubRepository[]>;
}

export interface RenderGitHubSettingsOptions {
	app: App;
	containerEl: HTMLElement;
	settings: TasksDashboardSettings;
	githubService: GitHubServiceLike;
	saveSettings: () => void;
	saveSettingsAndRefreshDashboard: () => void;
	display: () => void;
}

export function renderGitHubSettings(options: RenderGitHubSettingsOptions): void {
	const {
		containerEl,
		settings,
		githubService,
		saveSettingsAndRefreshDashboard,
		display
	} = options;
	containerEl.createEl('h3', { text: 'GitHub Integration' });

	const authSetting = new Setting(containerEl)
		.setName('GitHub Authentication')
		.setDesc('Connect to GitHub to enable issue search and metadata display');

	const authStatus = containerEl.createDiv({ cls: 'tdc-github-auth-status' });
	const rateLimitStatus = containerEl.createDiv({ cls: 'tdc-github-rate-limit' });

	const updateRateLimitDisplay = (): void => {
		rateLimitStatus.empty();
		const currentRateLimit = githubService.getRateLimit();
		if (currentRateLimit === undefined) {
			return;
		}

		const resetDate = new Date(currentRateLimit.resetTimestamp * 1000);
		const now = new Date();
		const minutesUntilReset = Math.max(0, Math.ceil((resetDate.getTime() - now.getTime()) / 60000));

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
		if (settings.githubAuth.method === 'pat' && isNonEmptyString(settings.githubAuth.token)) {
			authStatus.createSpan({ cls: 'tdc-auth-checking', text: 'Checking connection...' });
			const result = await githubService.validateToken();
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
					text: result.error !== undefined && result.error !== '' ? result.error : 'Authentication failed'
				});
			}
		} else {
			authStatus.createSpan({ cls: 'tdc-auth-none', text: 'Not connected' });
		}
	};

	authSetting.addDropdown((dropdown) => {
		addDropdownOptions(dropdown, GITHUB_AUTH_METHOD_OPTIONS);

		dropdown.setValue(settings.githubAuth.method).onChange((value) => {
			if (!isGitHubAuthMethod(value)) {
				return;
			}

			settings.githubAuth.method = value;
			if (value === 'none') {
				settings.githubAuth.token = undefined;
				githubService.setAuth({ method: 'none' });
			}

			saveSettingsAndRefreshDashboard();
			display();
		});
	});

	if (settings.githubAuth.method === 'pat') {
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
				.setValue(settings.githubAuth.token ?? '')
				.onChange((value) => {
					settings.githubAuth.token = value;
					githubService.setAuth(settings.githubAuth);
					saveSettingsAndRefreshDashboard();
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

			dropdown.setValue(settings.githubDisplayMode).onChange((value) => {
				if (!isGitHubDisplayMode(value)) {
					return;
				}

				settings.githubDisplayMode = value;
				saveSettingsAndRefreshDashboard();
			});
		});
}

export function renderRepositoryPicker(
	container: HTMLElement,
	dashboard: DashboardConfig,
	dependencies: {
		app: App;
		githubService: GitHubServiceLike;
		saveSettings: () => void;
		display: () => void;
	}
): void {
	const { app, githubService, saveSettings, display } = dependencies;
	const repoSetting = new Setting(container)
		.setName('GitHub Repository')
		.setDesc(
			'Link this dashboard to a specific repository for filtered issue suggestions (owner/repo)'
		);

	const currentRepo = dashboard.githubRepo ?? '';
	const isAuthenticated = githubService.isAuthenticated();

	if (isAuthenticated) {
		if (currentRepo !== '') {
			repoSetting.setDesc(`Currently linked: ${currentRepo}`);
		}

		repoSetting.addButton((button) =>
			button
				.setButtonText(currentRepo !== '' ? 'Change' : 'Select Repository')
				.setCta()
				.onClick(() => {
					void openRepositoryPicker({ app, dashboard, githubService, saveSettings, display });
				})
		);

		if (currentRepo !== '') {
			repoSetting.addButton((button) =>
				button.setButtonText('Clear').onClick(() => {
					dashboard.githubRepo = undefined;
					saveSettings();
					display();
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
					saveSettings();
				})
		);
	}
}

async function openRepositoryPicker(options: {
	app: App;
	dashboard: DashboardConfig;
	githubService: GitHubServiceLike;
	saveSettings: () => void;
	display: () => void;
}): Promise<void> {
	const { app, dashboard, githubService, saveSettings, display } = options;
	const repositories = await githubService.getUserRepositories();

	if (repositories.length === 0) {
		new Notice('No repositories found. Check your GitHub token permissions.');
		return;
	}

	new RepositoryPickerModal(app, repositories, (repository) => {
		dashboard.githubRepo = repository.fullName;
		saveSettings();
		display();
	}).open();
}
