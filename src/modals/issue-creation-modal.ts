import { App, MarkdownView, Modal, Notice, TFile } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { getErrorMessage } from '../settings/settings-helpers';
import { DashboardConfig, GitHubIssueMetadata, GitHubRepository, Priority } from '../types';
import { getGitHubLinkType } from '../utils/github';
import { parseGitHubRepoFullName, parseGitHubUrl } from '../utils/github-url';
import { GitHubSearchModal } from './GitHubSearchModal';
import {
	createConfirmCancelButtons,
	createInputWithEnterHandler,
	createPromptBackButton,
	createPromptButtonsContainer,
	createPromptCancelButton,
	createPromptConfirmButton,
	registerMouseBackShortcut,
	setupPromptModal
} from './modal-helpers';
import {
	applySingleSelectionPressedState,
	getWrappedIndex,
	handleListNavigationKeydown
} from './modal-keyboard-helpers';
import { RepositoryPickerModal } from './RepositoryPickerModal';

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
	private initialIssueName: string | undefined;
	private input: HTMLInputElement | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		mode: IssueCreationMode = 'standard',
		worktreeOriginFolder?: string,
		sourceIssueLinkedRepository?: string,
		initialIssueName?: string
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.mode = mode;
		this.worktreeOriginFolder = worktreeOriginFolder;
		this.sourceIssueLinkedRepository = sourceIssueLinkedRepository;
		this.initialIssueName = initialIssueName;
	}

	onOpen() {
		setupPromptModal(this, this.mode === 'worktree' ? 'Worktree Name' : 'Issue Name');
		this.input = createInputWithEnterHandler(this.contentEl, 'Enter issue name...', () =>
			this.confirm()
		);
		if (this.initialIssueName !== undefined && this.initialIssueName !== '') {
			this.input.value = this.initialIssueName;
			this.input.select();
		}
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
				this.sourceIssueLinkedRepository,
				WORKTREE_COLOR_PRESETS[0]
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
	private initialColor: string;
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
		sourceIssueLinkedRepository?: string,
		initialColor: string = WORKTREE_COLOR_PRESETS[0]
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueName = issueName;
		this.mode = mode;
		this.worktreeOriginFolder = worktreeOriginFolder;
		this.sourceIssueLinkedRepository = sourceIssueLinkedRepository;
		this.initialColor = initialColor;
		this.selectedColor = initialColor;
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
			if (event.key === 'Backspace') {
				event.preventDefault();
				this.goBack();
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
		this.contentEl.addEventListener('keydown', (event) => {
			if (event.key === 'Backspace') {
				event.preventDefault();
				this.goBack();
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				this.close();
			}
		});
		registerMouseBackShortcut(this.contentEl, () => {
			this.goBack();
		});

		const buttonContainer = createPromptButtonsContainer(this.contentEl);
		void createPromptBackButton(buttonContainer, () => {
			this.goBack();
		});
		void createPromptConfirmButton(buttonContainer, () => {
			this.confirm();
		});
		void createPromptCancelButton(buttonContainer, () => {
			this.close();
		});
	}

	private goBack(): void {
		this.close();
		new NamePromptModal(
			this.app,
			this.plugin,
			this.dashboard,
			this.mode,
			this.worktreeOriginFolder,
			this.sourceIssueLinkedRepository,
			this.issueName
		).open();
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
		if (event.key === 'Backspace') {
			event.preventDefault();
			this.goBack();
			return;
		}
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
		const nextIndex = getWrappedIndex(currentIndex, step, WORKTREE_COLOR_PRESETS.length);
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

class PriorityPromptModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueName: string;
	private issueColor: string;
	private mode: IssueCreationMode;
	private worktreeOriginFolder: string | undefined;
	private sourceIssueLinkedRepository: string | undefined;
	private selectedPriority: Priority = PRIORITY_OPTIONS[0];
	private priorityButtons: Map<Priority, HTMLButtonElement> = new Map();

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
	}

	onOpen() {
		setupPromptModal(this, 'Issue Priority');
		const priorityList = this.contentEl.createDiv({ cls: 'tdc-selectable-option-list' });

		for (const priority of PRIORITY_OPTIONS) {
			const confirmFromMouse = (event: MouseEvent): void => {
				if (event.button !== 0) {
					return;
				}
				event.preventDefault();
				this.selectPriority(priority, true);
				this.confirmSelection();
			};
			const optionButton = priorityList.createEl('button', {
				cls: 'tdc-selectable-option-btn',
				attr: {
					type: 'button',
					'aria-pressed': 'false'
				}
			});
			const container = optionButton.createDiv({ cls: 'tdc-priority-suggestion' });
			container.createSpan({ cls: `tdc-priority-dot priority-${priority}` });
			container.createSpan({ text: formatPriorityLabel(priority) });
			optionButton.addEventListener('mouseup', confirmFromMouse);
			this.priorityButtons.set(priority, optionButton);
		}

		this.selectPriority(this.selectedPriority, true);

		const buttonContainer = createPromptButtonsContainer(this.contentEl);
		void createPromptBackButton(buttonContainer, () => {
			this.goBack();
		});
		void createPromptConfirmButton(buttonContainer, () => {
			this.confirmSelection();
		});
		void createPromptCancelButton(buttonContainer, () => {
			this.close();
		});

		this.contentEl.addEventListener('keydown', (event) => {
			this.handleKeydown(event);
		});
		registerMouseBackShortcut(this.contentEl, () => {
			this.goBack();
		});
	}

	private handleKeydown(event: KeyboardEvent): void {
		handleListNavigationKeydown(event, {
			onNext: () => {
				this.moveSelection(1);
			},
			onPrevious: () => {
				this.moveSelection(-1);
			},
			onBack: () => {
				this.goBack();
			},
			onClose: () => {
				this.close();
			},
			onConfirm: () => {
				this.confirmSelection();
			}
		});
	}

	private moveSelection(step: number): void {
		const currentIndex = PRIORITY_OPTIONS.indexOf(this.selectedPriority);
		const nextIndex = getWrappedIndex(currentIndex, step, PRIORITY_OPTIONS.length);
		this.selectPriority(PRIORITY_OPTIONS[nextIndex], true);
	}

	private selectPriority(priority: Priority, focusButton: boolean): void {
		this.selectedPriority = priority;
		applySingleSelectionPressedState(this.priorityButtons, priority, focusButton);
	}

	private goBack(): void {
		this.close();
		new ColorPromptModal(
			this.app,
			this.plugin,
			this.dashboard,
			this.issueName,
			this.mode,
			this.worktreeOriginFolder,
			this.sourceIssueLinkedRepository,
			this.issueColor
		).open();
	}

	private confirmSelection(): void {
		const selectedPriority = this.selectedPriority;
		this.close();

		if (!this.dashboard.githubEnabled) {
			void createIssueWithGitHub(
				this.app,
				this.plugin,
				this.dashboard,
				this.issueName,
				selectedPriority,
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
				selectedPriority,
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
				selectedPriority,
				this.issueColor,
				this.mode,
				this.worktreeOriginFolder,
				this.sourceIssueLinkedRepository
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

class GitHubLinkTypeModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueName: string;
	private priority: Priority;
	private issueColor: string;
	private mode: IssueCreationMode;
	private worktreeOriginFolder: string | undefined;
	private sourceIssueLinkedRepository: string | undefined;
	private selectedOptionType: GitHubLinkType = 'skip';
	private optionButtons: Map<GitHubLinkType, HTMLButtonElement> = new Map();

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
	}

	onOpen(): void {
		setupPromptModal(this, 'Choose GitHub link type');
		const optionsList = this.contentEl.createDiv({ cls: 'tdc-selectable-option-list' });

		const options = this.getOptions();
		for (const option of options) {
			const confirmFromMouse = (event: MouseEvent): void => {
				if (event.button !== 0) {
					return;
				}
				event.preventDefault();
				this.selectOption(option.type, true);
				this.confirmSelection();
			};
			const optionButton = optionsList.createEl('button', {
				cls: 'tdc-selectable-option-btn',
				attr: {
					type: 'button',
					'aria-pressed': 'false'
				}
			});
			const contentContainer = optionButton.createDiv({ cls: 'tdc-link-type-suggestion' });
			contentContainer.createDiv({ cls: 'tdc-link-type-label', text: option.label });
			contentContainer.createDiv({
				cls: 'tdc-link-type-description',
				text: option.description
			});
			optionButton.addEventListener('mouseup', confirmFromMouse);
			this.optionButtons.set(option.type, optionButton);
		}

		this.selectOption(this.selectedOptionType, true);

		const buttonContainer = createPromptButtonsContainer(this.contentEl);
		void createPromptBackButton(buttonContainer, () => {
			this.goBack();
		});
		void createPromptCancelButton(buttonContainer, () => {
			this.close();
		});
		void createPromptConfirmButton(buttonContainer, () => {
			this.confirmSelection();
		});

		this.contentEl.addEventListener('keydown', (event) => {
			this.handleKeydown(event);
		});
		registerMouseBackShortcut(this.contentEl, () => {
			this.goBack();
		});
	}

	private getOptions(): GitHubLinkTypeOption[] {
		const options =
			this.mode === 'worktree'
				? GITHUB_LINK_TYPE_OPTIONS.filter((option) => option.type !== 'repository')
				: GITHUB_LINK_TYPE_OPTIONS;
		const orderedOptions = [...options].sort((left, right) => {
			if (left.type === 'skip') {
				return -1;
			}
			if (right.type === 'skip') {
				return 1;
			}
			return 0;
		});
		const hasDefaultOption = orderedOptions.some(
			(option) => option.type === this.selectedOptionType
		);
		if (!hasDefaultOption) {
			this.selectedOptionType = orderedOptions[0]?.type ?? 'skip';
		}
		return orderedOptions;
	}

	private handleKeydown(event: KeyboardEvent): void {
		handleListNavigationKeydown(event, {
			onNext: () => {
				this.moveSelection(1);
			},
			onPrevious: () => {
				this.moveSelection(-1);
			},
			onBack: () => {
				this.goBack();
			},
			onClose: () => {
				this.close();
			},
			onConfirm: () => {
				this.confirmSelection();
			}
		});
	}

	private moveSelection(step: number): void {
		const options = this.getOptions();
		if (options.length === 0) {
			return;
		}
		const optionTypes = options.map((option) => option.type);
		const currentIndex = optionTypes.indexOf(this.selectedOptionType);
		const nextIndex = getWrappedIndex(currentIndex, step, optionTypes.length);
		this.selectOption(optionTypes[nextIndex], true);
	}

	private selectOption(optionType: GitHubLinkType, focusButton: boolean): void {
		this.selectedOptionType = optionType;
		applySingleSelectionPressedState(this.optionButtons, optionType, focusButton);
	}

	private goBack(): void {
		this.close();
		new PriorityPromptModal(
			this.app,
			this.plugin,
			this.dashboard,
			this.issueName,
			this.issueColor,
			this.mode,
			this.worktreeOriginFolder,
			this.sourceIssueLinkedRepository
		).open();
	}

	private confirmSelection(): void {
		const selectedOptionType = this.selectedOptionType;
		this.close();

		switch (selectedOptionType) {
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
						issueRepository: this.sourceIssueLinkedRepository,
						showBackButton: true,
						skipButtonLabel: 'Skip',
						onBack: () => {
							new GitHubLinkTypeModal(
								this.app,
								this.plugin,
								this.dashboard,
								this.issueName,
								this.priority,
								this.issueColor,
								this.mode,
								this.worktreeOriginFolder,
								this.sourceIssueLinkedRepository
							).open();
						}
					}
				).open();
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
				this.priority,
				undefined,
				undefined,
				this.issueColor,
				this.mode,
				this.worktreeOriginFolder
			);
			return;
		}

		new RepositoryPickerModal(
			this.app,
			repositories,
			(repository: GitHubRepository) => {
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
			},
			() => {
				new GitHubLinkTypeModal(
					this.app,
					this.plugin,
					this.dashboard,
					this.issueName,
					this.priority,
					this.issueColor,
					this.mode,
					this.worktreeOriginFolder,
					this.sourceIssueLinkedRepository
				).open();
			}
		).open();
	}
}

