import { App, MarkdownView, Modal, Notice, TFile } from 'obsidian';
import type { Component } from 'svelte';
import { mount, unmount } from 'svelte';
import TasksDashboardPlugin from '../../main';
import { getErrorMessage } from '../settings/settings-helpers';
import { DashboardConfig, GitHubIssueMetadata, GitHubRepository, Priority } from '../types';
import { getGitHubLinkType } from '../utils/github';
import { parseGitHubRepoFullName, parseGitHubUrl } from '../utils/github-url';
import { findIssueColorPaletteIndex } from '../utils/issue-colors';
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

interface CreateIssueRequest {
	name: string;
	priority: Priority;
	dashboard: DashboardConfig;
	color?: string;
	worktree?: boolean;
	worktreeOriginFolder?: string;
	worktreeScriptDirectory?: string;
	worktreeBaseRepository?: string;
	githubLink?: string;
	githubMetadata?: GitHubIssueMetadata;
}

interface IssueCreationModalOptions {
	mode?: IssueCreationMode;
	worktreeOriginFolder?: string;
	sourceIssueLinkedRepository?: string;
	initialIssueName?: string;
	githubSelection?: GitHubSelectionContext;
	worktreeContext?: WorktreeCreationContext;
	quickCreateDefaults?: QuickCreateDefaults;
}

function getIssueLinkedRepositoryFromLinks(githubLinks: string[] | undefined): string | undefined {
	if (githubLinks === undefined || githubLinks.length === 0) {
		return undefined;
	}

	for (const link of githubLinks) {
		if (getGitHubLinkType(link) !== 'repository') {
			continue;
		}

		const repository = parseGitHubRepoFullName(link);
		if (repository !== undefined && repository !== '') {
			return repository;
		}
	}

	for (const link of githubLinks) {
		const parsed = parseGitHubUrl(link);
		if (parsed !== undefined) {
			return `${parsed.owner}/${parsed.repo}`;
		}
	}

	return undefined;
}

async function createIssueWithNotice(
	app: App,
	plugin: TasksDashboardPlugin,
	request: CreateIssueRequest
): Promise<void> {
	try {
		const issue = await plugin.issueManager.createIssue({
			...request,
			worktreeColor: request.color
		});
		if (request.color !== undefined) {
			plugin.settings.issueColors[issue.id] = request.color;
			const paletteIndex = findIssueColorPaletteIndex(request.color);
			if (paletteIndex >= 0) {
				plugin.settings.lastUsedColorIndex = paletteIndex;
			}
			await plugin.saveSettings();
		}
		if (request.worktree === true) {
			void plugin.issueManager.setupWorktree(
				request.dashboard,
				issue.id,
				request.name,
				request.color,
				request.worktreeOriginFolder,
				request.worktreeScriptDirectory
			);
		}
		new Notice(`Created issue: ${request.name}`);
		await openFileAndFocusEnd(app, issue.filePath);
	} catch (error) {
		new Notice(`Error creating issue: ${getErrorMessage(error)}`);
	}
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

async function openFileAndFocusEnd(app: App, filePath: string): Promise<void> {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (file instanceof TFile) {
		const leaf = app.workspace.getLeaf();
		await leaf.openFile(file);
		window.setTimeout(() => {
			const view = app.workspace.getActiveViewOfType(MarkdownView);
			if (view?.editor) {
				const editor = view.editor;
				const lastLine = editor.lastLine();
				const tasksHeadingLine = findTasksHeadingLine(editor, lastLine);

				if (tasksHeadingLine === undefined) {
					const lastLineLength = editor.getLine(lastLine).length;
					editor.setCursor({ line: lastLine, ch: lastLineLength });
					editor.focus();
					return;
				}

				const targetLine = getTasksSectionTargetLine(editor, tasksHeadingLine, lastLine);
				const targetLineLength = editor.getLine(targetLine).length;
				editor.setCursor({ line: targetLine, ch: targetLineLength });
				editor.focus();
			}
		}, 100);
	}
}

function findTasksHeadingLine(
	editor: MarkdownView['editor'],
	lastLine: number
): number | undefined {
	for (let lineIndex = 0; lineIndex <= lastLine; lineIndex += 1) {
		const line = editor.getLine(lineIndex).trim();
		if (line.toLowerCase() === '## tasks') {
			return lineIndex;
		}
	}

	return undefined;
}

function getTasksSectionTargetLine(
	editor: MarkdownView['editor'],
	tasksHeadingLine: number,
	lastLine: number
): number {
	let sectionEndLine = lastLine;

	for (let lineIndex = tasksHeadingLine + 1; lineIndex <= lastLine; lineIndex += 1) {
		const line = editor.getLine(lineIndex).trim();
		if (line.startsWith('## ')) {
			sectionEndLine = lineIndex - 1;
			break;
		}
	}

	while (sectionEndLine > tasksHeadingLine && editor.getLine(sectionEndLine).trim() === '') {
		sectionEndLine -= 1;
	}

	if (sectionEndLine <= tasksHeadingLine) {
		const candidateLine = tasksHeadingLine + 1;
		return candidateLine <= lastLine ? candidateLine : tasksHeadingLine;
	}

	return sectionEndLine;
}

function getPrefilledIssueName(metadata: GitHubIssueMetadata | undefined): string | undefined {
	if (metadata === undefined) {
		return undefined;
	}

	const firstFourWords = metadata.title
		.trim()
		.split(/\s+/)
		.filter((word) => word !== '')
		.slice(0, 4)
		.join(' ');
	return firstFourWords === '' ? `${metadata.number}` : `${metadata.number} ${firstFourWords}`;
}

export interface AssignedIssueCreationOptions {
	dashboard: DashboardConfig;
	githubMetadata: GitHubIssueMetadata;
	githubUrl: string;
	quickCreateDefaults?: QuickCreateDefaults;
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

export async function createIssueWithRepoLink(
	app: App,
	plugin: TasksDashboardPlugin,
	dashboard: DashboardConfig,
	issueName: string,
	priority: Priority,
	repository: GitHubRepository,
	color?: string,
	mode: IssueCreationMode = 'standard',
	worktreeOriginFolder?: string,
	worktreeBaseRepository?: string
): Promise<void> {
	const repoUrl = `https://github.com/${repository.fullName}`;
	await createIssueWithNotice(app, plugin, {
		name: issueName,
		priority,
		githubLink: repoUrl,
		color,
		worktree: mode === 'worktree',
		worktreeOriginFolder,
		worktreeBaseRepository,
		dashboard
	});
}

export async function createIssueWithGitHub(
	app: App,
	plugin: TasksDashboardPlugin,
	dashboard: DashboardConfig,
	issueName: string,
	priority: Priority,
	githubUrl?: string,
	githubMetadata?: GitHubIssueMetadata,
	color?: string,
	mode: IssueCreationMode = 'standard',
	worktreeOriginFolder?: string,
	worktreeBaseRepository?: string,
	worktreeScriptDirectory?: string
): Promise<void> {
	await createIssueWithNotice(app, plugin, {
		name: issueName,
		priority,
		githubLink: githubUrl,
		githubMetadata,
		color,
		worktree: mode === 'worktree',
		worktreeOriginFolder,
		worktreeScriptDirectory,
		worktreeBaseRepository,
		dashboard
	});
}

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
