import { Menu, Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DeleteConfirmationModal } from '../modals/delete-confirmation-modal';
import { FolderPathModal } from '../modals/FolderPathModal';
import { GitHubLinksModal } from '../modals/github-links-modal';
import { GitHubSearchModal } from '../modals/GitHubSearchModal';
import { RenameIssueModal } from '../modals/rename-issue-modal';
import type { DashboardConfig, IssueActionKey } from '../types';
import type { PlatformService } from '../utils/platform';
import { getButtonVisibility } from './header-actions';
import { ISSUE_SURFACE_COLOR_FALLBACK } from './dashboard-renderer-constants';
import { ControlParams, IssueActionDescriptor } from './dashboard-renderer-types';

const isNonEmptyString = (value: string | undefined): value is string => {
	return value !== undefined && value !== '';
};

const isGitHubUrl = (url: string): boolean => {
	return /^https?:\/\/github\.com\//.test(url);
};

const openFirstGitHubLink = (links: string[]): boolean => {
	const firstLink = links[0];
	if (!isGitHubUrl(firstLink)) {
		return false;
	}

	window.open(firstLink, '_blank');
	return true;
};

const openMoveContextMenu = (
	plugin: TasksDashboardPlugin,
	event: MouseEvent,
	dashboard: DashboardConfig,
	issueId: string,
	direction: 'up' | 'down'
): void => {
	const menu = new Menu();
	if (direction === 'up') {
		menu.addItem((item) => {
			item.setTitle('Move up')
				.setIcon('arrow-up')
				.onClick(() => {
					void plugin.dashboardWriter.moveIssue(dashboard, issueId, 'up');
				});
		});
		menu.addItem((item) => {
			item.setTitle('Move to top')
				.setIcon('chevrons-up')
				.onClick(() => {
					void plugin.dashboardWriter.moveIssueToPosition(dashboard, issueId, 'top');
				});
		});
	} else {
		menu.addItem((item) => {
			item.setTitle('Move down')
				.setIcon('arrow-down')
				.onClick(() => {
					void plugin.dashboardWriter.moveIssue(dashboard, issueId, 'down');
				});
		});
		menu.addItem((item) => {
			item.setTitle('Move to bottom')
				.setIcon('chevrons-down')
				.onClick(() => {
					void plugin.dashboardWriter.moveIssueToPosition(dashboard, issueId, 'bottom');
				});
		});
	}

	menu.showAtPosition({ x: event.clientX, y: event.clientY });
};

