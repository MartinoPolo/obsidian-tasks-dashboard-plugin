import { App, MarkdownView, Modal, Notice, TFile } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { getErrorMessage } from '../settings/settings-helpers';
import { DashboardConfig, GitHubIssueMetadata, GitHubRepository, Priority } from '../types';
import { getGitHubLinkType } from '../utils/github';
import { parseGitHubRepoFullName, parseGitHubUrl } from '../utils/github-url';
import {
	ISSUE_COLOR_PICKER_COLUMNS,
	collectUsedIssueColors,
	getNextAvailableIssueColor,
	getThemeAwareIssueColorPalette,
	isIssueColorUsed
} from '../utils/issue-colors';
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

interface CreateIssueRequest {
	name: string;
	priority: Priority;
	dashboard: DashboardConfig;
	color?: string;
	worktree?: boolean;
	worktreeOriginFolder?: string;
	worktreeBaseRepository?: string;
	githubLink?: string;
	githubMetadata?: GitHubIssueMetadata;
}

export interface QuickCreateDefaults {
	priority: Priority;
	color: string;
	worktree: boolean;
	worktreeOriginFolder?: string;
	worktreeBaseRepository?: string;
}

interface WorktreeCreationContext {
	eligible: boolean;
	worktreeOriginFolder?: string;
	sourceIssueLinkedRepository?: string;
}

interface GitHubSelectionContext {
	githubLink?: string;
	githubMetadata?: GitHubIssueMetadata;
}

type IssueCreationMode = 'standard' | 'worktree';

