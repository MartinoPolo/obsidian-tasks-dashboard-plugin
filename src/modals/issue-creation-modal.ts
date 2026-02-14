import { App, Modal, Notice, SuggestModal, TFile, MarkdownView } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, Priority, GitHubIssueMetadata, GitHubRepository } from '../types';
import { GitHubSearchModal } from './GitHubSearchModal';
import { RepositoryPickerModal } from './RepositoryPickerModal';
import {
	setupPromptModal,
	createConfirmCancelButtons,
	createInputWithEnterHandler
} from './modal-helpers';

export class NamePromptModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private input!: HTMLInputElement;

	constructor(app: App, plugin: TasksDashboardPlugin, dashboard: DashboardConfig) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
	}

	onOpen() {
		setupPromptModal(this, 'Issue Name');
		this.input = createInputWithEnterHandler(
			this.contentEl,
			'Enter issue name...',
			() => this.confirm()
		);
		createConfirmCancelButtons(
			this.contentEl,
			'Confirm',
			() => this.confirm(),
			() => this.close()
		);
	}

	private confirm() {
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
		setTimeout(() => {
			const event = new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				code: 'ArrowDown',
				bubbles: true
			});
			this.inputEl.dispatchEvent(event);
		}, 0);
	}

	getSuggestions(): Priority[] {
		return ['low', 'medium', 'high', 'top'];
	}

	renderSuggestion(priority: Priority, el: HTMLElement) {
		const container = el.createDiv({ cls: 'tdc-priority-suggestion' });
		container.createSpan({ cls: `tdc-priority-dot priority-${priority}` });
		container.createSpan({ text: priority.charAt(0).toUpperCase() + priority.slice(1) });
	}

	onChooseSuggestion(priority: Priority) {
		if (!this.dashboard.githubEnabled) {
			void createIssueWithGitHub(
				this.app,
				this.plugin,
				this.dashboard,
				this.issueName,
				priority,
				undefined,
				undefined
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
		if (option.type === 'skip') {
			void createIssueWithGitHub(
				this.app,
				this.plugin,
				this.dashboard,
				this.issueName,
				this.priority,
				undefined,
				undefined
			);
			return;
		}

		if (option.type === 'issue-pr') {
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

		// option.type === 'repository' at this point (after prior returns)
		void this.openRepositoryPicker();
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
				this.priority,
				undefined,
				undefined
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
	try {
		const issue = await plugin.issueManager.createIssue({
			name: issueName,
			priority,
			githubLink: repoUrl,
			dashboard
		});
		new Notice(`Created issue: ${issueName}`);
		await openFileAndFocusEnd(app, issue.filePath);
	} catch (error) {
		new Notice(`Error creating issue: ${(error as Error).message}`);
	}
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
	try {
		const issue = await plugin.issueManager.createIssue({
			name: issueName,
			priority,
			githubLink: githubUrl,
			githubMetadata,
			dashboard
		});
		new Notice(`Created issue: ${issueName}`);
		await openFileAndFocusEnd(app, issue.filePath);
	} catch (error) {
		new Notice(`Error creating issue: ${(error as Error).message}`);
	}
}

class GithubPromptModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueName: string;
	private priority: Priority;
	private input!: HTMLInputElement;

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
		const value = this.input.value.trim();
		this.close();
		await this.createIssue(value !== '' ? value : undefined);
	}

	private async createIssue(githubLink?: string) {
		try {
			const issue = await this.plugin.issueManager.createIssue({
				name: this.issueName,
				priority: this.priority,
				githubLink,
				dashboard: this.dashboard
			});
			new Notice(`Created issue: ${this.issueName}`);
			await openFileAndFocusEnd(this.app, issue.filePath);
		} catch (error) {
			new Notice(`Error creating issue: ${(error as Error).message}`);
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}
