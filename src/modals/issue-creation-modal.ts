import { App, Modal, Notice } from 'obsidian';
import type { Component } from 'svelte';
import { mount, unmount } from 'svelte';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, Priority } from '../types';
import IssueCreationWizard from '../components/modals/IssueCreationWizard.svelte';
import PrioritySelector from '../components/modals/PrioritySelector.svelte';
import ManualGitHubLinkContent from '../components/modals/ManualGitHubLinkContent.svelte';
import { GitHubSearchModal } from './GitHubSearchModal';
import { SvelteModal } from './SvelteModal';
import type {
	GitHubSelectionContext,
	IssueCreateRequest,
	IssueCreationMode,
	QuickCreateDefaults,
	WorktreeCreationContext
} from './issue-creation-types';
import {
	createIssueWithGitHub,
	getIssueLinkedRepositoryFromLinks,
	getPrefilledIssueName
} from './issue-creation-helpers';
import type { AssignedIssueCreationOptions } from './issue-creation-helpers';

export type { AssignedIssueCreationOptions } from './issue-creation-helpers';

export {
	createIssueWithGitHub,
	createIssueWithRepoLink,
	createIssueWithNotice,
	getPrefilledIssueName
} from './issue-creation-helpers';

interface IssueCreationModalOptions {
	mode?: IssueCreationMode;
	worktreeOriginFolder?: string;
	sourceIssueLinkedRepository?: string;
	initialIssueName?: string;
	githubSelection?: GitHubSelectionContext;
	worktreeContext?: WorktreeCreationContext;
	quickCreateDefaults?: QuickCreateDefaults;
}

class IssueCreationModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private options: Required<Pick<IssueCreationModalOptions, 'mode' | 'githubSelection'>> &
		Omit<IssueCreationModalOptions, 'mode' | 'githubSelection'>;
	private svelteComponent: ReturnType<typeof mount> | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		options: IssueCreationModalOptions = {}
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.options = {
			...options,
			mode: options.mode ?? 'standard',
			githubSelection: options.githubSelection ?? {}
		};
	}

	onOpen() {
		const { modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');

		const canOpenSearch =
			this.options.mode === 'standard' &&
			this.dashboard.githubEnabled &&
			this.plugin.githubService.isAuthenticated();

		this.svelteComponent = mount(IssueCreationWizard, {
			target: this.contentEl,
			props: {
				plugin: this.plugin,
				dashboard: this.dashboard,
				mode: this.options.mode,
				initialIssueName: this.options.initialIssueName ?? '',
				worktreeOriginFolder: this.options.worktreeOriginFolder,
				sourceIssueLinkedRepository: this.options.sourceIssueLinkedRepository,
				githubSelection: this.options.githubSelection,
				worktreeContext: this.options.worktreeContext,
				quickCreateDefaults: this.options.quickCreateDefaults,
				canOpenSearch,
				onclose: () => this.close(),
				oncreate: (request: IssueCreateRequest) => {
					this.close();
					void createIssueWithGitHub(
						this.app,
						this.plugin,
						this.dashboard,
						request.name,
						request.priority,
						request.githubLink,
						request.githubMetadata,
						request.color,
						request.mode,
						request.worktreeOriginFolder,
						request.sourceIssueLinkedRepository,
						request.worktreeScriptDirectory
					);
				},
				onsearchopen: (currentName: string) => {
					this.close();
					new GitHubSearchModal(
						this.app,
						this.plugin,
						this.dashboard,
						(url, metadata, searchQuery) => {
							const prefilledName =
								getPrefilledIssueName(metadata) ??
								(searchQuery !== undefined && searchQuery !== ''
									? searchQuery
									: undefined) ??
								(currentName !== '' ? currentName : undefined);
							new IssueCreationModal(this.app, this.plugin, this.dashboard, {
								mode: 'standard',
								worktreeOriginFolder:
									this.options.worktreeContext?.worktreeOriginFolder,
								sourceIssueLinkedRepository:
									this.options.worktreeContext?.sourceIssueLinkedRepository,
								initialIssueName: prefilledName,
								githubSelection: {
									githubLink: url,
									githubMetadata: metadata
								},
								worktreeContext: this.options.worktreeContext
							}).open();
						},
						{
							issueRepository:
								this.options.worktreeContext?.sourceIssueLinkedRepository,
							onCancel: () => {
								new IssueCreationModal(this.app, this.plugin, this.dashboard, {
									mode: 'standard',
									worktreeOriginFolder:
										this.options.worktreeContext?.worktreeOriginFolder,
									sourceIssueLinkedRepository:
										this.options.worktreeContext?.sourceIssueLinkedRepository,
									initialIssueName: currentName !== '' ? currentName : undefined,
									githubSelection: this.options.githubSelection,
									worktreeContext: this.options.worktreeContext
								}).open();
							},
							skipButtonLabel: 'Back',
							selectionLockUntilCleared: true,
							confirmButtonLabel: 'Use selection',
							searchMode: 'issues-only'
						}
					).open();
				}
			}
		});
	}

	onClose() {
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}
}

class PrioritySelectionModal extends SvelteModal {
	private readonly onSelected: (priority: Priority) => void;