export const buildIssueActionDescriptors = (options: {
	plugin: TasksDashboardPlugin;
	container: HTMLElement;
	params: ControlParams;
	dashboard: DashboardConfig;
	platformService: PlatformService;
	applyIssueSurfaceStyles: (element: HTMLElement, mainColor: string | undefined) => void;
}): Map<IssueActionKey, IssueActionDescriptor> => {
	const { plugin, container, params, dashboard, platformService, applyIssueSurfaceStyles } = options;
	const issueFolderKey = `${dashboard.id}:${params.issue}`;
	const issueFolder = plugin.settings.issueFolders[issueFolderKey];
	const hasIssueFolder = isNonEmptyString(issueFolder);
	const visibility = getButtonVisibility(dashboard);
	const isArchived = /\/Issues\/Archive(\/|$)/i.test(params.path);

	const openIssueFolderModal = (): void => {
		new FolderPathModal(plugin.app, plugin, dashboard, params.issue).open();
	};

	const descriptors = new Map<IssueActionKey, IssueActionDescriptor>();

	descriptors.set('folder', {
		key: 'folder',
		label: hasIssueFolder ? 'Open issue folder' : 'Set issue folder',
		iconKey: 'folder',
		cssClass: 'tdc-btn-folder',
		shouldRender: visibility.folder,
		faded: !hasIssueFolder,
		onClick: () => {
			if (isNonEmptyString(issueFolder)) {
				platformService.openInFileExplorer(issueFolder);
				return;
			}
			openIssueFolderModal();
		},
		onContextMenu: hasIssueFolder
			? () => {
					openIssueFolderModal();
				}
			: undefined
	});

	descriptors.set('terminal', {
		key: 'terminal',
		label: hasIssueFolder ? 'Open terminal' : 'Set issue folder',
		iconKey: 'terminal',
		cssClass: 'tdc-btn-terminal',
		shouldRender: visibility.terminal && (hasIssueFolder || !visibility.folder),
		faded: !hasIssueFolder,
		onClick: () => {
			if (isNonEmptyString(issueFolder)) {
				const issueColor = plugin.settings.issueColors[params.issue];
				platformService.openTerminal(issueFolder, issueColor);
				return;
			}
			openIssueFolderModal();
		},
		onContextMenu: () => {
			openIssueFolderModal();
		}
	});

	descriptors.set('vscode', {
		key: 'vscode',
		label: hasIssueFolder ? 'Open in VS Code' : 'Set issue folder',
		iconKey: 'vscode',
		cssClass: 'tdc-btn-vscode',
		shouldRender: visibility.vscode && (hasIssueFolder || !visibility.folder),
		faded: !hasIssueFolder,
		onClick: () => {
			if (isNonEmptyString(issueFolder)) {
				platformService.openVSCode(issueFolder);
				return;
			}
			openIssueFolderModal();
		},
		onContextMenu: () => {
			openIssueFolderModal();
		}
	});

	descriptors.set('github', {
		key: 'github',
		label: params.githubLinks.length > 0 ? 'Open GitHub link' : 'Add GitHub link',
		iconKey: 'github',
		cssClass: 'tdc-btn-github-quickopen',
		shouldRender: visibility.github,
		faded: params.githubLinks.length === 0,
		onClick: () => {
			const hasLinks = params.githubLinks.length > 0;
			if (hasLinks) {
				openFirstGitHubLink(params.githubLinks);
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
				void plugin.issueManager.addGitHubLink(dashboard, params.issue, url, metadata);
			}).open();
		},
		onContextMenu:
			params.githubLinks.length > 0
				? () => {
						new GitHubLinksModal(
							plugin,
							dashboard,
							params.issue,
							params.githubLinks
						).open();
					}
				: undefined
	});

	descriptors.set('move-up', {
		key: 'move-up',
		label: 'Move up',
		iconKey: 'up',
		cssClass: 'tdc-btn-move',
		shouldRender: true,
		faded: false,
		onClick: () => {
			void plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'up');
		},
		onContextMenu: (event) => {
			openMoveContextMenu(plugin, event, dashboard, params.issue, 'up');
		}
	});

	descriptors.set('move-down', {
		key: 'move-down',
		label: 'Move down',
		iconKey: 'down',
		cssClass: 'tdc-btn-move',
		shouldRender: true,
		faded: false,
		onClick: () => {
			void plugin.dashboardWriter.moveIssue(dashboard, params.issue, 'down');
		},
		onContextMenu: (event) => {
			openMoveContextMenu(plugin, event, dashboard, params.issue, 'down');
		}
	});

	descriptors.set('move-top', {
		key: 'move-top',
		label: 'Move to top',
		iconKey: 'toTop',
		cssClass: 'tdc-btn-move',
		shouldRender: true,
		faded: false,
		onClick: () => {
			void plugin.dashboardWriter.moveIssueToPosition(dashboard, params.issue, 'top');
		}
	});

	descriptors.set('move-bottom', {
		key: 'move-bottom',
		label: 'Move to bottom',
		iconKey: 'toBottom',
		cssClass: 'tdc-btn-move',
		shouldRender: true,
		faded: false,
		onClick: () => {
			void plugin.dashboardWriter.moveIssueToPosition(dashboard, params.issue, 'bottom');
		}
	});

	descriptors.set('rename', {
		key: 'rename',
		label: 'Rename',
		iconKey: 'rename',
		cssClass: 'tdc-btn-rename',
		shouldRender: true,
		faded: false,
		onClick: () => {
			new RenameIssueModal(plugin.app, plugin, dashboard, params.issue, params.name).open();
		}
	});

	descriptors.set('color', {
		key: 'color',
		label: 'Header color',
		iconKey: 'palette',
		cssClass: 'tdc-btn-color',
		shouldRender: true,
		faded: false,
		onClick: () => {
			const colorInput = document.createElement('input');
			colorInput.type = 'color';
			colorInput.style.position = 'absolute';
			colorInput.style.opacity = '0';
			colorInput.style.pointerEvents = 'none';
			colorInput.value =
				plugin.settings.issueColors[params.issue] ?? ISSUE_SURFACE_COLOR_FALLBACK;
			document.body.appendChild(colorInput);

			const removeInput = (): void => {
				colorInput.remove();
			};

			colorInput.addEventListener('input', () => {
				applyIssueSurfaceStyles(container, colorInput.value);
			});
			colorInput.addEventListener(
				'change',
				() => {
					plugin.settings.issueColors[params.issue] = colorInput.value;
					void plugin.saveSettings();
					applyIssueSurfaceStyles(container, colorInput.value);
					removeInput();
				},
				{ once: true }
			);
			colorInput.addEventListener('blur', removeInput, { once: true });
			colorInput.click();
		}
	});

	descriptors.set('archive', {
		key: 'archive',
		label: isArchived ? 'Unarchive' : 'Archive',
		iconKey: isArchived ? 'unarchive' : 'archive',
		cssClass: 'tdc-btn-archive',
		shouldRender: true,
		faded: false,
		onClick: () => {
			if (isArchived) {
				void plugin.issueManager.unarchiveIssue(dashboard, params.issue);
			} else {
				void plugin.issueManager.archiveIssue(dashboard, params.issue);
			}
		}
	});

	descriptors.set('delete', {
		key: 'delete',
		label: 'Delete',
		iconKey: 'trash',
		cssClass: 'tdc-btn-delete',
		shouldRender: true,
		faded: false,
		onClick: () => {
			const modal = new DeleteConfirmationModal(plugin.app, params.name, () => {
				void plugin.issueManager.deleteIssue(dashboard, params.issue);
			});
			modal.open();
		}
	});

	return descriptors;
};
