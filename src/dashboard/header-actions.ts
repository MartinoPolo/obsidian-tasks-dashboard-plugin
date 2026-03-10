import { Notice, setTooltip } from 'obsidian';
import type TasksDashboardPlugin from '../../main';
import { FolderPathModal } from '../modals/FolderPathModal';
import { RepositoryLinkerModal } from '../modals/RepositoryLinkerModal';
import type { DashboardConfig } from '../types';
import { createPlatformService, type PlatformService } from '../utils/platform';
import { getLinkedRepositories } from './dashboard-writer-helpers';

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
	worktree: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-7"/><path d="m8 14 4-8 4 8z"/><path d="m6 14-2.5 4h17L18 14"/></svg>`,
	priority: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h10l-1.5 4L14 12H4z"/><path d="M4 4v16"/></svg>`,
	folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
	terminal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
	vscode: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z"/></svg>`,
	eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
	info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
	eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.76 10.76 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`,
	more: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
	fileInput: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M2 15h10"/><path d="M9 18l3-3-3-3"/></svg>`,
	settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
	refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
	gitBranch: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>`,
	gitPrOpen: `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z"/></svg>`,
	gitPrMerged: `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218Z"/></svg>`,
	gitPrClosed: `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 3.25 1Zm9.5 5.5a.75.75 0 0 1 .75.75v3.378a2.251 2.251 0 1 1-1.5 0V7.25a.75.75 0 0 1 .75-.75Zm-1.72-4.28a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1-1.06 1.06L12 4.31l-.97.97a.75.75 0 1 1-1.06-1.06l2-2Z"/></svg>`,
	gitPrDraft: `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 3.25 1Zm9.5 14a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Zm0-8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 3a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>`,
	gitIssueOpen: `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/></svg>`,
	gitIssueClosed: `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"/><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"/></svg>`,
	gitIssueNotPlanned: `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4.72 3.22a.75.75 0 0 1 1.06 0L8 5.44l2.22-2.22a.75.75 0 1 1 1.06 1.06L9.06 6.5l2.22 2.22a.75.75 0 1 1-1.06 1.06L8 7.56 5.78 9.78a.75.75 0 0 1-1.06-1.06L6.94 6.5 4.72 4.28a.75.75 0 0 1 0-1.06Z"/><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"/></svg>`,
	rebuild: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15L22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"/></svg>`
};

function parseInlineSvg(iconSvg: string): Element | undefined {
	const parser = new DOMParser();
	const documentRoot = parser.parseFromString(iconSvg, 'text/html');
	const svg = documentRoot.querySelector('svg');
	if (svg === null) {
		return undefined;
	}
	return svg.cloneNode(true) as Element;
}