const PRIORITY_OPTIONS: Priority[] = ['low', 'medium', 'high', 'top'];

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
	private githubSelection: GitHubSelectionContext;
	private worktreeContext: WorktreeCreationContext | undefined;
	private quickCreateDefaults: QuickCreateDefaults | undefined;
	private input: HTMLInputElement | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		mode: IssueCreationMode = 'standard',
		worktreeOriginFolder?: string,
		sourceIssueLinkedRepository?: string,
		initialIssueName?: string,
		githubSelection: GitHubSelectionContext = {},
		worktreeContext?: WorktreeCreationContext,
		quickCreateDefaults?: QuickCreateDefaults
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.mode = mode;
		this.worktreeOriginFolder = worktreeOriginFolder;
		this.sourceIssueLinkedRepository = sourceIssueLinkedRepository;
		this.initialIssueName = initialIssueName;
		this.githubSelection = githubSelection;
		this.worktreeContext = worktreeContext;
		this.quickCreateDefaults = quickCreateDefaults;
	}

	onOpen() {
		setupPromptModal(this, this.mode === 'worktree' ? 'Worktree Name' : 'Issue Name');
		this.input = createInputWithEnterHandler(this.contentEl, 'Enter issue name...', () =>
			this.confirm()
		);
		this.input.addEventListener('keydown', (event) => {
			this.handleNameInputKeydown(event);
		});
		if (this.initialIssueName !== undefined && this.initialIssueName !== '') {
			this.input.value = this.initialIssueName;
			const inputLength = this.input.value.length;
			this.input.setSelectionRange(inputLength, inputLength);
		}
		createConfirmCancelButtons(
			this.contentEl,
			'Confirm',
			() => this.confirm(),
			() => this.close()
		);
	}

	private handleNameInputKeydown(event: KeyboardEvent): void {
		if (event.key === 'Backspace') {
			event.stopPropagation();
			return;
		}

		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
			return;
		}

		if (this.shouldOpenSuggestionModalFromNameInput() === false) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		this.openSuggestionModalFromNameInput();
	}

	private shouldOpenSuggestionModalFromNameInput(): boolean {
		if (this.mode !== 'standard') {
			return false;
		}
		if (
			!this.dashboard.githubEnabled ||
			this.plugin.githubService.isAuthenticated() === false
		) {
			return false;
		}

		const trimmedValue = this.input?.value.trim() ?? '';
		return trimmedValue === '' || /^\d+$/.test(trimmedValue);
	}

	private openSuggestionModalFromNameInput(): void {
		const existingNameValue = this.input?.value.trim();
		this.close();

		new GitHubSearchModal(
			this.app,
			this.plugin,
			this.dashboard,
			(url, metadata) => {
				const prefilledName =
					getPrefilledIssueName(metadata) ??
					(existingNameValue !== '' ? existingNameValue : undefined);
				new NamePromptModal(
					this.app,
					this.plugin,
					this.dashboard,
					'standard',
					this.worktreeContext?.worktreeOriginFolder,
					this.worktreeContext?.sourceIssueLinkedRepository,
					prefilledName,
					{
						githubLink: url,
						githubMetadata: metadata
					},
					this.worktreeContext
				).open();
			},
			{
				issueRepository: this.worktreeContext?.sourceIssueLinkedRepository,
				dashboardRepository: this.dashboard.githubRepo,
				onCancel: () => {
					new NamePromptModal(
						this.app,
						this.plugin,
						this.dashboard,
						'standard',
						this.worktreeContext?.worktreeOriginFolder,
						this.worktreeContext?.sourceIssueLinkedRepository,
						existingNameValue !== '' ? existingNameValue : undefined,
						this.githubSelection,
						this.worktreeContext
					).open();
				},
				skipButtonLabel: 'Back',
				selectionLockUntilCleared: true,
				confirmButtonLabel: 'Use selection',
				searchMode: 'issues-only'
			}
		).open();
	}

	private confirm() {
		if (this.input === undefined) {
			return;
		}

		const value = this.input.value.trim();
		if (value !== '') {
			this.close();

			if (this.quickCreateDefaults !== undefined) {
				const defaults = this.quickCreateDefaults;
				void createIssueWithNotice(this.app, this.plugin, {
					name: value,
					priority: defaults.priority,
					color: defaults.color,
					dashboard: this.dashboard,
					worktree: defaults.worktree,
					worktreeOriginFolder: defaults.worktreeOriginFolder,
					worktreeBaseRepository: defaults.worktreeBaseRepository,
					githubLink: this.githubSelection.githubLink,
					githubMetadata: this.githubSelection.githubMetadata
				});
				return;
			}

			if (this.mode === 'standard' && this.worktreeContext?.eligible === true) {
				new WorktreeDecisionModal(
					this.app,
					this.plugin,
					this.dashboard,
					value,
					this.worktreeContext,
					this.githubSelection
				).open();
				return;
			}

			new ColorPromptModal(
				this.app,
				this.plugin,
				this.dashboard,
				value,
				this.mode,
				this.worktreeOriginFolder,
				this.sourceIssueLinkedRepository,
				getNextAvailableIssueColor(this.plugin.settings.issueColors),
				this.githubSelection
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

class WorktreeDecisionModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueName: string;
	private worktreeContext: WorktreeCreationContext;
	private githubSelection: GitHubSelectionContext;
	private selectedChoice: 'yes' | 'no' = 'no';
	private choiceButtons: Map<'yes' | 'no', HTMLButtonElement> = new Map();

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueName: string,
		worktreeContext: WorktreeCreationContext,
		githubSelection: GitHubSelectionContext
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueName = issueName;
		this.worktreeContext = worktreeContext;
		this.githubSelection = githubSelection;
	}

	onOpen(): void {
		setupPromptModal(this, 'Create in worktree?');
		const options = this.contentEl.createDiv({ cls: 'tdc-selectable-option-list' });

		this.choiceButtons.set(
			'no',
			this.createChoiceButton(
				options,
				'no',
				'No',
				'Create as regular issue',
				'tdc-worktree-decision-no'
			)
		);
		this.choiceButtons.set(
			'yes',
			this.createChoiceButton(
				options,
				'yes',
				'Yes',
				'Create in worktree',
				'tdc-worktree-decision-yes'
			)
		);

		this.selectChoice(this.selectedChoice, true);

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
		});

		registerMouseBackShortcut(this.contentEl, () => {
			this.goBack();
		});
	}

	private createChoiceButton(
		container: HTMLElement,
		choice: 'yes' | 'no',
		label: string,
		description: string,
		cssClass: string
	): HTMLButtonElement {
		const optionButton = container.createEl('button', {
			cls: `tdc-selectable-option-btn ${cssClass}`,
			attr: {
				type: 'button',
				'aria-pressed': 'false'
			}
		});

		const content = optionButton.createDiv({ cls: 'tdc-link-type-suggestion' });
		content.createDiv({ cls: 'tdc-link-type-label', text: label });
		content.createDiv({ cls: 'tdc-link-type-description', text: description });

		optionButton.addEventListener('click', () => {
			this.selectChoice(choice, true);
		});

		optionButton.addEventListener('mouseup', (event) => {
			if (event.button !== 0) {
				return;
			}
			event.preventDefault();
			this.selectChoice(choice, true);
			this.confirmSelection();
		});

		return optionButton;
	}

	private moveSelection(step: number): void {
		const options: Array<'yes' | 'no'> = ['no', 'yes'];
		const currentIndex = options.indexOf(this.selectedChoice);
		const nextIndex = getWrappedIndex(currentIndex, step, options.length);
		this.selectChoice(options[nextIndex], true);
	}

	private selectChoice(choice: 'yes' | 'no', focusButton: boolean): void {
		this.selectedChoice = choice;
		applySingleSelectionPressedState(this.choiceButtons, choice, focusButton);
	}

	private goBack(): void {
		this.close();
		new NamePromptModal(
			this.app,
			this.plugin,
			this.dashboard,
			'standard',
			this.worktreeContext.worktreeOriginFolder,
			this.worktreeContext.sourceIssueLinkedRepository,
			this.issueName,
			this.githubSelection,
			this.worktreeContext
		).open();
	}

	private confirmSelection(): void {
		this.close();
		const shouldCreateWorktree = this.selectedChoice === 'yes';
		new ColorPromptModal(
			this.app,
			this.plugin,
			this.dashboard,
			this.issueName,
			shouldCreateWorktree ? 'worktree' : 'standard',
			shouldCreateWorktree ? this.worktreeContext.worktreeOriginFolder : undefined,
			shouldCreateWorktree ? this.worktreeContext.sourceIssueLinkedRepository : undefined,
			getNextAvailableIssueColor(this.plugin.settings.issueColors),
			this.githubSelection
		).open();
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
	private githubSelection: GitHubSelectionContext;
	private input: HTMLInputElement | undefined;
	private presetButtons: HTMLButtonElement[] = [];
	private selectedColor = getThemeAwareIssueColorPalette()[0].background;
	private colorPresets: readonly import('../utils/color').IssueColorEntry[] = [];
	private usedColors = new Set<string>();

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueName: string,
		mode: IssueCreationMode,
		worktreeOriginFolder?: string,
		sourceIssueLinkedRepository?: string,
		initialColor: string = getThemeAwareIssueColorPalette()[0].background,
		githubSelection: GitHubSelectionContext = {}
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
		this.githubSelection = githubSelection;
	}

	onOpen(): void {
		setupPromptModal(this, 'Issue Color');
		this.colorPresets = getThemeAwareIssueColorPalette();
		this.usedColors = collectUsedIssueColors(this.plugin.settings.issueColors);
		if (isIssueColorUsed(this.plugin.settings.issueColors, this.selectedColor)) {
			this.selectedColor = getNextAvailableIssueColor(this.plugin.settings.issueColors);
		}
		this.contentEl.addClass('tdc-color-preset-row-six-columns');
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
		for (const entry of this.colorPresets) {
			const isUnavailable = this.usedColors.has(entry.background);
			const preset = presets.createEl('button', {
				cls: 'tdc-color-preset-btn',
				attr: {
					type: 'button',
					'aria-label': `Select color ${entry.background}`,
					'aria-checked': 'false',
					role: 'radio',
					tabindex: '-1',
					'aria-disabled': isUnavailable ? 'true' : 'false'
				}
			});
			preset.style.backgroundColor = entry.background;
			preset.disabled = isUnavailable;
			preset.toggleClass('is-disabled', isUnavailable);
			const indicator = preset.createSpan({ cls: 'tdc-color-preset-indicator', text: 'A' });
			indicator.style.color = entry.foreground;
			this.presetButtons.push(preset);
			preset.addEventListener('click', () => {
				if (isUnavailable) {
					return;
				}
				this.selectColor(entry.background, true);
			});
			preset.addEventListener('keydown', (event) => {
				this.handlePresetArrowNavigation(event, entry.background);
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
		const showWorktreeChoice =
			this.mode === 'standard' && this.worktreeOriginFolder !== undefined;
		if (showWorktreeChoice) {
			new WorktreeDecisionModal(
				this.app,
				this.plugin,
				this.dashboard,
				this.issueName,
				{
					eligible: true,
					worktreeOriginFolder: this.worktreeOriginFolder,
					sourceIssueLinkedRepository: this.sourceIssueLinkedRepository
				},
				this.githubSelection
			).open();
			return;
		}

		new NamePromptModal(
			this.app,
			this.plugin,
			this.dashboard,
			this.mode,
			this.worktreeOriginFolder,
			this.sourceIssueLinkedRepository,
			this.issueName,
			this.githubSelection,
			this.mode === 'standard' && this.worktreeOriginFolder !== undefined
				? {
						eligible: true,
						worktreeOriginFolder: this.worktreeOriginFolder,
						sourceIssueLinkedRepository: this.sourceIssueLinkedRepository
					}
				: undefined
		).open();
	}

	private confirm(): void {
		if (this.input === undefined) {
			return;
		}
		const color = this.input.value.trim();
		if (isIssueColorUsed(this.plugin.settings.issueColors, color)) {
			new Notice('Color already assigned. Pick an available color.');
			return;
		}
		this.close();
		new PriorityPromptModal(
			this.app,
			this.plugin,
			this.dashboard,
			this.issueName,
			color,
			this.mode,
			this.worktreeOriginFolder,
			this.sourceIssueLinkedRepository,
			this.githubSelection
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
			this.movePresetSelection(-ISSUE_COLOR_PICKER_COLUMNS);
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			this.movePresetSelection(ISSUE_COLOR_PICKER_COLUMNS);
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
		if (this.colorPresets.length === 0) {
			return;
		}
		const currentIndex = this.colorPresets.findIndex(
			(entry) => entry.background === this.selectedColor
		);
		let nextIndex = currentIndex;
		for (let index = 0; index < this.colorPresets.length; index += 1) {
			nextIndex = getWrappedIndex(nextIndex, step, this.colorPresets.length);
			const nextColor = this.colorPresets[nextIndex].background;
			if (this.usedColors.has(nextColor)) {
				continue;
			}
			this.selectColor(nextColor, true);
			return;
		}
	}

	private selectColor(color: string, focusPreset: boolean): void {
		this.selectedColor = color;
		if (this.input !== undefined && this.input.value !== color) {
			this.input.value = color;
		}

		for (let index = 0; index < this.presetButtons.length; index += 1) {
			const preset = this.presetButtons[index];
			const isSelected = this.colorPresets[index].background === color;
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
	private githubSelection: GitHubSelectionContext;
	private selectedPriority: Priority = 'low';
	private priorityButtons: Map<Priority, HTMLButtonElement> = new Map();

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueName: string,
		issueColor: string,
		mode: IssueCreationMode,
		worktreeOriginFolder?: string,
		sourceIssueLinkedRepository?: string,
		githubSelection: GitHubSelectionContext = {}
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueName = issueName;
		this.issueColor = issueColor;
		this.mode = mode;
		this.worktreeOriginFolder = worktreeOriginFolder;
		this.sourceIssueLinkedRepository = sourceIssueLinkedRepository;
		this.githubSelection = githubSelection;
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
			this.issueColor,
			this.githubSelection
		).open();
	}

	private confirmSelection(): void {
		const selectedPriority = this.selectedPriority;
		this.close();

		void createIssueWithGitHub(
			this.app,
			this.plugin,
			this.dashboard,
			this.issueName,
			selectedPriority,
			this.githubSelection.githubLink,
			this.githubSelection.githubMetadata,
			this.issueColor,
			this.mode,
			this.worktreeOriginFolder,
			this.sourceIssueLinkedRepository
		);
	}
}

class PrioritySelectionModal extends Modal {
	private readonly onSelected: (priority: Priority) => void;
	private selectedPriority: Priority = 'low';
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
	worktreeBaseRepository?: string
): Promise<void> {
	await createIssueWithNotice(app, plugin, {
		name: issueName,
		priority,
		githubLink: githubUrl,
		githubMetadata,
		color,
		worktree: mode === 'worktree',
		worktreeOriginFolder,
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
	new NamePromptModal(
		app,
		plugin,
		dashboard,
		'worktree',
		options?.worktreeOriginFolder,
		sourceIssueLinkedRepository,
		undefined,
		{},
		undefined
	).open();
};

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
	new NamePromptModal(
		app,
		plugin,
		options.dashboard,
		options.quickCreateDefaults?.worktree === true ? 'worktree' : 'standard',
		options.quickCreateDefaults?.worktreeOriginFolder,
		undefined,
		prefilledName,
		{
			githubLink: options.githubUrl,
			githubMetadata: options.githubMetadata
		},
		undefined,
		options.quickCreateDefaults
	).open();
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
		new NamePromptModal(
			app,
			plugin,
			dashboard,
			'standard',
			worktreeContext?.worktreeOriginFolder,
			worktreeContext?.sourceIssueLinkedRepository,
			undefined,
			{},
			worktreeContext
		).open();
		return;
	}

	if (plugin.githubService.isAuthenticated()) {
		new GitHubSearchModal(
			app,
			plugin,
			dashboard,
			(url, metadata) => {
				new NamePromptModal(
					app,
					plugin,
					dashboard,
					'standard',
					worktreeContext?.worktreeOriginFolder,
					worktreeContext?.sourceIssueLinkedRepository,
					getPrefilledIssueName(metadata),
					{
						githubLink: url,
						githubMetadata: metadata
					},
					worktreeContext
				).open();
			},
			{
				issueRepository: worktreeContext?.sourceIssueLinkedRepository,
				dashboardRepository: dashboard.githubRepo,
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

class ManualGitHubLinkFirstModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private worktreeContext: WorktreeCreationContext | undefined;
	private input: HTMLInputElement | undefined;

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

	onOpen(): void {
		setupPromptModal(this, 'GitHub Link (optional)');
		this.input = createInputWithEnterHandler(
			this.contentEl,
			'https://github.com/... (or leave empty)',
			() => {
				this.confirm();
			}
		);

		const buttonContainer = createPromptButtonsContainer(this.contentEl);
		void createPromptCancelButton(
			buttonContainer,
			() => {
				this.close();
			},
			'Skip'
		);
		void createPromptConfirmButton(
			buttonContainer,
			() => {
				this.confirm();
			},
			'Next'
		);

		this.contentEl.addEventListener('keydown', (event) => {
			if (event.key === 'Backspace') {
				event.stopPropagation();
			}
		});
	}

	private confirm(): void {
		const value = this.input?.value.trim();
		this.close();
		new NamePromptModal(
			this.app,
			this.plugin,
			this.dashboard,
			'standard',
			this.worktreeContext?.worktreeOriginFolder,
			this.worktreeContext?.sourceIssueLinkedRepository,
			undefined,
			{
				githubLink: value !== '' ? value : undefined
			},
			this.worktreeContext
		).open();
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
