import { App, Modal, Notice, SuggestModal, TFile, MarkdownView } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, Priority, GitHubIssueMetadata, GitHubRepository } from '../types';
import { GitHubSearchModal } from './GitHubSearchModal';
import { RepositoryPickerModal } from './RepositoryPickerModal';
import {
	setupPromptModal,
	createConfirmCancelButtons,
	createInputWithEnterHandler,
	focusFirstSuggestModalItem
} from './modal-helpers';

interface CreateIssueRequest {
	name: string;
	priority: Priority;
	dashboard: DashboardConfig;
	githubLink?: string;
	githubMetadata?: GitHubIssueMetadata;
}

const PRIORITY_OPTIONS: Priority[] = ['low', 'medium', 'high', 'top'];

const GITHUB_LINK_TYPE_OPTIONS: GitHubLinkTypeOption[] = [
	{
		type: 'issue-pr',
		label: 'Link Issue/PR',
		description: 'Search and link a GitHub issue or pull request'
	},
	{
		type: 'repository',
		label: 'Link Repository',
		description: 'Link a GitHub repository to this issue'
	},
	{
		type: 'skip',
		label: 'Skip',
		description: 'Create issue without a GitHub link'
	}
];

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message !== '') {
		return error.message;
	}

	return 'Unknown error';
}

async function createIssueWithNotice(
	app: App,
	plugin: TasksDashboardPlugin,
	request: CreateIssueRequest
): Promise<void> {
	try {
		const issue = await plugin.issueManager.createIssue(request);
		new Notice(`Created issue: ${request.name}`);
		await openFileAndFocusEnd(app, issue.filePath);
	} catch (error) {
		new Notice(`Error creating issue: ${getErrorMessage(error)}`);
	}
}

function formatPriorityLabel(priority: Priority): string {
	return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export class NamePromptModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private input: HTMLInputElement | undefined;

	constructor(app: App, plugin: TasksDashboardPlugin, dashboard: DashboardConfig) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
	}

	onOpen() {
		setupPromptModal(this, 'Issue Name');
		this.input = createInputWithEnterHandler(this.contentEl, 'Enter issue name...', () =>
			this.confirm()
		);
		createConfirmCancelButtons(
			this.contentEl,
			'Confirm',
			() => this.confirm(),
			() => this.close()
		);
	}

	private confirm() {
		if (this.input === undefined) {
			return;
		}

		const value = this.input.value.trim();
		if (value !== '') {
			this.close();
			new PriorityPromptModal(this.app, this.plugin, this.dashboard, value).open();
		} else {
			this.input.addClass('tdc-input-error');
			this.input.focus();
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}

class PriorityPromptModal extends SuggestModal<Priority> {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueName: string;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueName: string
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueName = issueName;
		this.setPlaceholder('Select priority');
	}

	onOpen() {
		// SuggestModal.onOpen may return a promise
		void Promise.resolve(super.onOpen());
		focusFirstSuggestModalItem(this.inputEl);
	}

	getSuggestions(): Priority[] {
		return PRIORITY_OPTIONS;
	}

	renderSuggestion(priority: Priority, el: HTMLElement) {
		const container = el.createDiv({ cls: 'tdc-priority-suggestion' });
		container.createSpan({ cls: `tdc-priority-dot priority-${priority}` });
		container.createSpan({ text: formatPriorityLabel(priority) });
	}

	onChooseSuggestion(priority: Priority) {
		if (!this.dashboard.githubEnabled) {
			void createIssueWithGitHub(
				this.app,
				this.plugin,
				this.dashboard,
				this.issueName,
				priority
			);
			return;
		}
		if (this.plugin.githubService.isAuthenticated()) {
			new GitHubLinkTypeModal(
				this.app,
				this.plugin,
				this.dashboard,
				this.issueName,
				priority
			).open();
		} else {
			new GithubPromptModal(
				this.app,
				this.plugin,
				this.dashboard,
				this.issueName,
				priority
			).open();
		}
	}
}

type GitHubLinkType = 'issue-pr' | 'repository' | 'skip';

interface GitHubLinkTypeOption {
	type: GitHubLinkType;
	label: string;
	description: string;
}

