import { Menu, Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { ArchiveConfirmationModal } from '../modals/archive-confirmation-modal';
import {
	DeleteConfirmationModal,
	type DeleteConfirmationResult
} from '../modals/delete-confirmation-modal';
import { FolderPathModal } from '../modals/FolderPathModal';
import { GitHubLinksModal } from '../modals/github-links-modal';
import { openIssueCreationModal, openPrioritySelectionModal } from '../modals/issue-creation-modal';
import { RenameIssueModal } from '../modals/rename-issue-modal';
import { collectDashboardIssueIdSet } from '../settings/dashboard-cleanup';
import type { DashboardConfig, IssueActionKey } from '../types';
import { getGitHubLinkType } from '../utils/github';
import { parseGitHubRepoFullName } from '../utils/github-url';
import {
	collectUsedIssueColors,
	getThemeAwareIssueColorPalette,
	isIssueColorUsed
} from '../utils/issue-colors';
import type { PlatformService } from '../utils/platform';
import { getOpenableGitHubLinks, openGitHubLinkChooser } from './dashboard-github-link-actions';
import { ISSUE_SURFACE_COLOR_FALLBACK } from './dashboard-renderer-constants';
import { ControlParams, IssueActionDescriptor } from './dashboard-renderer-types';
import { getButtonVisibility } from './header-actions';

const isNonEmptyString = (value: string | undefined): value is string => {
	return value !== undefined && value !== '';
};

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

const COLOR_DROPDOWN_MARGIN = 8;

const positionColorDropdown = (
	dropdown: HTMLElement,
	anchorElement: HTMLElement | undefined
): void => {
	if (anchorElement === undefined) {
		dropdown.setCssProps({
			left: '50%',
			top: '50%',
			transform: 'translate(-50%, -50%)'
		});
		return;
	}

	const anchorRect = anchorElement.getBoundingClientRect();
	const dropdownRect = dropdown.getBoundingClientRect();
	const maxLeft = window.innerWidth - dropdownRect.width - COLOR_DROPDOWN_MARGIN;
	const preferredLeft = anchorRect.right - dropdownRect.width;
	const left = Math.max(COLOR_DROPDOWN_MARGIN, Math.min(preferredLeft, maxLeft));
	const belowTop = anchorRect.bottom + COLOR_DROPDOWN_MARGIN;
	const aboveTop = anchorRect.top - dropdownRect.height - COLOR_DROPDOWN_MARGIN;
	const hasSpaceBelow =
		belowTop + dropdownRect.height <= window.innerHeight - COLOR_DROPDOWN_MARGIN;
	const top = hasSpaceBelow ? belowTop : Math.max(COLOR_DROPDOWN_MARGIN, aboveTop);

	dropdown.setCssProps({
		left: `${left}px`,
		top: `${top}px`,
		transform: 'none'
	});
};

const openIssueColorDropdown = async (options: {
	plugin: TasksDashboardPlugin;
	dashboard: DashboardConfig;
	issueId: string;
	container: HTMLElement;
	anchorElement: HTMLElement | undefined;
	applyIssueSurfaceStyles: (element: HTMLElement, mainColor: string | undefined) => void;
}): Promise<void> => {
	const { plugin, dashboard, issueId, container, anchorElement, applyIssueSurfaceStyles } =
		options;
	const dashboardIssueIds = await collectDashboardIssueIdSet(plugin.app, dashboard);
	const palette = getThemeAwareIssueColorPalette();
	const usedColors = collectUsedIssueColors(plugin.settings.issueColors, dashboardIssueIds);
	const currentColor = plugin.settings.issueColors[issueId] ?? ISSUE_SURFACE_COLOR_FALLBACK;
	const originalColor = plugin.settings.issueColors[issueId];
	let didCommitSelection = false;
	const dropdown = document.createElement('div');
	dropdown.className = 'tdc-issue-color-dropdown';
	dropdown.setAttribute('role', 'dialog');
	dropdown.setAttribute('aria-label', 'Issue color picker');

	const title = dropdown.createDiv({
		cls: 'tdc-issue-color-dropdown-title',
		text: 'Issue color'
	});
	title.setAttribute('aria-hidden', 'true');

	const grid = dropdown.createDiv({ cls: 'tdc-color-preset-row tdc-issue-color-dropdown-grid' });
	dropdown.addClass('tdc-color-preset-row-six-columns');

	const colorPickerRow = dropdown.createDiv({
		cls: 'tdc-color-picker-row tdc-issue-color-dropdown-picker'
	});
	colorPickerRow.createSpan({ cls: 'tdc-color-picker-label', text: 'Color picker' });
	const colorInput = colorPickerRow.createEl('input', {
		type: 'color',
		cls: 'tdc-color-picker-circle',
		attr: {
			'aria-label': 'Color picker'
		}
	});
	colorInput.value = currentColor;

	const closeDropdown = (): void => {
		if (!didCommitSelection) {
			applyIssueSurfaceStyles(container, originalColor);
		}
		document.removeEventListener('mousedown', onDocumentMouseDown, true);
		document.removeEventListener('keydown', onDocumentKeyDown, true);
		window.removeEventListener('resize', onWindowResize);
		dropdown.remove();
	};

	const applyColorSelection = (nextColor: string): void => {
		if (isIssueColorUsed(plugin.settings.issueColors, nextColor, issueId, dashboardIssueIds)) {
			new Notice('Color already assigned. Pick an available color.');
			colorInput.value = plugin.settings.issueColors[issueId] ?? ISSUE_SURFACE_COLOR_FALLBACK;
			return;
		}

		const previousColor = plugin.settings.issueColors[issueId];
		if (previousColor === nextColor) {
			didCommitSelection = true;
			applyIssueSurfaceStyles(container, nextColor);
			closeDropdown();
			return;
		}

		plugin.settings.issueColors[issueId] = nextColor;
		didCommitSelection = true;
		void plugin.saveSettings();
		applyIssueSurfaceStyles(container, nextColor);
		closeDropdown();
	};

	for (const entry of palette) {
		const isUnavailable = usedColors.has(entry.background) && entry.background !== currentColor;
		const preset = grid.createEl('button', {
			cls: 'tdc-color-preset-btn',
			attr: {
				type: 'button',
				'aria-label': `Select color ${entry.background}`,
				'aria-disabled': isUnavailable ? 'true' : 'false'
			}
		});
		preset.style.backgroundColor = entry.background;
		preset.disabled = isUnavailable;
		preset.toggleClass('is-disabled', isUnavailable);
		preset.toggleClass('is-selected', entry.background === currentColor);
		const indicator = preset.createSpan({ cls: 'tdc-color-preset-indicator', text: 'A' });
		indicator.style.color = entry.foreground;
		preset.addEventListener('click', () => {
			if (isUnavailable) {
				return;
			}
			colorInput.value = entry.background;
			applyColorSelection(entry.background);
		});
	}

	colorInput.addEventListener('input', () => {
		applyIssueSurfaceStyles(container, colorInput.value);
	});

	colorInput.addEventListener('change', () => {
		applyColorSelection(colorInput.value);
	});

	const onDocumentMouseDown = (event: MouseEvent): void => {
		const target = event.target;
		if (!(target instanceof Node)) {
			return;
		}
		if (dropdown.contains(target)) {
			return;
		}
		if (anchorElement !== undefined && anchorElement.contains(target)) {
			return;
		}
		closeDropdown();
	};

	const onDocumentKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		closeDropdown();
	};

	const onWindowResize = (): void => {
		positionColorDropdown(dropdown, anchorElement);
	};

	document.body.appendChild(dropdown);
	positionColorDropdown(dropdown, anchorElement);
	document.addEventListener('mousedown', onDocumentMouseDown, true);
	document.addEventListener('keydown', onDocumentKeyDown, true);
	window.addEventListener('resize', onWindowResize);
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
	const issueFolderKey = `${dashboard.id}:${params.issue}`;
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
			const anchorElement = event?.currentTarget;
			void openIssueColorDropdown({
				plugin,
				dashboard,
				issueId: params.issue,
				container,
				anchorElement: anchorElement instanceof HTMLElement ? anchorElement : undefined,
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

			void Promise.all([
				plugin.issueManager.hasAssociatedWorktree(dashboard, params.issue),
				plugin.progressTracker.getProgress(params.path)
			])
				.then(([hasAssociatedWorktree, progress]) => {
					const unfinishedTaskCount = progress.total - progress.done;
					if (!hasAssociatedWorktree && unfinishedTaskCount === 0) {
						void plugin.issueManager.archiveIssue(dashboard, params.issue);
						return;
					}

					const modal = new ArchiveConfirmationModal(
						plugin.app,
						params.name,
						hasAssociatedWorktree,
						unfinishedTaskCount,
						(result) => {
							if (!result.confirmed) {
								return;
							}
							if (result.removeWorktree) {
								void plugin.issueManager.removeWorktree(dashboard, params.issue, {
									skipScriptConfirmation: true
								});
							}
							void plugin.issueManager.archiveIssue(dashboard, params.issue);
						}
					);
					modal.open();
				})
				.catch(() => {
					new Notice(`Could not archive: ${params.issue}`);
				});
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
			void Promise.all([
				plugin.issueManager.hasAssociatedWorktree(dashboard, params.issue),
				plugin.progressTracker.getProgress(params.path)
			])
				.then(([hasAssociatedWorktree, progress]) => {
					const unfinishedTaskCount = progress.total - progress.done;
					const modal = new DeleteConfirmationModal(
						plugin.app,
						params.name,
						hasAssociatedWorktree,
						unfinishedTaskCount,
						hasAssociatedWorktree
							? plugin.settings.deleteIssueRemoveWorktreeByDefault
							: false,
						(checked: boolean) => {
							plugin.settings.deleteIssueRemoveWorktreeByDefault = checked;
							void plugin.saveSettings();
						},
						(result: DeleteConfirmationResult) => {
							if (!result.confirmed) {
								return;
							}
							if (result.removeWorktree) {
								void plugin.issueManager.removeWorktree(dashboard, params.issue, {
									skipScriptConfirmation: true
								});
							}
							void plugin.issueManager.deleteIssue(dashboard, params.issue);
						}
					);
					modal.open();
				})
				.catch(() => {
					new Notice(`Could not delete: ${params.issue}`);
				});
		}
	});

	return descriptors;
};
