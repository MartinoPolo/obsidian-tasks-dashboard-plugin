import { Menu, Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { FolderPathModal } from '../modals/FolderPathModal';
import { GitHubLinksModal } from '../modals/github-links-modal';
import { openIssueCreationModal, openPrioritySelectionModal } from '../modals/issue-creation-modal';
import { RenameIssueModal } from '../modals/rename-issue-modal';
import type { DashboardConfig, IssueActionKey } from '../types';
import { getGitHubLinkType, isGitHubWebUrl } from '../utils/github';
import { formatGitHubLinkLabel } from '../utils/github-helpers';
import { parseGitHubRepoFullName } from '../utils/github-url';
import { getIssueFolderStorageKey } from '../issues/issue-manager-shared';
import type { PlatformService } from '../utils/platform';
import { isNonEmptyString } from '../utils/string-utils';
import {
	handleArchiveWithConfirmation,
	handleDeleteWithConfirmation
} from './dashboard-issue-action-confirmations';
import { openIssueColorDropdown } from './dashboard-issue-color-dropdown';
import { ControlParams, IssueActionDescriptor } from './dashboard-renderer-types';

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

function getOpenableGitHubLinks(links: string[]): string[] {
	return links.filter((link) => isGitHubWebUrl(link));
}

function openGitHubLinkChooser(event: MouseEvent, links: string[]): void {
	const menu = new Menu();
	for (const link of links) {
		menu.addItem((item) => {
			item.setTitle(formatGitHubLinkLabel(link)).onClick(() => {
				window.open(link, '_blank');
			});
		});
	}
	menu.showAtPosition({ x: event.clientX, y: event.clientY });
}

const getIssueLinkedRepositoryFromLinks = (githubLinks: string[]): string | undefined => {
	for (const link of githubLinks) {
		if (getGitHubLinkType(link) === 'repository') {
			const repository = parseGitHubRepoFullName(link);
			if (repository !== undefined && repository !== '') {
				return repository;
			}
		}

		const issueOrPullRepository = parseGitHubRepoFullName(
			link.replace(/\/(issues|pull|pulls)\/\d+$/i, '')
		);
		if (issueOrPullRepository !== undefined && issueOrPullRepository !== '') {
			return issueOrPullRepository;
		}
	}

	return undefined;
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
	const { plugin, container, params, dashboard, platformService, applyIssueSurfaceStyles } =
		options;
	const issueFolderKey = getIssueFolderStorageKey(dashboard.id, params.issue);
	const issueFolder = plugin.settings.issueFolders[issueFolderKey];
	const hasIssueFolder = isNonEmptyString(issueFolder);
	const hasIssueGitFolder = hasIssueFolder && platformService.isGitRepositoryFolder(issueFolder);
	const worktreeOriginFolder = params.worktree_origin_folder;
	const worktreeBaseRepository = params.worktree_base_repository;
	const issueHasWorktreeMetadata =
		params.worktree === true && isNonEmptyString(worktreeOriginFolder);
	const hasIssueWorktreeScope = hasIssueGitFolder || issueHasWorktreeMetadata;
	const issueLinkedRepositoryFromLinks = getIssueLinkedRepositoryFromLinks(params.githubLinks);
	const sourceIssueLinkedRepository = worktreeBaseRepository ?? issueLinkedRepositoryFromLinks;
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
		shouldRender: visibility.terminal,
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
		shouldRender: visibility.vscode,
		faded: !hasIssueFolder,
		onClick: () => {
			if (isNonEmptyString(issueFolder)) {
				const issueColor = plugin.settings.issueColors[params.issue];
				platformService.openVSCode(issueFolder, issueColor);
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
		label: params.githubLinks.length > 0 ? 'Open or edit GitHub links' : 'Add GitHub link',
		iconKey: 'github',
		cssClass: 'tdc-btn-github-quickopen',
		shouldRender: visibility.github,
		faded: params.githubLinks.length === 0,
		onClick: (event) => {
			const openableLinks = getOpenableGitHubLinks(params.githubLinks);
			if (openableLinks.length === 1) {
				window.open(openableLinks[0], '_blank');
				return;
			}

			if (openableLinks.length > 1) {
				if (event !== undefined) {
					openGitHubLinkChooser(event, openableLinks);
					return;
				}

				new GitHubLinksModal(plugin, dashboard, params.issue, params.githubLinks).open();
				return;
			}

			new GitHubLinksModal(plugin, dashboard, params.issue, params.githubLinks).open();
		},
		onContextMenu: () => {
			new GitHubLinksModal(plugin, dashboard, params.issue, params.githubLinks).open();
		}
	});

	descriptors.set('worktree', {
		key: 'worktree',
		label: hasIssueWorktreeScope
			? 'Add Issue'
			: 'Configure issue folder (git repository) for worktree',
		iconKey: 'plus',
		cssClass: 'tdc-btn-worktree',
		shouldRender: visibility.github,
		faded: !hasIssueWorktreeScope,
		onClick: () => {
			if (!hasIssueWorktreeScope) {
				if (!hasIssueFolder) {
					openIssueFolderModal();
					return;
				}

				new Notice('Issue folder must point to a Git repository to create worktrees.');
				return;
			}

			openIssueCreationModal(plugin.app, plugin, dashboard, {
				worktreeContext: {
					eligible: hasIssueWorktreeScope,
					worktreeOriginFolder: worktreeOriginFolder ?? issueFolder,
					worktreeScriptDirectory: issueHasWorktreeMetadata ? issueFolder : undefined,
					sourceIssueLinkedRepository
				}
			});
		},
		onContextMenu: () => {
			openIssueFolderModal();
		}
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
		label: 'Issue color',
		iconKey: 'palette',
		cssClass: 'tdc-btn-color',
		shouldRender: true,
		faded: false,
		onClick: (event) => {
			const anchor =
				event?.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
			void openIssueColorDropdown({
				plugin,
				dashboard,
				issueId: params.issue,
				container,
				anchorElement: anchor,
				applyIssueSurfaceStyles
			});
		}
	});

	descriptors.set('change-priority', {
		key: 'change-priority',
		label: 'Change priority',
		iconKey: 'priority',
		cssClass: 'tdc-btn-priority',
		shouldRender: true,
		faded: false,
		onClick: () => {
			openPrioritySelectionModal(plugin.app, (priority) => {
				void plugin.issueManager.updateIssuePriority(dashboard, params.issue, priority);
			});
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
				return;
			}

			handleArchiveWithConfirmation({ plugin, dashboard, params });
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
			handleDeleteWithConfirmation({ plugin, dashboard, params });
		}
	});

	return descriptors;
};
