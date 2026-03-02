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
import { getGitHubLinkType } from '../utils/github';
import { parseGitHubRepoFullName, parseGitHubUrl } from '../utils/github-url';

interface CreateIssueRequest {
	name: string;
	priority: Priority;
	dashboard: DashboardConfig;
	color?: string;
	worktree?: boolean;
	worktreeOriginFolder?: string;
	githubLink?: string;
	githubMetadata?: GitHubIssueMetadata;
}

type IssueCreationMode = 'standard' | 'worktree';

const PRIORITY_OPTIONS: Priority[] = ['low', 'medium', 'high', 'top'];
const WORKTREE_COLOR_PRESETS = [
	'#4a8cc7',
	'#4caf50',
	'#ff9800',
	'#f44336',
	'#9c27b0',
	'#00bcd4',
	'#3f51b5',
	'#8bc34a',
	'#ffc107',
	'#795548',
	'#607d8b',
	'#e91e63',
	'#009688',
	'#673ab7',
	'#cddc39',
	'#2196f3',
	'#ff5722',
	'#ff4081',
	'#b71c1c',
	'#1b5e20'
];
const PRESET_NAVIGATION_COLUMNS = 5;

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
		const issue = await plugin.issueManager.createIssue({
			...request,
			worktreeColor: request.color
		});
		if (request.color !== undefined) {
			plugin.settings.issueColors[issue.id] = request.color;
			await plugin.saveSettings();
		}
		if (request.worktree === true) {
			plugin.issueManager.setupWorktree(
				request.dashboard,
				issue.id,
				request.name,
				request.color,
				request.worktreeOriginFolder
			);
		}
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
	private mode: IssueCreationMode;
	private worktreeOriginFolder: string | undefined;
	private sourceIssueLinkedRepository: string | undefined;
	private input: HTMLInputElement | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		mode: IssueCreationMode = 'standard',
		worktreeOriginFolder?: string,
		sourceIssueLinkedRepository?: string
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.mode = mode;
		this.worktreeOriginFolder = worktreeOriginFolder;
		this.sourceIssueLinkedRepository = sourceIssueLinkedRepository;
	}

	onOpen() {
		setupPromptModal(this, this.mode === 'worktree' ? 'Worktree Name' : 'Issue Name');
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
			new ColorPromptModal(
				this.app,
				this.plugin,
				this.dashboard,
				value,
				this.mode,
				this.worktreeOriginFolder,
				this.sourceIssueLinkedRepository
			).open();
		} else {
			this.input.addClass('tdc-input-error');
			this.input.focus();
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}

class ColorPromptModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueName: string;
	private mode: IssueCreationMode;
	private worktreeOriginFolder: string | undefined;
	private sourceIssueLinkedRepository: string | undefined;
	private input: HTMLInputElement | undefined;
	private presetButtons: HTMLButtonElement[] = [];
	private selectedColor = WORKTREE_COLOR_PRESETS[0];

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueName: string,
		mode: IssueCreationMode,
		worktreeOriginFolder?: string,
		sourceIssueLinkedRepository?: string
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueName = issueName;
		this.mode = mode;
		this.worktreeOriginFolder = worktreeOriginFolder;
		this.sourceIssueLinkedRepository = sourceIssueLinkedRepository;
	}

	onOpen(): void {
		setupPromptModal(this, 'Issue Color');
		const presets = this.contentEl.createDiv({ cls: 'tdc-color-preset-row' });
		presets.setAttribute('role', 'radiogroup');
		presets.setAttribute('aria-label', 'Issue color presets');
		const colorPickerRow = this.contentEl.createDiv({ cls: 'tdc-color-picker-row' });
		colorPickerRow.createSpan({
			cls: 'tdc-color-picker-label',
			text: 'Color picker'
		});
		this.input = colorPickerRow.createEl('input', {
			type: 'color',
			cls: 'tdc-color-picker-circle',
			attr: {
				'aria-label': 'Color picker'
			}
		});
		this.input.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				this.confirm();
				return;
			}
			if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
				event.preventDefault();
				this.movePresetSelection(-1);
				return;
			}
			if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
				event.preventDefault();
				this.movePresetSelection(1);
			}
		});
		this.input.addEventListener('input', () => {
			if (this.input === undefined) {
				return;
			}
			this.selectColor(this.input.value, false);
		});
		this.input.value = this.selectedColor;
		this.input.focus();
		for (const color of WORKTREE_COLOR_PRESETS) {
			const preset = presets.createEl('button', {
				cls: 'tdc-color-preset-btn',
				attr: {
					type: 'button',
					'aria-label': `Select color ${color}`,
					'aria-checked': 'false',
					role: 'radio',
					tabindex: '-1'
				}
			});
			preset.style.backgroundColor = color;
			this.presetButtons.push(preset);
			preset.addEventListener('click', () => {
				this.selectColor(color, true);
			});
			preset.addEventListener('keydown', (event) => {
				this.handlePresetArrowNavigation(event, color);
			});
		}
		this.selectColor(this.selectedColor, false);

		createConfirmCancelButtons(
			this.contentEl,
			'Confirm',
			() => this.confirm(),
			() => this.close()
		);
	}

	private confirm(): void {
		if (this.input === undefined) {
			return;
		}
		const color = this.input.value.trim();
		this.close();
		new PriorityPromptModal(
			this.app,
			this.plugin,
			this.dashboard,
			this.issueName,
			color,
			this.mode,
			this.worktreeOriginFolder,
			this.sourceIssueLinkedRepository
		).open();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private handlePresetArrowNavigation(event: KeyboardEvent, color: string): void {
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			this.movePresetSelection(-1);
			return;
		}
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			this.movePresetSelection(1);
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			this.movePresetSelection(-PRESET_NAVIGATION_COLUMNS);
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			this.movePresetSelection(PRESET_NAVIGATION_COLUMNS);
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			this.confirm();
			return;
		}
		if (event.key === ' ') {
			event.preventDefault();
			this.selectColor(color, true);
		}
	}

	private movePresetSelection(step: number): void {
		if (WORKTREE_COLOR_PRESETS.length === 0) {
			return;
		}

		const currentIndex = WORKTREE_COLOR_PRESETS.indexOf(this.selectedColor);
		const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
		const nextIndex =
			((safeCurrentIndex + step) % WORKTREE_COLOR_PRESETS.length +
				WORKTREE_COLOR_PRESETS.length) %
			WORKTREE_COLOR_PRESETS.length;
		const nextColor = WORKTREE_COLOR_PRESETS[nextIndex];
		this.selectColor(nextColor, true);
	}

	private selectColor(color: string, focusPreset: boolean): void {
		this.selectedColor = color;
		if (this.input !== undefined && this.input.value !== color) {
			this.input.value = color;
		}

		for (let index = 0; index < this.presetButtons.length; index += 1) {
			const preset = this.presetButtons[index];
			const isSelected = WORKTREE_COLOR_PRESETS[index] === color;
			preset.toggleClass('is-selected', isSelected);
			preset.setAttribute('aria-checked', isSelected ? 'true' : 'false');
			preset.setAttribute('tabindex', isSelected ? '0' : '-1');
			if (isSelected && focusPreset) {
				preset.focus();
			}
		}
	}
}

class PriorityPromptModal extends SuggestModal<Priority> {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueName: string;
	private issueColor: string;
	private mode: IssueCreationMode;
	private worktreeOriginFolder: string | undefined;
	private sourceIssueLinkedRepository: string | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueName: string,
		issueColor: string,
		mode: IssueCreationMode,
		worktreeOriginFolder?: string,
		sourceIssueLinkedRepository?: string
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueName = issueName;
		this.issueColor = issueColor;
		this.mode = mode;
		this.worktreeOriginFolder = worktreeOriginFolder;
		this.sourceIssueLinkedRepository = sourceIssueLinkedRepository;
		this.setPlaceholder('Select priority');
	}

	onOpen() {
		// SuggestModal.onOpen may return a promise
		void Promise.resolve(super.onOpen());
		window.setTimeout(() => {
			const arrowDownEvent = new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				code: 'ArrowDown',
				bubbles: true
			});
			this.inputEl.dispatchEvent(arrowDownEvent);
		}, 0);
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
				priority,
				undefined,
				undefined,
				this.issueColor,
				this.mode,
				this.worktreeOriginFolder
			);
			return;
		}
		if (this.plugin.githubService.isAuthenticated()) {
			new GitHubLinkTypeModal(
				this.app,
				this.plugin,
				this.dashboard,
				this.issueName,
				priority,
				this.issueColor,
				this.mode,
				this.worktreeOriginFolder,
				this.sourceIssueLinkedRepository
			).open();
		} else {
			new GithubPromptModal(
				this.app,
				this.plugin,
				this.dashboard,
				this.issueName,
				priority,
				this.issueColor,
				this.mode,
				this.worktreeOriginFolder
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
	private issueColor: string;
	private mode: IssueCreationMode;
	private worktreeOriginFolder: string | undefined;
	private sourceIssueLinkedRepository: string | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueName: string,
		priority: Priority,
		issueColor: string,
		mode: IssueCreationMode,
		worktreeOriginFolder?: string,
		sourceIssueLinkedRepository?: string
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueName = issueName;
		this.priority = priority;
		this.issueColor = issueColor;
		this.mode = mode;
		this.worktreeOriginFolder = worktreeOriginFolder;
		this.sourceIssueLinkedRepository = sourceIssueLinkedRepository;
		this.setPlaceholder('Choose GitHub link type...');
	}

	getSuggestions(): GitHubLinkTypeOption[] {
			if (this.mode === 'worktree') {
				return GITHUB_LINK_TYPE_OPTIONS.filter((option) => option.type !== 'repository');
			}
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
						this.priority,
						undefined,
						undefined,
						this.issueColor,
						this.mode,
						this.worktreeOriginFolder
				);
				return;
			}
			case 'issue-pr': {
				new GitHubSearchModal(
					this.app,
					this.plugin,
					this.dashboard,
					(url, metadata) => {
						void createIssueWithGitHub(
							this.app,
							this.plugin,
							this.dashboard,
							this.issueName,
							this.priority,
							url,
							metadata,
							this.issueColor,
							this.mode,
							this.worktreeOriginFolder
						);
					},
					{
						issueRepository: this.sourceIssueLinkedRepository
					}
				).open();
				return;
			}
			case 'repository': {
				if (this.mode === 'worktree') {
					void createIssueWithGitHub(
						this.app,
						this.plugin,
						this.dashboard,
						this.issueName,
						this.priority,
						undefined,
						undefined,
						this.issueColor,
						this.mode,
						this.worktreeOriginFolder
					);
					return;
				}
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
				this.priority,
				undefined,
				undefined,
				this.issueColor,
				this.mode,
				this.worktreeOriginFolder
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
				repository,
				this.issueColor,
				this.mode,
				this.worktreeOriginFolder
			);
		}).open();
	}
}