class PrioritySelectionModal extends Modal {
	private readonly onSelected: (priority: Priority) => void;
	private selectedPriority: Priority = PRIORITY_OPTIONS[0];
	private priorityButtons: Map<Priority, HTMLButtonElement> = new Map();

	constructor(app: App, onSelected: (priority: Priority) => void) {
		super(app);
		this.onSelected = onSelected;
	}

	override onOpen(): void {
		setupPromptModal(this, 'Select priority');
		const priorityList = this.contentEl.createDiv({ cls: 'tdc-selectable-option-list' });

		for (const priority of PRIORITY_OPTIONS) {
			const optionButton = priorityList.createEl('button', {
				cls: 'tdc-selectable-option-btn',
				attr: {
					type: 'button',
					'aria-pressed': 'false'
				}
			});
			const container = optionButton.createDiv({ cls: 'tdc-priority-suggestion' });
			container.createSpan({ cls: `tdc-priority-dot priority-${priority}` });
			container.createSpan({ text: formatPriorityLabel(priority) });
			optionButton.addEventListener('click', () => {
				this.selectPriority(priority, true);
			});
			this.priorityButtons.set(priority, optionButton);
		}

		this.selectPriority(this.selectedPriority, true);

		const buttonContainer = createPromptButtonsContainer(this.contentEl);
		void createPromptCancelButton(buttonContainer, () => {
			this.close();
		});
		void createPromptConfirmButton(buttonContainer, () => {
			this.confirmSelection();
		});

		this.contentEl.addEventListener('keydown', (event) => {
			this.handleKeydown(event);
		});
	}

