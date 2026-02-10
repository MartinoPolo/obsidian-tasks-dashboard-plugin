import { App, Modal, Notice, SuggestModal, TFile, MarkdownView } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, Priority, GitHubIssueMetadata, GitHubRepository } from '../types';
import { GitHubSearchModal } from './GitHubSearchModal';
import { RepositoryPickerModal } from './RepositoryPickerModal';

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
		const { contentEl, modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');
		contentEl.empty();
		contentEl.createEl('div', { cls: 'tdc-prompt-title', text: 'Issue Name' });
		this.input = contentEl.createEl('input', {
			type: 'text',
			cls: 'tdc-prompt-input',
			attr: { placeholder: 'Enter issue name...' }
		});
		this.input.focus();
		const btnContainer = contentEl.createDiv({ cls: 'tdc-prompt-buttons' });
		const confirmBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-confirm'
		});
		confirmBtn.innerHTML = 'Confirm <kbd>↵</kbd>';
		confirmBtn.addEventListener('click', () => {
			this.confirm();
		});
		const cancelBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-cancel'
		});
		cancelBtn.innerHTML = 'Cancel <kbd>Esc</kbd>';
		cancelBtn.addEventListener('click', () => {
			this.close();
		});
		this.input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				this.confirm();
			}
		});
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

export class DeleteConfirmationModal extends Modal {
	private issueName: string;
	private onConfirm: () => void;

	constructor(app: App, issueName: string, onConfirm: () => void) {
		super(app);
		this.issueName = issueName;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl, modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');
		contentEl.empty();

		contentEl.createEl('div', {
			cls: 'tdc-prompt-title',
			text: 'Confirm Delete'
		});

		contentEl.createEl('p', {
			text: `Are you sure you want to delete '${this.issueName}'? This will move the file to trash.`,
			cls: 'tdc-delete-message'
		});

		const btnContainer = contentEl.createDiv({ cls: 'tdc-prompt-buttons' });

		const cancelBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-cancel'
		});
		cancelBtn.innerHTML = 'Cancel <kbd>Esc</kbd>';
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		const deleteBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-delete'
		});
		deleteBtn.innerHTML = 'Delete <kbd>↵</kbd>';
		deleteBtn.addEventListener('click', () => {
			this.close();
			this.onConfirm();
		});

		contentEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				this.close();
				this.onConfirm();
			}
		});
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
			new GithubPromptModal(this.app, this.plugin, this.dashboard, this.issueName, priority).open();
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

async function createIssueWithRepoLink(
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
		const file = app.vault.getAbstractFileByPath(issue.filePath);
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
	} catch (error) {
		new Notice(`Error creating issue: ${(error as Error).message}`);
	}
}

async function createIssueWithGitHub(
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
		const file = app.vault.getAbstractFileByPath(issue.filePath);
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
		const { contentEl, modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');
		contentEl.empty();
		contentEl.createEl('div', {
			cls: 'tdc-prompt-title',
			text: 'GitHub Link (optional)'
		});
		this.input = contentEl.createEl('input', {
			type: 'text',
			cls: 'tdc-prompt-input',
			attr: { placeholder: 'https://github.com/... (or leave empty)' }
		});
		this.input.focus();
		const btnContainer = contentEl.createDiv({ cls: 'tdc-prompt-buttons' });
		const confirmBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-confirm'
		});
		confirmBtn.innerHTML = 'Create Issue <kbd>↵</kbd>';
		confirmBtn.addEventListener('click', () => {
			void this.confirm();
		});
		const cancelBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-cancel'
		});
		cancelBtn.innerHTML = 'Cancel <kbd>Esc</kbd>';
		cancelBtn.addEventListener('click', () => {
			this.close();
		});
		this.input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				void this.confirm();
			}
		});
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
			const file = this.app.vault.getAbstractFileByPath(issue.filePath);
			if (file instanceof TFile) {
				const leaf = this.app.workspace.getLeaf();
				await leaf.openFile(file);
				setTimeout(() => {
					const view = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (view?.editor) {
						const editor = view.editor;
						const lastLine = editor.lastLine();
						const lastLineLength = editor.getLine(lastLine).length;
						editor.setCursor({ line: lastLine, ch: lastLineLength });
						editor.focus();
					}
				}, 100);
			}
		} catch (error) {
			new Notice(`Error creating issue: ${(error as Error).message}`);
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class RenameIssueModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueId: string;
	private currentName: string;
	private input!: HTMLInputElement;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueId: string,
		currentName: string
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueId = issueId;
		this.currentName = currentName;
	}

	onOpen() {
		const { contentEl, modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');
		contentEl.empty();
		contentEl.createEl('div', { cls: 'tdc-prompt-title', text: 'Rename Issue' });
		this.input = contentEl.createEl('input', {
			type: 'text',
			cls: 'tdc-prompt-input',
			attr: { placeholder: 'Enter new name...' },
			value: this.currentName
		});
		this.input.focus();
		this.input.select();

		const btnContainer = contentEl.createDiv({ cls: 'tdc-prompt-buttons' });
		const confirmBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-confirm'
		});
		confirmBtn.innerHTML = 'Rename <kbd>↵</kbd>';
		confirmBtn.addEventListener('click', () => {
			void this.confirm();
		});
		const cancelBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-cancel'
		});
		cancelBtn.innerHTML = 'Cancel <kbd>Esc</kbd>';
		cancelBtn.addEventListener('click', () => {
			this.close();
		});
		this.input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				void this.confirm();
			}
		});
	}

	private async confirm() {
		const value = this.input.value.trim();
		if (value === '') {
			this.input.addClass('tdc-input-error');
			this.input.focus();
			return;
		}
		if (value === this.currentName) {
			this.close();
			return;
		}
		this.close();
		try {
			await this.plugin.issueManager.renameIssue(this.dashboard, this.issueId, value);
		} catch (error) {
			new Notice(`Error renaming issue: ${(error as Error).message}`);
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}