export class PrioritySelectionModal extends SuggestModal<Priority> {
	private readonly onSelected: (priority: Priority) => void;

	constructor(app: App, onSelected: (priority: Priority) => void) {
		super(app);
		this.onSelected = onSelected;
		this.setPlaceholder('Select priority');
	}

	override onOpen(): void {
		void Promise.resolve(super.onOpen());
		window.setTimeout(() => {
			const arrowDownEvent = new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				code: 'ArrowDown',
				bubbles: true
			});
			this.inputEl.dispatchEvent(arrowDownEvent);
		}, 0);
	}

	override getSuggestions(): Priority[] {
		return PRIORITY_OPTIONS;
	}

	override renderSuggestion(priority: Priority, el: HTMLElement): void {
		const container = el.createDiv({ cls: 'tdc-priority-suggestion' });
		container.createSpan({ cls: `tdc-priority-dot priority-${priority}` });
		container.createSpan({ text: formatPriorityLabel(priority) });
	}

	override onChooseSuggestion(priority: Priority): void {
		this.onSelected(priority);
	}
}

export const openPrioritySelectionModal = (
	app: App,
	onSelected: (priority: Priority) => void
): void => {
	new PrioritySelectionModal(app, onSelected).open();
};

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
	repository: GitHubRepository,
	color?: string,
	mode: IssueCreationMode = 'standard',
	worktreeOriginFolder?: string
): Promise<void> {
	const repoUrl = `https://github.com/${repository.fullName}`;
	await createIssueWithNotice(app, plugin, {
		name: issueName,
		priority,
		githubLink: repoUrl,
		color,
		worktree: mode === 'worktree',
		worktreeOriginFolder,
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
	worktreeOriginFolder?: string
): Promise<void> {
	await createIssueWithNotice(app, plugin, {
		name: issueName,
		priority,
		githubLink: githubUrl,
		githubMetadata,
		color,
		worktree: mode === 'worktree',
		worktreeOriginFolder,
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
	}
): void => {
	new NamePromptModal(
		app,
		plugin,
		dashboard,
		'worktree',
		options?.worktreeOriginFolder,
		getIssueLinkedRepositoryFromLinks(options?.sourceIssueGitHubLinks)
	).open();
};

class GithubPromptModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueName: string;
	private priority: Priority;
	private issueColor: string;
	private mode: IssueCreationMode;
	private worktreeOriginFolder: string | undefined;
	private input: HTMLInputElement | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueName: string,
		priority: Priority,
		issueColor: string,
		mode: IssueCreationMode,
		worktreeOriginFolder?: string
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueName = issueName;
		this.priority = priority;
		this.issueColor = issueColor;
		this.mode = mode;
		this.worktreeOriginFolder = worktreeOriginFolder;
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
			value !== '' ? value : undefined,
			undefined,
			this.issueColor,
			this.mode,
			this.worktreeOriginFolder
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}