	private handleKeydown(event: KeyboardEvent): void {
		handleListNavigationKeydown(event, {
			onNext: () => {
				this.moveSelection(1);
			},
			onPrevious: () => {
				this.moveSelection(-1);
			},
			onClose: () => {
				this.close();
			},
			onConfirm: () => {
				this.confirmSelection();
			}
		});
	}

	private moveSelection(step: number): void {
		const currentIndex = PRIORITY_OPTIONS.indexOf(this.selectedPriority);
		const nextIndex = getWrappedIndex(currentIndex, step, PRIORITY_OPTIONS.length);
		this.selectPriority(PRIORITY_OPTIONS[nextIndex], true);
	}

	private selectPriority(priority: Priority, focusButton: boolean): void {
		this.selectedPriority = priority;
		applySingleSelectionPressedState(this.priorityButtons, priority, focusButton);
	}

	private confirmSelection(): void {
		this.close();
		this.onSelected(this.selectedPriority);
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
	private sourceIssueLinkedRepository: string | undefined;
	private input: HTMLInputElement | undefined;

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
	}

	onOpen() {
		setupPromptModal(this, 'GitHub Link (optional)');
		this.input = createInputWithEnterHandler(
			this.contentEl,
			'https://github.com/... (or leave empty)',
			() => void this.confirm()
		);
		const buttonContainer = createPromptButtonsContainer(this.contentEl);
		void createPromptBackButton(buttonContainer, () => {
			this.goBack();
		});
		void createPromptConfirmButton(
			buttonContainer,
			() => {
				void this.confirm();
			},
			'Create Issue'
		);
		void createPromptCancelButton(buttonContainer, () => {
			this.close();
		});

		this.contentEl.addEventListener('keydown', (event) => {
			if (event.key === 'Backspace') {
				event.preventDefault();
				this.goBack();
				return;
			}
			if (event.key === 'Escape') {
				event.preventDefault();
				this.close();
			}
		});
		registerMouseBackShortcut(this.contentEl, () => {
			this.goBack();
		});
	}

	private goBack(): void {
		this.close();
		new PriorityPromptModal(
			this.app,
			this.plugin,
			this.dashboard,
			this.issueName,
			this.issueColor,
			this.mode,
			this.worktreeOriginFolder,
			this.sourceIssueLinkedRepository
		).open();
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