export function appendInlineSvgIcon(target: HTMLElement, iconSvg: string): boolean {
	const svg = parseInlineSvg(iconSvg);
	if (svg === undefined) {
		return false;
	}
	target.appendChild(svg);
	return true;
}

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
		terminal: dashboard.showTerminalButtons ?? true,
		vscode: dashboard.showVSCodeButtons ?? true,
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
		cls: `tdc-btn ${config.cssClass}${config.faded ? ' tdc-btn-faded' : ''}`
	});
	setTooltip(button, config.ariaLabel, { delay: 500 });
	const contextMenuHandler = config.onContextMenu;
	const hasIcon = appendInlineSvgIcon(button, ICONS[config.iconKey]);
	if (config.labelText !== undefined) {
		if (hasIcon) {
			button.appendChild(document.createTextNode(' '));
		}
		button.appendChild(document.createTextNode(config.labelText));
	}
	button.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		config.onClick(event);
	});
	if (contextMenuHandler !== undefined) {
		button.addEventListener('contextmenu', (event) => {
			event.preventDefault();
			event.stopPropagation();
			contextMenuHandler(event);
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

function isNonEmptyString(value: string | undefined): value is string {
	return value !== undefined && value !== '';
}

interface FolderDependentActionButtonConfig {
	container: HTMLElement;
	iconKey: keyof typeof ICONS;
	cssClass: string;
	ariaLabelWithFolder: string;
	ariaLabelWithoutFolder: string;
	folderPath: string | undefined;
	onOpenFolder: (folderPath: string) => void;
	onSelectFolder: () => void;
	openFolderSelectorOnContextMenu: 'always' | 'when-folder-exists';
	labelText?: string;
}

function renderFolderDependentActionButton(config: FolderDependentActionButtonConfig): void {
	const hasFolder = isNonEmptyString(config.folderPath);
	const shouldOpenFolderSelectorOnContextMenu =
		config.openFolderSelectorOnContextMenu === 'always' || hasFolder;

	createActionButton({
		container: config.container,
		iconKey: config.iconKey,
		cssClass: config.cssClass,
		ariaLabel: hasFolder ? config.ariaLabelWithFolder : config.ariaLabelWithoutFolder,
		faded: !hasFolder,
		labelText: config.labelText,
		onClick: () => {
			const folderPath = config.folderPath;
			if (isNonEmptyString(folderPath)) {
				config.onOpenFolder(folderPath);
				return;
			}

			config.onSelectFolder();
		},
		onContextMenu: shouldOpenFolderSelectorOnContextMenu
			? () => {
					config.onSelectFolder();
				}
			: undefined
	});
}

function openRepositoryLinkerModal(plugin: TasksDashboardPlugin, dashboard: DashboardConfig): void {
	new RepositoryLinkerModal(plugin, dashboard, (linkedRepos) => {
		dashboard.githubRepos = linkedRepos;
		void plugin.saveSettings();
		plugin.triggerDashboardRefresh();
		const count = linkedRepos.length;
		if (count === 0) {
			new Notice('Cleared all linked repositories.');
		} else {
			new Notice(`Linked ${count} repositor${count === 1 ? 'y' : 'ies'}.`);
		}
	}).open();
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
	const openProjectFolderModal = () => {
		new FolderPathModal(plugin.app, plugin, dashboard).open();
	};

	if (visibility.folder) {
		renderFolderDependentActionButton({
			container,
			iconKey: 'folder',
			cssClass: 'tdc-btn-action tdc-btn-action-secondary tdc-btn-folder',
			ariaLabelWithFolder: 'Open project folder',
			ariaLabelWithoutFolder: 'Set project folder',
			folderPath: dashboard.projectFolder,
			onOpenFolder: (folderPath) => {
				platformService.openInFileExplorer(folderPath);
			},
			onSelectFolder: openProjectFolderModal,
			openFolderSelectorOnContextMenu: 'always'
		});
	}

	if (visibility.terminal) {
		renderFolderDependentActionButton({
			container,
			iconKey: 'terminal',
			cssClass: 'tdc-btn-action tdc-btn-action-secondary tdc-btn-terminal',
			ariaLabelWithFolder: 'Open terminal',
			ariaLabelWithoutFolder: 'Set project folder',
			folderPath: dashboard.projectFolder,
			onOpenFolder: (folderPath) => {
				platformService.openTerminal(folderPath);
			},
			onSelectFolder: openProjectFolderModal,
			openFolderSelectorOnContextMenu: 'always'
		});
	}

	if (visibility.vscode) {
		renderFolderDependentActionButton({
			container,
			iconKey: 'vscode',
			cssClass: 'tdc-btn-action tdc-btn-action-secondary tdc-btn-vscode',
			ariaLabelWithFolder: 'Open in VS Code',
			ariaLabelWithoutFolder: 'Set project folder',
			folderPath: dashboard.projectFolder,
			onOpenFolder: (folderPath) => {
				platformService.openVSCode(folderPath);
			},
			onSelectFolder: openProjectFolderModal,
			openFolderSelectorOnContextMenu: 'always'
		});
	}

	if (visibility.github) {
		const repos = getLinkedRepositories(dashboard);
		const repoCount = repos.length;
		const hasRepos = repoCount > 0;

		createActionButton({
			container,
			iconKey: 'github',
			cssClass: 'tdc-btn-action tdc-btn-action-secondary tdc-btn-github-quickopen',
			ariaLabel: hasRepos
				? repoCount === 1
					? 'Open GitHub repo'
					: `Open GitHub repos (${repoCount})`
				: 'Link GitHub repository',
			faded: !hasRepos,
			onClick: () => {
				if (repoCount === 0) {
					openRepositoryLinkerModal(plugin, dashboard);
					return;
				}
				if (repoCount === 1) {
					window.open(`https://github.com/${repos[0]}`, '_blank');
					return;
				}
				openGitHubRepoDropdown(container, repos);
			},
			onContextMenu: () => {
				openRepositoryLinkerModal(plugin, dashboard);
			}
		});
	}
}

function openGitHubRepoDropdown(anchorContainer: HTMLElement, repos: string[]): void {
	const existingDropdown = document.querySelector('.tdc-github-repo-dropdown');
	if (existingDropdown !== null) {
		existingDropdown.remove();
		return;
	}

	const dropdown = document.createElement('div');
	dropdown.className = 'tdc-github-repo-dropdown tdc-sort-dropdown-portal';
	document.body.appendChild(dropdown);

	for (const repoName of repos) {
		const item = document.createElement('div');
		item.className = 'tdc-github-repo-dropdown-item tdc-sort-dropdown-item';
		item.textContent = repoName;
		item.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			dropdown.remove();
			window.open(`https://github.com/${repoName}`, '_blank');
		});
		dropdown.appendChild(item);
	}

	const githubButton = anchorContainer.querySelector('.tdc-btn-github-quickopen');
	if (githubButton instanceof HTMLElement) {
		const rect = githubButton.getBoundingClientRect();
		const viewportPadding = 8;
		const dropdownWidth = Math.max(dropdown.offsetWidth, rect.width);
		const maxLeft = window.innerWidth - dropdownWidth - viewportPadding;
		const left = Math.max(viewportPadding, Math.min(rect.left, maxLeft));
		dropdown.style.minWidth = `${rect.width}px`;
		dropdown.style.left = `${left}px`;
		dropdown.style.top = `${rect.bottom + 4}px`;
	}

	const closeDropdown = (event: MouseEvent): void => {
		const target = event.target;
		if (target instanceof Node && dropdown.contains(target)) {
			return;
		}
		dropdown.remove();
		document.removeEventListener('click', closeDropdown, true);
	};

	setTimeout(() => {
		document.addEventListener('click', closeDropdown, true);
	}, 0);
}