class GitHubLinkTypeModal extends SuggestModal<GitHubLinkTypeOption> {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueName: string;
	private priority: Priority;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueName: string,
		priority: Priority
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueName = issueName;
		this.priority = priority;
		this.setPlaceholder('Choose GitHub link type...');
	}

	getSuggestions(): GitHubLinkTypeOption[] {
		return GITHUB_LINK_TYPE_OPTIONS;
	}

	renderSuggestion(option: GitHubLinkTypeOption, el: HTMLElement) {
		const container = el.createDiv({ cls: 'tdc-link-type-suggestion' });
		container.createDiv({ cls: 'tdc-link-type-label', text: option.label });
		container.createDiv({ cls: 'tdc-link-type-description', text: option.description });
	}

	onChooseSuggestion(option: GitHubLinkTypeOption) {
		switch (option.type) {
			case 'skip': {
				void createIssueWithGitHub(
					this.app,
					this.plugin,
					this.dashboard,
					this.issueName,
					this.priority
				);
				return;
			}
			case 'issue-pr': {
				new GitHubSearchModal(this.app, this.plugin, this.dashboard, (url, metadata) => {
					void createIssueWithGitHub(
						this.app,
						this.plugin,
						this.dashboard,
						this.issueName,
						this.priority,
						url,
						metadata
					);
				}).open();
				return;
			}
			case 'repository': {
				void this.openRepositoryPicker();
				return;
			}
		}
	}

	private async openRepositoryPicker(): Promise<void> {
		const repositories = await this.plugin.githubService.getUserRepositories();
		if (repositories.length === 0) {
			new Notice('No repositories found. Check your GitHub token.');
			void createIssueWithGitHub(
				this.app,
				this.plugin,
				this.dashboard,
				this.issueName,
				this.priority
			);
			return;
		}

		new RepositoryPickerModal(this.app, repositories, (repository: GitHubRepository) => {
			void createIssueWithRepoLink(
				this.app,
				this.plugin,
				this.dashboard,
				this.issueName,
				this.priority,
				repository
			);
		}).open();
	}
}

async function openFileAndFocusEnd(app: App, filePath: string): Promise<void> {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (file instanceof TFile) {
		const leaf = app.workspace.getLeaf();
		await leaf.openFile(file);
		setTimeout(() => {
			const view = app.workspace.getActiveViewOfType(MarkdownView);
			if (view?.editor) {
				const editor = view.editor;
				const lastLine = editor.lastLine();
				const lastLineLength = editor.getLine(lastLine).length;
				editor.setCursor({ line: lastLine, ch: lastLineLength });
				editor.focus();
			}
		}, 100);
	}
}

export async function createIssueWithRepoLink(
	app: App,
	plugin: TasksDashboardPlugin,
	dashboard: DashboardConfig,
	issueName: string,
	priority: Priority,
	repository: GitHubRepository
): Promise<void> {
	const repoUrl = `https://github.com/${repository.fullName}`;
	await createIssueWithNotice(app, plugin, {
		name: issueName,
		priority,
		githubLink: repoUrl,
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
	githubMetadata?: GitHubIssueMetadata
): Promise<void> {
	await createIssueWithNotice(app, plugin, {
		name: issueName,
		priority,
		githubLink: githubUrl,
		githubMetadata,
		dashboard
	});
}

class GithubPromptModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueName: string;
	private priority: Priority;
	private input: HTMLInputElement | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueName: string,
		priority: Priority
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueName = issueName;
		this.priority = priority;
	}

	onOpen() {
		setupPromptModal(this, 'GitHub Link (optional)');
		this.input = createInputWithEnterHandler(
			this.contentEl,
			'https://github.com/... (or leave empty)',
			() => void this.confirm()
		);
		createConfirmCancelButtons(
			this.contentEl,
			'Create Issue',
			() => void this.confirm(),
			() => this.close()
		);
	}

	private async confirm() {
		if (this.input === undefined) {
			return;
		}

		const value = this.input.value.trim();
		this.close();
		await createIssueWithGitHub(
			this.app,
			this.plugin,
			this.dashboard,
			this.issueName,
			this.priority,
			value !== '' ? value : undefined
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
