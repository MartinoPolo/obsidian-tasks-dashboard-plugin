import { Notice } from 'obsidian';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import { GitHubSearchModal } from '../modals/GitHubSearchModal';
import { GitHubLinksModal } from '../modals/github-links-modal';
import { FolderPathModal } from '../modals/FolderPathModal';
import { createPlatformService, type PlatformService } from '../utils/platform';

export const ICONS = {
	trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
	archive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>`,
	up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>`,
	down: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>`,
	sort: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>`,
	plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
	chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`,
	foldAll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-6"/><path d="M12 8V2"/><path d="M4 12H2"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M22 12h-2"/><path d="m15 19-3-3-3 3"/><path d="m15 5-3 3-3-3"/></svg>`,
	unfoldAll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-6"/><path d="M12 8V2"/><path d="M4 12H2"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M22 12h-2"/><path d="m15 16-3 3-3-3"/><path d="m15 8-3-3-3 3"/></svg>`,
	unarchive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9"/><path d="M3 5h18"/><path d="M10 12l2-2 2 2"/><path d="M12 10v6"/></svg>`,
	toTop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V7"/><path d="M5 12l7-7 7 7"/><line x1="5" y1="3" x2="19" y2="3"/></svg>`,
	toBottom: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v12"/><path d="M19 12l-7 7-7-7"/><line x1="5" y1="21" x2="19" y2="21"/></svg>`,
	rename: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>`,
	palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z"/></svg>`,
	github: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`,
	folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
	terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
	vscode: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/></svg>`
};

interface ButtonVisibility {
	folder: boolean;
	terminal: boolean;
	vscode: boolean;
	github: boolean;
}

export function getButtonVisibility(dashboard: DashboardConfig): ButtonVisibility {
	const showFolder = dashboard.showFolderButtons ?? true;
	return {
		folder: showFolder,
		terminal: (dashboard.showTerminalButtons ?? true),
		vscode: (dashboard.showVSCodeButtons ?? true),
		github: (dashboard.showGitHubButtons ?? true) && dashboard.githubEnabled
	};
}

interface ActionButtonConfig {
	container: HTMLElement;
	iconKey: keyof typeof ICONS;
	cssClass: string;
	ariaLabel: string;
	faded: boolean;
	onClick: (event: MouseEvent) => void;
	onContextMenu?: (event: MouseEvent) => void;
	labelText?: string;
}

export function createActionButton(config: ActionButtonConfig): HTMLElement {
	const button = config.container.createEl('button', {
		cls: `tdc-btn ${config.cssClass}${config.faded ? ' tdc-btn-faded' : ''}`,
		attr: { 'aria-label': config.ariaLabel }
	});
	button.innerHTML = config.labelText !== undefined
		? ICONS[config.iconKey] + ' ' + config.labelText
		: ICONS[config.iconKey];
	button.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		config.onClick(event);
	});
	if (config.onContextMenu !== undefined) {
		button.addEventListener('contextmenu', (event) => {
			event.preventDefault();
			event.stopPropagation();
			config.onContextMenu!(event);
		});
	}
	return button;
}

// Shared platform service instance — avoids creating one per render
let sharedPlatformService: PlatformService | undefined;

function getPlatformService(): PlatformService {
	if (sharedPlatformService === undefined) {
		sharedPlatformService = createPlatformService();
	}
	return sharedPlatformService;
}

interface IssueActionButtonsParams {
	issueId: string;
	githubLinks: string[];
}

/**
 * Render folder/terminal/vscode/github action buttons for an issue header row.
 */
