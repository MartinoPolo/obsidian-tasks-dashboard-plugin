import { App, Modal, setTooltip } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import { extractLastPathSegment } from '../utils/path-utils';
import { createPlatformService, type PlatformService, type WorktreeEntry } from '../utils/platform';
import {
	createConfirmCancelButtons,
	createInputWithEnterHandler,
	setupPromptModal
} from './modal-helpers';

interface WorktreeRetryModalOptions {
	dashboard: DashboardConfig;
	issueId: string;
	suggestedBranchName: string;
	worktreeOriginFolder: string | undefined;
}

export class WorktreeRetryModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueId: string;
	private suggestedBranchName: string;
	private worktreeOriginFolder: string | undefined;
	private platformService: PlatformService;
	private branchNameInput: HTMLInputElement | undefined;
	private worktreeListContainer: HTMLElement | undefined;
	private selectedRepositoryFolder: string | undefined;

	constructor(app: App, plugin: TasksDashboardPlugin, options: WorktreeRetryModalOptions) {
		super(app);
		this.plugin = plugin;
		this.dashboard = options.dashboard;
		this.issueId = options.issueId;
		this.suggestedBranchName = options.suggestedBranchName;
		this.worktreeOriginFolder = options.worktreeOriginFolder;
		this.platformService = createPlatformService();
		this.selectedRepositoryFolder = options.worktreeOriginFolder;
	}

	onOpen(): void {
		setupPromptModal(this, 'Worktree Setup', {
			additionalModalClasses: ['tdc-worktree-retry-modal']
		});

		const availableRepositories = this.getAvailableRepositories();
		if (availableRepositories.length > 1) {
			this.renderRepositorySelector(availableRepositories);
		}

		this.worktreeListContainer = this.contentEl.createDiv({
			cls: 'tdc-worktree-list-container'
		});
		this.renderWorktreeList();

		const createSection = this.contentEl.createDiv({ cls: 'tdc-worktree-create-section' });
		createSection.createDiv({
			cls: 'tdc-worktree-create-label',
			text: 'Create new worktree'
		});

		this.branchNameInput = createInputWithEnterHandler(createSection, 'Branch name...', () => {
			this.confirmCreation();
		});
		this.branchNameInput.value = this.suggestedBranchName;
		this.branchNameInput.addEventListener('keydown', (event) => {
			if (event.key === 'Backspace') {
				event.stopPropagation();
			}
		});

		createConfirmCancelButtons(
			this.contentEl,
			'Create',
			() => {
				this.confirmCreation();
			},
			() => {
				this.close();
			}
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private getAvailableRepositories(): string[] {
		const repositories: string[] = [];

		if (
			this.worktreeOriginFolder !== undefined &&
			this.worktreeOriginFolder.trim() !== '' &&
			this.platformService.isGitRepositoryFolder(this.worktreeOriginFolder)
		) {
			repositories.push(this.worktreeOriginFolder);
		}

		const dashboardProjectFolder = this.dashboard.projectFolder;
		if (
			dashboardProjectFolder !== undefined &&
			dashboardProjectFolder.trim() !== '' &&
			this.platformService.isGitRepositoryFolder(dashboardProjectFolder) &&
			!repositories.includes(dashboardProjectFolder)
		) {
			repositories.push(dashboardProjectFolder);
		}

		return repositories;
	}

	private renderRepositorySelector(repositories: string[]): void {
		const selectorContainer = this.contentEl.createDiv({
			cls: 'tdc-worktree-repo-selector'
		});
		selectorContainer.createDiv({
			cls: 'tdc-worktree-repo-selector-label',
			text: 'Repository'
		});

		const selectElement = selectorContainer.createEl('select', {
			cls: 'tdc-worktree-repo-select dropdown'
		});

		for (const repositoryFolder of repositories) {
			const folderName = extractLastPathSegment(repositoryFolder);
			const optionElement = selectElement.createEl('option', {
				text: folderName,
				value: repositoryFolder
			});
			if (repositoryFolder === this.selectedRepositoryFolder) {
				optionElement.selected = true;
			}
		}

		selectElement.addEventListener('change', () => {
			this.selectedRepositoryFolder = selectElement.value;
			this.renderWorktreeList();
		});
	}

	private renderWorktreeList(): void {
		if (this.worktreeListContainer === undefined) {
			return;
		}

		this.worktreeListContainer.empty();

		const repositoryFolder = this.selectedRepositoryFolder;
		if (repositoryFolder === undefined || repositoryFolder.trim() === '') {
			this.worktreeListContainer.createDiv({
				cls: 'tdc-worktree-list-empty',
				text: 'No repository selected'
			});
			return;
		}

		const worktreeEntries = this.platformService.listActiveWorktrees(repositoryFolder);
		if (worktreeEntries.length === 0) {
			this.worktreeListContainer.createDiv({
				cls: 'tdc-worktree-list-empty',
				text: 'No active worktrees found'
			});
			return;
		}

		const listHeader = this.worktreeListContainer.createDiv({
			cls: 'tdc-worktree-list-header',
			text: `Active worktrees (${worktreeEntries.length})`
		});
		const defaultBranch = this.platformService.getDefaultBranch(repositoryFolder);
		if (defaultBranch !== undefined) {
			const baseBranchLabel = listHeader.createSpan({
				cls: 'tdc-worktree-base-branch-label',
				text: ` (base: ${defaultBranch})`
			});
			setTooltip(baseBranchLabel, `Default branch: ${defaultBranch}`, { delay: 500 });
		}

		const listElement = this.worktreeListContainer.createDiv({
			cls: 'tdc-worktree-list'
		});

		for (const entry of worktreeEntries) {
			this.renderWorktreeEntry(listElement, entry);
		}
	}

	private renderWorktreeEntry(container: HTMLElement, entry: WorktreeEntry): void {
		const row = container.createDiv({ cls: 'tdc-worktree-list-row' });
		const branchText = entry.branch ?? (entry.isBare ? '(bare)' : '(detached)');
		row.createDiv({ cls: 'tdc-worktree-list-branch', text: branchText });
		const pathElement = row.createDiv({
			cls: 'tdc-worktree-list-path',
			text: this.abbreviatePath(entry.path)
		});
		setTooltip(pathElement, entry.path, { delay: 500 });
	}

	private confirmCreation(): void {
		if (this.branchNameInput === undefined) {
			return;
		}

		const branchName = this.branchNameInput.value.trim();
		if (branchName === '') {
			this.branchNameInput.addClass('tdc-input-error');
			this.branchNameInput.focus();
			return;
		}

		this.close();
		void this.plugin.issueManager.retryWorktreeSetup(this.dashboard, this.issueId, branchName);
	}

	private abbreviatePath(fullPath: string): string {
		const normalizedPath = fullPath.replace(/\\/g, '/');
		const segments = normalizedPath.split('/');
		if (segments.length <= 3) {
			return normalizedPath;
		}
		return `.../${segments.slice(-3).join('/')}`;
	}
}