	constructor(app: App, onSelected: (priority: Priority) => void) {
		super(app);
		this.onSelected = onSelected;
	}

	protected getComponent(): Component {
		return PrioritySelector as Component;
	}

	protected getProps(): Record<string, unknown> {
		return {
			title: 'Select priority',
			onselect: (priority: Priority) => {
				this.close();
				this.onSelected(priority);
			},
			oncancel: () => this.close()
		};
	}
}

export const openPrioritySelectionModal = (
	app: App,
	onSelected: (priority: Priority) => void
): void => {
	new PrioritySelectionModal(app, onSelected).open();
};

class ManualGitHubLinkFirstModal extends SvelteModal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private worktreeContext: WorktreeCreationContext | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		worktreeContext: WorktreeCreationContext | undefined
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.worktreeContext = worktreeContext;
	}

	protected getComponent(): Component {
		return ManualGitHubLinkContent as Component;
	}

	protected getProps(): Record<string, unknown> {
		return {
			onconfirm: (value: string | undefined) => {
				this.close();
				new IssueCreationModal(this.app, this.plugin, this.dashboard, {
					mode: 'standard',
					worktreeOriginFolder: this.worktreeContext?.worktreeOriginFolder,
					sourceIssueLinkedRepository: this.worktreeContext?.sourceIssueLinkedRepository,
					githubSelection: { githubLink: value },
					worktreeContext: this.worktreeContext
				}).open();
			},
			oncancel: () => this.close()
		};
	}
}

export const openAssignedIssueNamePrompt = (
	app: App,
	plugin: TasksDashboardPlugin,
	options: AssignedIssueCreationOptions
): void => {
	const prefilledName = getPrefilledIssueName(options.githubMetadata);
	new IssueCreationModal(app, plugin, options.dashboard, {
		mode: options.quickCreateDefaults?.worktree === true ? 'worktree' : 'standard',
		worktreeOriginFolder: options.quickCreateDefaults?.worktreeOriginFolder,
		initialIssueName: prefilledName,
		githubSelection: {
			githubLink: options.githubUrl,
			githubMetadata: options.githubMetadata
		},
		quickCreateDefaults: options.quickCreateDefaults
	}).open();
};

export const openWorktreeIssueCreationModal = (
	app: App,
	plugin: TasksDashboardPlugin,
	dashboard: DashboardConfig,
	options?: {
		worktreeOriginFolder?: string;
		sourceIssueGitHubLinks?: string[];
		sourceIssueLinkedRepository?: string;
	}
): void => {
	const linkedRepositoryFromLinks = getIssueLinkedRepositoryFromLinks(
		options?.sourceIssueGitHubLinks
	);
	const sourceIssueLinkedRepository =
		options?.sourceIssueLinkedRepository ?? linkedRepositoryFromLinks;
	new IssueCreationModal(app, plugin, dashboard, {
		mode: 'worktree',
		worktreeOriginFolder: options?.worktreeOriginFolder,
		sourceIssueLinkedRepository
	}).open();
};

export const openIssueCreationModal = (
	app: App,
	plugin: TasksDashboardPlugin,
	dashboard: DashboardConfig,
	options?: {
		worktreeContext?: WorktreeCreationContext;
	}
): void => {
	const worktreeContext = options?.worktreeContext;
	if (!dashboard.githubEnabled) {
		new IssueCreationModal(app, plugin, dashboard, {
			mode: 'standard',
			worktreeOriginFolder: worktreeContext?.worktreeOriginFolder,
			sourceIssueLinkedRepository: worktreeContext?.sourceIssueLinkedRepository,
			worktreeContext
		}).open();
		return;
	}

	if (plugin.githubService.isAuthenticated()) {
		new GitHubSearchModal(
			app,
			plugin,
			dashboard,
			(url, metadata, searchQuery) => {
				if (
					url === undefined &&
					metadata === undefined &&
					searchQuery !== undefined &&
					searchQuery !== ''
				) {
					new Notice('No matching GitHub issue — creating standalone.');
				}
				const prefilledName =
					getPrefilledIssueName(metadata) ??
					(searchQuery !== undefined && searchQuery !== '' ? searchQuery : undefined);
				new IssueCreationModal(app, plugin, dashboard, {
					mode: 'standard',
					worktreeOriginFolder: worktreeContext?.worktreeOriginFolder,
					sourceIssueLinkedRepository: worktreeContext?.sourceIssueLinkedRepository,
					initialIssueName: prefilledName,
					githubSelection: {
						githubLink: url,
						githubMetadata: metadata
					},
					worktreeContext
				}).open();
			},
			{
				issueRepository: worktreeContext?.sourceIssueLinkedRepository,
				skipButtonLabel: 'Skip',
				selectionLockUntilCleared: false,
				confirmButtonLabel: 'Next',
				searchMode: 'issues-only',
				enterSkipsWithoutSelection: true,
				separateSkipAndCancelButtons: false,
				enterSkipLabel: 'Skip',
				showSkipButton: false
			}
		).open();
		return;
	}

	new ManualGitHubLinkFirstModal(app, plugin, dashboard, worktreeContext).open();
};