export function renderIssueActionButtons(
	headerActions: HTMLElement,
	params: IssueActionButtonsParams,
	dashboard: DashboardConfig,
	plugin: TasksDashboardPlugin
): void {
	const visibility = getButtonVisibility(dashboard);
	const platformService = getPlatformService();
	const issueFolderKey = dashboard.id + ':' + params.issueId;
	const issueFolder = plugin.settings.issueFolders[issueFolderKey];
	const hasIssueFolder = issueFolder !== undefined && issueFolder !== '';

	if (visibility.folder) {
		createActionButton({
			container: headerActions,
			iconKey: 'folder',
			cssClass: 'tdc-btn-folder',
			ariaLabel: hasIssueFolder ? 'Open issue folder' : 'Set issue folder',
			faded: !hasIssueFolder,
			onClick: () => {
				if (hasIssueFolder) {
					platformService.openInFileExplorer(issueFolder);
				} else {
					new FolderPathModal(plugin.app, plugin, dashboard, params.issueId).open();
				}
			},
			onContextMenu: () => {
				if (hasIssueFolder) {
					new FolderPathModal(plugin.app, plugin, dashboard, params.issueId).open();
				}
			}
		});
	}

	if (visibility.terminal && (hasIssueFolder || !visibility.folder)) {
		createActionButton({
			container: headerActions,
			iconKey: 'terminal',
			cssClass: 'tdc-btn-terminal',
			ariaLabel: hasIssueFolder ? 'Open terminal' : 'Set issue folder',
			faded: !hasIssueFolder,
			onClick: () => {
				if (hasIssueFolder) {
					const issueColor = plugin.settings.issueColors[params.issueId];
					platformService.openTerminal(issueFolder, issueColor);
				} else {
					new FolderPathModal(plugin.app, plugin, dashboard, params.issueId).open();
				}
			},
			onContextMenu: () => {
				new FolderPathModal(plugin.app, plugin, dashboard, params.issueId).open();
			}
		});
	}

	if (visibility.vscode && (hasIssueFolder || !visibility.folder)) {
		createActionButton({
			container: headerActions,
			iconKey: 'vscode',
			cssClass: 'tdc-btn-vscode',
			ariaLabel: hasIssueFolder ? 'Open in VS Code' : 'Set issue folder',
			faded: !hasIssueFolder,
			onClick: () => {
				if (hasIssueFolder) {
					platformService.openVSCode(issueFolder);
				} else {
					new FolderPathModal(plugin.app, plugin, dashboard, params.issueId).open();
				}
			},
			onContextMenu: () => {
				new FolderPathModal(plugin.app, plugin, dashboard, params.issueId).open();
			}
		});
	}

	if (visibility.github) {
		const hasGithubLinks = params.githubLinks.length > 0;
		createActionButton({
			container: headerActions,
			iconKey: 'github',
			cssClass: 'tdc-btn-github-quickopen',
			ariaLabel: hasGithubLinks ? 'Open GitHub link' : 'Add GitHub link',
			faded: !hasGithubLinks,
			onClick: () => {
				if (hasGithubLinks) {
					const targetUrl = params.githubLinks[0];
					if (/^https?:\/\/github\.com\//.test(targetUrl)) {
						window.open(targetUrl, '_blank');
					}
					return;
				}
				if (!plugin.githubService.isAuthenticated()) {
					new Notice('Configure GitHub token in settings to search for issues.');
					return;
				}
				new GitHubSearchModal(plugin.app, plugin, dashboard, (url, metadata) => {
					if (url === undefined) {
						return;
					}
					void plugin.issueManager.addGitHubLink(dashboard, params.issueId, url, metadata);
				}).open();
			},
			onContextMenu: () => {
				if (hasGithubLinks) {
					new GitHubLinksModal(
						plugin,
						dashboard,
						params.issueId,
						params.githubLinks
					).open();
				}
			}
		});
	}
}

/**
 * Render folder/terminal/vscode/github action buttons for the global sort controls bar.
 */
export function renderGlobalActionButtons(
	container: HTMLElement,
	dashboard: DashboardConfig,
	plugin: TasksDashboardPlugin
): void {
	const visibility = getButtonVisibility(dashboard);
	const platformService = getPlatformService();
	const hasProjectFolder = dashboard.projectFolder !== undefined && dashboard.projectFolder !== '';

	if (visibility.folder) {
		createActionButton({
			container,
			iconKey: 'folder',
			cssClass: 'tdc-btn-action tdc-btn-action-secondary tdc-btn-folder',
			ariaLabel: hasProjectFolder ? 'Open project folder' : 'Set project folder',
			faded: !hasProjectFolder,
			labelText: 'Open Folder',
			onClick: () => {
				if (hasProjectFolder) {
					platformService.openInFileExplorer(dashboard.projectFolder!);
				} else {
					new FolderPathModal(plugin.app, plugin, dashboard).open();
				}
			},
			onContextMenu: () => {
				if (hasProjectFolder) {
					new FolderPathModal(plugin.app, plugin, dashboard).open();
				}
			}
		});
	}

	if (visibility.terminal && (hasProjectFolder || !visibility.folder)) {
		createActionButton({
			container,
			iconKey: 'terminal',
			cssClass: 'tdc-btn-action tdc-btn-action-secondary tdc-btn-terminal',
			ariaLabel: hasProjectFolder ? 'Open terminal' : 'Set project folder',
			faded: !hasProjectFolder,
			labelText: 'Terminal',
			onClick: () => {
				if (hasProjectFolder) {
					platformService.openTerminal(dashboard.projectFolder!);
				} else {
					new FolderPathModal(plugin.app, plugin, dashboard).open();
				}
			},
			onContextMenu: () => {
				new FolderPathModal(plugin.app, plugin, dashboard).open();
			}
		});
	}

	if (visibility.vscode && (hasProjectFolder || !visibility.folder)) {
		createActionButton({
			container,
			iconKey: 'vscode',
			cssClass: 'tdc-btn-action tdc-btn-action-secondary tdc-btn-vscode',
			ariaLabel: hasProjectFolder ? 'Open in VS Code' : 'Set project folder',
			faded: !hasProjectFolder,
			labelText: 'VS Code',
			onClick: () => {
				if (hasProjectFolder) {
					platformService.openVSCode(dashboard.projectFolder!);
				} else {
					new FolderPathModal(plugin.app, plugin, dashboard).open();
				}
			},
			onContextMenu: () => {
				new FolderPathModal(plugin.app, plugin, dashboard).open();
			}
		});
	}

	if (visibility.github) {
		const hasGithubRepo = dashboard.githubRepo !== undefined && dashboard.githubRepo !== '';
		createActionButton({
			container,
			iconKey: 'github',
			cssClass: 'tdc-btn-action tdc-btn-action-secondary tdc-btn-github-quickopen',
			ariaLabel: hasGithubRepo ? 'Open GitHub repo' : 'Configure GitHub repo in settings',
			faded: !hasGithubRepo,
			labelText: 'GitHub',
			onClick: () => {
				if (hasGithubRepo) {
					window.open(`https://github.com/${dashboard.githubRepo}`, '_blank');
				} else {
					new Notice('Configure GitHub repository in dashboard settings.');
				}
			}
		});
	}
}
