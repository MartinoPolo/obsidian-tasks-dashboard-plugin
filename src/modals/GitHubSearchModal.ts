import { App, Modal } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import {
	DashboardConfig,
	GitHubIssueMetadata,
	GitHubRepository,
	GitHubSearchScope
} from '../types';
import { getStateClass, getStateText, truncateText } from '../utils/github-helpers';
import {
	createPromptBackButton,
	createPromptButtonsContainer,
	createPromptCancelButton,
	createPromptConfirmButton,
	registerMouseBackShortcut,
	setupPromptModal
} from './modal-helpers';
import { handleListNavigationKeydown } from './modal-keyboard-helpers';

const SEARCH_DEBOUNCE_MS = 300;
const MAX_COMBINED_RESULTS = 20;
const RECENT_ISSUES_LIMIT = 20;
const TITLE_TRUNCATION_LENGTH = 50;
const ISSUE_ICON =
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
const PR_ICON =
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>';

function appendSvgIcon(target: HTMLElement, svgMarkup: string): void {
	const parser = new DOMParser();
	const parsedDocument = parser.parseFromString(svgMarkup, 'image/svg+xml');
	if (parsedDocument.querySelector('parsererror') !== null) {
		return;
	}
	const svg = parsedDocument.documentElement;
	if (svg.tagName.toLowerCase() !== 'svg') {
		return;
	}
	target.appendChild(document.importNode(svg, true));
}

type OnSelectCallback = (url: string | undefined, metadata?: GitHubIssueMetadata) => void;
type GitHubSearchMode = 'issues-and-prs' | 'issues-only' | 'prs-only';

interface GitHubSearchModalLinkedRepositories {
	issueRepository?: string;
	dashboardRepository?: string;
	onCancel?: () => void;
	onBack?: () => void;
	showBackButton?: boolean;
	skipButtonLabel?: string;
	confirmButtonLabel?: string;
	selectionLockUntilCleared?: boolean;
	searchMode?: GitHubSearchMode;
	enterSkipsWithoutSelection?: boolean;
	separateSkipAndCancelButtons?: boolean;
	enterSkipLabel?: string;
	showSkipButton?: boolean;
}

interface ScopeOption {
	value: GitHubSearchScope;
	label: string;
}

const OTHER_REPOSITORY_SCOPE: GitHubSearchScope = 'other-repo';

export class GitHubSearchModal extends Modal {
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;
	private readonly issueLinkedRepository: string | undefined;
	private readonly dashboardLinkedRepository: string | undefined;
	private readonly onSelect: OnSelectCallback;
	private readonly onCancel: (() => void) | undefined;
	private readonly onBack: (() => void) | undefined;
	private readonly showBackButton: boolean;
	private readonly skipButtonLabel: string;
	private readonly confirmButtonLabel: string;
	private readonly selectionLockUntilCleared: boolean;
	private readonly searchMode: GitHubSearchMode;
	private readonly enterSkipsWithoutSelection: boolean;
	private readonly separateSkipAndCancelButtons: boolean;
	private readonly enterSkipLabel: string;
	private readonly showSkipButton: boolean;
	private searchInput!: HTMLInputElement;
	private resultsContainer!: HTMLElement;
	private searchScopeSelect!: HTMLSelectElement;
	private enterButton: HTMLButtonElement | undefined;
	private otherRepositoryScopeLabel: HTMLElement | undefined;
	private otherRepositoryScopeSelect: HTMLSelectElement | undefined;
	private searchScope: GitHubSearchScope;
	private readonly scopeOptions: ScopeOption[];
	private selectedIndex = -1;
	private currentResults: GitHubIssueMetadata[] = [];
	private searchTimeout: ReturnType<typeof setTimeout> | undefined;
	private activeRequestId = 0;
	private hasResolved = false;
	private authenticatedUsername: string | undefined;
	private authenticatedUsernamePromise: Promise<void> | undefined;
	private userRepositories: GitHubRepository[] | undefined;
	private userRepositoriesPromise: Promise<void> | undefined;
	private selectedOtherRepository: string | undefined;
	private lockedSelection: GitHubIssueMetadata | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		onSelect: OnSelectCallback,
		linkedRepositories?: GitHubSearchModalLinkedRepositories
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueLinkedRepository = linkedRepositories?.issueRepository;
		this.dashboardLinkedRepository =
			linkedRepositories?.dashboardRepository ?? dashboard.githubRepos?.[0];
		this.onCancel = linkedRepositories?.onCancel;
		this.onBack = linkedRepositories?.onBack;
		this.showBackButton = linkedRepositories?.showBackButton ?? false;
		this.skipButtonLabel = linkedRepositories?.skipButtonLabel ?? 'Cancel';
		this.confirmButtonLabel = linkedRepositories?.confirmButtonLabel ?? 'Select';
		this.selectionLockUntilCleared = linkedRepositories?.selectionLockUntilCleared ?? false;
		this.searchMode = linkedRepositories?.searchMode ?? 'issues-and-prs';
		this.enterSkipsWithoutSelection = linkedRepositories?.enterSkipsWithoutSelection ?? false;
		this.separateSkipAndCancelButtons =
			linkedRepositories?.separateSkipAndCancelButtons ?? false;
		this.enterSkipLabel = linkedRepositories?.enterSkipLabel ?? this.skipButtonLabel;
		this.showSkipButton = linkedRepositories?.showSkipButton ?? true;
		this.onSelect = onSelect;
		this.scopeOptions = this.buildScopeOptions();
		this.searchScope = this.scopeOptions[0]?.value ?? 'my-repos';
	}

	onOpen(): void {
		const { contentEl } = this;
		setupPromptModal(this, this.getModalTitle(), {
			additionalModalClasses: ['tdc-github-search-modal']
		});

		const searchContainer = contentEl.createDiv({ cls: 'tdc-gh-search-container' });

		this.searchInput = searchContainer.createEl('input', {
			type: 'text',
			cls: 'tdc-prompt-input tdc-gh-search-input',
			attr: { placeholder: this.getSearchPlaceholder() }
		});

		const optionsContainer = contentEl.createDiv({ cls: 'tdc-gh-options' });

		const scopeLabel = optionsContainer.createEl('label', { cls: 'tdc-gh-scope-label' });
		scopeLabel.createSpan({ text: 'Search scope' });

		this.searchScopeSelect = scopeLabel.createEl('select', { cls: 'tdc-gh-scope-select' });

		for (const option of this.scopeOptions) {
			this.searchScopeSelect.createEl('option', {
				value: option.value,
				text: option.label
			});
		}

		this.searchScopeSelect.value = this.searchScope;

		this.otherRepositoryScopeLabel = optionsContainer.createEl('label', {
			cls: 'tdc-gh-scope-label'
		});
		this.otherRepositoryScopeLabel.createSpan({ text: 'Repository' });
		this.otherRepositoryScopeSelect = this.otherRepositoryScopeLabel.createEl('select', {
			cls: 'tdc-gh-scope-select'
		});
		this.otherRepositoryScopeSelect.createEl('option', {
			value: '',
			text: 'Loading repositories...'
		});

		this.resultsContainer = contentEl.createDiv({ cls: 'tdc-gh-results' });

		const btnContainer = createPromptButtonsContainer(contentEl);

		if (this.showBackButton && this.onBack !== undefined) {
			void createPromptBackButton(btnContainer, () => {
				this.goBack();
			});
			registerMouseBackShortcut(this.contentEl, () => {
				this.goBack();
			});
		}

		if (this.separateSkipAndCancelButtons) {
			if (this.showSkipButton) {
				const skipButton = btnContainer.createEl('button', {
					cls: 'tdc-prompt-btn tdc-prompt-btn-secondary',
					text: this.skipButtonLabel
				});
				skipButton.addEventListener('click', () => {
					this.skipSelection();
				});
			}

			void createPromptCancelButton(btnContainer, () => {
				this.cancelSelection();
			});
		} else {
			if (this.showSkipButton) {
				void createPromptCancelButton(
					btnContainer,
					() => {
						this.skipSelection();
					},
					this.skipButtonLabel,
					'tdc-prompt-btn-secondary'
				);
			}
		}

		this.enterButton = createPromptConfirmButton(
			btnContainer,
			() => {
				this.selectCurrent();
			},
			this.confirmButtonLabel
		);

		this.setupEventListeners();
		this.updateOtherRepositorySelectorVisibility();
		this.updateEnterButtonLabel();
		this.searchInput.focus();
		void this.ensureAuthenticatedUsernameLoaded();

		void this.loadRecentIssues(this.nextRequestId());
	}

	private async loadAuthenticatedUsername(): Promise<void> {
		this.authenticatedUsername = await this.plugin.githubService.getAuthenticatedUser();
	}

	private async ensureAuthenticatedUsernameLoaded(): Promise<void> {
		if (this.plugin.githubService.isAuthenticated() === false) {
			return;
		}
		if (this.authenticatedUsername !== undefined) {
			return;
		}
		if (this.authenticatedUsernamePromise === undefined) {
			this.authenticatedUsernamePromise = this.loadAuthenticatedUsername().finally(() => {
				this.authenticatedUsernamePromise = undefined;
			});
		}

		await this.authenticatedUsernamePromise;
	}

	private async loadUserRepositories(): Promise<void> {
		this.userRepositories = await this.plugin.githubService.getUserRepositories();
		if (this.userRepositories.length > 0) {
			const nextRepository = this.userRepositories[0].fullName;
			if (nextRepository !== '') {
				this.selectedOtherRepository = nextRepository;
			}
		}
	}

	private async ensureUserRepositoriesLoaded(): Promise<void> {
		if (this.userRepositories !== undefined) {
			this.populateOtherRepositoryOptions();
			return;
		}

		if (this.userRepositoriesPromise === undefined) {
			this.userRepositoriesPromise = this.loadUserRepositories().finally(() => {
				this.userRepositoriesPromise = undefined;
			});
		}

		await this.userRepositoriesPromise;
		this.populateOtherRepositoryOptions();
	}

	private populateOtherRepositoryOptions(): void {
		if (this.otherRepositoryScopeSelect === undefined) {
			return;
		}

		this.otherRepositoryScopeSelect.empty();
		const repositories = this.userRepositories ?? [];
		if (repositories.length === 0) {
			this.selectedOtherRepository = undefined;
			this.otherRepositoryScopeSelect.createEl('option', {
				value: '',
				text: 'No repositories available'
			});
			return;
		}

		for (const repository of repositories) {
			this.otherRepositoryScopeSelect.createEl('option', {
				value: repository.fullName,
				text: repository.fullName
			});
		}

		const hasSelectedRepository =
			this.selectedOtherRepository !== undefined &&
			repositories.some((repository) => repository.fullName === this.selectedOtherRepository);
		const fallbackRepository = repositories[0]?.fullName;
		const nextSelection = hasSelectedRepository
			? this.selectedOtherRepository
			: fallbackRepository;
		if (nextSelection !== undefined) {
			this.selectedOtherRepository = nextSelection;
			this.otherRepositoryScopeSelect.value = nextSelection;
		}
	}

	private updateOtherRepositorySelectorVisibility(): void {
		if (this.otherRepositoryScopeLabel === undefined) {
			return;
		}

		const showOtherRepositorySelector = this.searchScope === OTHER_REPOSITORY_SCOPE;
		this.otherRepositoryScopeLabel.style.display = showOtherRepositorySelector ? '' : 'none';
	}

	private handleSearchScopeChange(): void {
		this.searchScope = this.parseSearchScope(this.searchScopeSelect.value);
		this.updateOtherRepositorySelectorVisibility();
		if (this.searchScope === OTHER_REPOSITORY_SCOPE) {
			void this.ensureUserRepositoriesLoaded().then(() => {
				this.handleSearchInput('scope');
			});
			return;
		}

		this.handleSearchInput('scope');
	}

	private setupEventListeners(): void {
		this.searchInput.addEventListener('input', () => {
			this.handleSearchInput('typing');
		});

		this.searchInput.addEventListener('keydown', (event) => {
			this.handleKeydown(event);
		});

		this.searchScopeSelect.addEventListener('change', () => {
			this.handleSearchScopeChange();
		});

		const otherRepositoryScopeSelect = this.otherRepositoryScopeSelect;
		otherRepositoryScopeSelect?.addEventListener('change', () => {
			this.selectedOtherRepository = otherRepositoryScopeSelect.value;
			this.handleSearchInput('repository');
		});
	}

	private handleSearchInput(trigger: 'typing' | 'scope' | 'repository'): void {
		if (this.searchTimeout !== undefined) {
			clearTimeout(this.searchTimeout);
		}

		const requestId = this.nextRequestId();

		const query = this.searchInput.value.trim().replace(/^#/, '');

		if (this.selectionLockUntilCleared && this.lockedSelection !== undefined && query !== '') {
			this.renderLockedSelection();
			this.updateEnterButtonLabel();
			return;
		}

		if (this.selectionLockUntilCleared && this.lockedSelection !== undefined && query === '') {
			this.lockedSelection = undefined;
		}

		if (this.isGitHubUrl(query)) {
			this.showUrlPreview(query);
			this.updateEnterButtonLabel();
			return;
		}

		if (query === '') {
			void this.loadRecentIssues(requestId);
			this.updateEnterButtonLabel();
			return;
		}

		const preselectFirstResult = trigger === 'typing';

		this.searchTimeout = setTimeout(() => {
			void this.performSearch(query, requestId, preselectFirstResult);
		}, SEARCH_DEBOUNCE_MS);
		this.updateEnterButtonLabel();
	}

	private handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Backspace') {
			e.stopPropagation();
			return;
		}

		handleListNavigationKeydown(e, {
			onNext: () => {
				this.moveSelection(1);
			},
			onPrevious: () => {
				this.moveSelection(-1);
			},
			onBack:
				this.showBackButton && this.onBack !== undefined
					? () => {
							this.goBack();
						}
					: undefined,
			onClose: () => {
				if (!this.showSkipButton) {
					this.cancelSelection();
					return;
				}
				if (this.separateSkipAndCancelButtons) {
					this.cancelSelection();
					return;
				}
				this.skipSelection();
			},
			onConfirm: () => {
				this.selectCurrent();
			},
			includeHorizontalArrowKeys: false
		});
	}

	private moveSelection(delta: number): void {
		if (this.selectionLockUntilCleared && this.lockedSelection !== undefined) {
			return;
		}

		const items = this.getResultItems();
		if (items.length === 0) {
			return;
		}

		this.removeSelectionClass(items[this.selectedIndex]);
		this.selectedIndex = Math.max(0, Math.min(items.length - 1, this.selectedIndex + delta));
		const currentItem = items[this.selectedIndex];
		this.addSelectionClass(currentItem);
		currentItem.scrollIntoView({ block: 'nearest' });
		this.updateEnterButtonLabel();
	}

	private selectCurrent(): void {
		const query = this.searchInput.value.trim();

		if (this.isGitHubUrl(query)) {
			this.finishSelection(query);
			return;
		}

		if (this.selectionLockUntilCleared && this.lockedSelection !== undefined) {
			this.finishSelection(this.lockedSelection.url, this.lockedSelection);
			return;
		}

		if (this.selectedIndex >= 0 && this.selectedIndex < this.currentResults.length) {
			const selected = this.currentResults[this.selectedIndex];
			if (this.selectionLockUntilCleared) {
				this.lockSelection(selected);
				return;
			}
			this.finishSelection(selected.url, selected);
			return;
		}

		if (this.enterSkipsWithoutSelection) {
			this.skipSelection();
			return;
		}

		this.finishSelection(undefined);
	}

	private isGitHubUrl(text: string): boolean {
		return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/\d+$/.test(text.trim());
	}

	private async loadRecentIssues(requestId: number): Promise<void> {
		this.showLoading('Loading recent issues...');
		this.selectedIndex = -1;
		this.updateEnterButtonLabel();
		await this.ensureAuthenticatedUsernameLoaded();

		let results: GitHubIssueMetadata[] = [];
		if (this.searchScope === 'my-repos') {
			results = this.rankResults(await this.searchByMode('')).slice(0, RECENT_ISSUES_LIMIT);
		} else {
			const repo = this.getRepoForCurrentScope();
			if (repo === undefined || repo === '') {
				if (!this.isLatestRequest(requestId)) {
					return;
				}
				this.renderResultsWithSelection([], 'Recent Issues', false);
				return;
			}
			const recentResults = await this.plugin.githubService.getRecentIssues(
				repo,
				RECENT_ISSUES_LIMIT * 3
			);
			results = this.rankResults(
				recentResults.filter((item) => this.isResultAllowedByMode(item))
			).slice(0, RECENT_ISSUES_LIMIT);
		}

		if (!this.isLatestRequest(requestId)) {
			return;
		}

		this.renderResultsWithSelection(results, 'Recent Issues', false);
	}

	private async performSearch(
		query: string,
		requestId: number,
		preselectFirstResult: boolean
	): Promise<void> {
		this.showLoading('Searching...');
		this.selectedIndex = -1;
		this.updateEnterButtonLabel();
		await this.ensureAuthenticatedUsernameLoaded();

		const searchResults = await this.searchByMode(query);
		const numericMatches = await this.getNumericRepositoryMatches(query);

		if (!this.isLatestRequest(requestId)) {
			return;
		}

		const unique = new Map<string, GitHubIssueMetadata>();
		for (const match of numericMatches) {
			unique.set(match.url, match);
		}
		for (const result of this.rankResults(searchResults)) {
			unique.set(result.url, result);
		}

		const combined = Array.from(unique.values()).slice(0, MAX_COMBINED_RESULTS);
		this.renderResultsWithSelection(
			combined,
			`Search Results (${combined.length})`,
			preselectFirstResult
		);
	}

	private async getNumericRepositoryMatches(query: string): Promise<GitHubIssueMetadata[]> {
		if (!/^\d+$/.test(query)) {
			return [];
		}

		const scopedRepository = this.getRepoForCurrentScope();
		if (scopedRepository === undefined || scopedRepository === '') {
			return [];
		}

		const recent = await this.plugin.githubService.getRecentIssues(scopedRepository, 100);
		return recent.filter((item) => {
			return String(item.number).includes(query) && this.isResultAllowedByMode(item);
		});
	}

	private isResultAllowedByMode(item: GitHubIssueMetadata): boolean {
		if (this.searchMode === 'issues-only') {
			return item.isPR === false;
		}
		if (this.searchMode === 'prs-only') {
			return item.isPR === true;
		}
		return true;
	}

	private rankResults(results: GitHubIssueMetadata[]): GitHubIssueMetadata[] {
		const currentUsername = this.authenticatedUsername?.toLowerCase();
		return [...results].sort((left, right) => {
			const leftAssigned =
				currentUsername !== undefined &&
				left.assignees.some((assignee) => assignee.toLowerCase() === currentUsername)
					? 1
					: 0;
			const rightAssigned =
				currentUsername !== undefined &&
				right.assignees.some((assignee) => assignee.toLowerCase() === currentUsername)
					? 1
					: 0;
			if (leftAssigned !== rightAssigned) {
				return rightAssigned - leftAssigned;
			}
			return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
		});
	}

	private async searchByMode(query: string): Promise<GitHubIssueMetadata[]> {
		if (this.searchScope === 'my-repos') {
			if (this.searchMode === 'issues-only') {
				const issueResults = await this.plugin.githubService.searchIssuesInMyRepos(query);
				return issueResults.items;
			}
			if (this.searchMode === 'prs-only') {
				const prResults =
					await this.plugin.githubService.searchPullRequestsInMyRepos(query);
				return prResults.items;
			}

			const [issueResults, prResults] = await Promise.all([
				this.plugin.githubService.searchIssuesInMyRepos(query),
				this.plugin.githubService.searchPullRequestsInMyRepos(query)
			]);
			return [...issueResults.items, ...prResults.items];
		}

		const repo = this.getRepoForCurrentScope();
		if (repo === undefined || repo === '') {
			return [];
		}

		if (this.searchMode === 'issues-only') {
			const issueResults = await this.plugin.githubService.searchIssues(query, repo);
			return issueResults.items;
		}
		if (this.searchMode === 'prs-only') {
			const prResults = await this.plugin.githubService.searchPullRequests(query, repo);
			return prResults.items;
		}

		const [issueResults, prResults] = await Promise.all([
			this.plugin.githubService.searchIssues(query, repo),
			this.plugin.githubService.searchPullRequests(query, repo)
		]);
		return [...issueResults.items, ...prResults.items];
	}

	private showLoading(message: string): void {
		this.resultsContainer.empty();
		this.resultsContainer.createDiv({
			cls: 'tdc-gh-loading',
			text: message
		});
		this.updateEnterButtonLabel();
	}

	private showUrlPreview(url: string): void {
		this.resultsContainer.empty();
		this.currentResults = [];
		this.selectedIndex = -1;

		const preview = this.resultsContainer.createDiv({ cls: 'tdc-gh-url-preview' });
		preview.createSpan({ text: 'URL detected: ' });
		preview.createEl('a', {
			href: url,
			text: url,
			attr: { target: '_blank' }
		});
		preview.createDiv({
			cls: 'tdc-gh-hint',
			text: 'Press Enter to use this URL'
		});
		this.updateEnterButtonLabel();
	}

	private renderResults(results: GitHubIssueMetadata[], title: string): void {
		this.resultsContainer.empty();

		if (results.length === 0) {
			this.resultsContainer.createDiv({
				cls: 'tdc-gh-no-results',
				text: 'No results found'
			});
			return;
		}

		this.resultsContainer.createDiv({
			cls: 'tdc-gh-results-title',
			text: title
		});

		const list = this.resultsContainer.createDiv({ cls: 'tdc-gh-results-list' });

		for (const [index, item] of results.entries()) {
			const row = list.createDiv({ cls: 'tdc-gh-result-item' });

			row.addEventListener('click', () => {
				this.selectedIndex = index;
				this.updateEnterButtonLabel();
				if (this.selectionLockUntilCleared) {
					this.lockSelection(item);
					return;
				}
				this.selectCurrent();
			});

			const icon = row.createSpan({ cls: 'tdc-gh-result-icon' });
			appendSvgIcon(icon, item.isPR ? PR_ICON : ISSUE_ICON);

			row.createSpan({
				cls: 'tdc-gh-result-number',
				text: `#${item.number}`
			});

			row.createSpan({
				cls: 'tdc-gh-result-title',
				text: truncateText(item.title, TITLE_TRUNCATION_LENGTH)
			});

			row.createSpan({
				cls: `tdc-gh-result-state tdc-gh-state-${getStateClass(item)}`,
				text: getStateText(item)
			});

			if (item.repository !== '') {
				row.createSpan({
					cls: 'tdc-gh-result-repo',
					text: item.repository
				});
			}
		}
	}

	private lockSelection(selection: GitHubIssueMetadata): void {
		this.lockedSelection = selection;
		this.searchInput.value = `#${selection.number} ${selection.title}`;
		this.renderLockedSelection();
		this.updateEnterButtonLabel();
	}

	private renderLockedSelection(): void {
		if (this.lockedSelection === undefined) {
			return;
		}

		this.currentResults = [this.lockedSelection];
		this.renderResults([this.lockedSelection], this.getSelectedResultsTitle());
		this.selectedIndex = 0;
		const firstItem = this.getResultItems()[0];
		this.addSelectionClass(firstItem);
		this.updateEnterButtonLabel();
	}

	private renderResultsWithSelection(
		results: GitHubIssueMetadata[],
		title: string,
		preselectFirstResult: boolean
	): void {
		this.currentResults = results;
		this.renderResults(results, title);
		this.setInitialSelection(results.length > 0, preselectFirstResult);
		this.updateEnterButtonLabel();
	}

	private setInitialSelection(hasResults: boolean, preselectFirstResult: boolean): void {
		if (!hasResults || !preselectFirstResult) {
			this.selectedIndex = -1;
			return;
		}

		this.selectedIndex = 0;
		const firstItem = this.getResultItems()[0];
		this.addSelectionClass(firstItem);
	}

	private getResultItems(): NodeListOf<Element> {
		return this.resultsContainer.querySelectorAll('.tdc-gh-result-item');
	}

	private addSelectionClass(item: Element | undefined): void {
		if (item === undefined) {
			return;
		}
		item.addClass('tdc-gh-selected');
	}

	private removeSelectionClass(item: Element | undefined): void {
		if (item === undefined) {
			return;
		}
		item.removeClass('tdc-gh-selected');
	}

	private goBack(): void {
		if (this.hasResolved) {
			return;
		}

		this.hasResolved = true;
		this.close();
		this.onBack?.();
	}

	private skipSelection(): void {
		this.finishSelection(undefined);
	}

	private cancelSelection(): void {
		if (this.hasResolved) {
			return;
		}

		this.hasResolved = true;
		this.close();
		this.onCancel?.();
	}

	private finishSelection(url: string | undefined, metadata?: GitHubIssueMetadata): void {
		if (this.hasResolved) {
			return;
		}

		this.hasResolved = true;
		this.close();
		this.onSelect(url, metadata);
	}

	private nextRequestId(): number {
		this.activeRequestId += 1;
		return this.activeRequestId;
	}

	private isLatestRequest(requestId: number): boolean {
		return requestId === this.activeRequestId;
	}

	private parseSearchScope(value: string): GitHubSearchScope {
		if (
			value === 'linked-dashboard' ||
			value === 'linked-issue' ||
			value === 'my-repos' ||
			value === OTHER_REPOSITORY_SCOPE
		) {
			return value;
		}
		return this.scopeOptions[0]?.value ?? 'my-repos';
	}

	private getModalTitle(): string {
		if (this.searchMode === 'issues-only') {
			return 'GitHub Issue (optional)';
		}
		if (this.searchMode === 'prs-only') {
			return 'GitHub PR (optional)';
		}
		return 'GitHub Issue/PR (optional)';
	}

	private getSearchPlaceholder(): string {
		if (this.searchMode === 'issues-only') {
			return 'Search issues or paste URL...';
		}
		if (this.searchMode === 'prs-only') {
			return 'Search pull requests or paste URL...';
		}
		return 'Search issues or paste URL...';
	}

	private getSelectedResultsTitle(): string {
		if (this.searchMode === 'issues-only') {
			return 'Selected GitHub Issue';
		}
		if (this.searchMode === 'prs-only') {
			return 'Selected GitHub PR';
		}
		return 'Selected GitHub Issue/PR';
	}

	private hasEnterSelectableTarget(): boolean {
		const query = this.searchInput.value.trim();
		if (this.isGitHubUrl(query)) {
			return true;
		}
		if (this.selectionLockUntilCleared && this.lockedSelection !== undefined) {
			return true;
		}
		return this.selectedIndex >= 0 && this.selectedIndex < this.currentResults.length;
	}

	private updateEnterButtonLabel(): void {
		if (this.enterButton === undefined) {
			return;
		}

		const nextLabel =
			this.enterSkipsWithoutSelection && !this.hasEnterSelectableTarget()
				? this.enterSkipLabel
				: this.confirmButtonLabel;

		this.enterButton.empty();
		this.enterButton.appendText(`${nextLabel} `);
		this.enterButton.createEl('kbd', { text: '↵' });
	}

	private buildScopeOptions(): ScopeOption[] {
		const options: ScopeOption[] = [];
		const issueRepo = this.issueLinkedRepository;
		const dashboardRepo = this.dashboardLinkedRepository;

		if (issueRepo !== undefined && issueRepo !== '') {
			options.push({
				value: 'linked-issue',
				label: `Issue linked repository (${issueRepo})`
			});
		}

		if (dashboardRepo !== undefined && dashboardRepo !== '' && dashboardRepo !== issueRepo) {
			options.push({
				value: 'linked-dashboard',
				label: `Dashboard linked repository (${dashboardRepo})`
			});
		}

		options.push({ value: 'my-repos', label: 'My repositories' });
		options.push({ value: OTHER_REPOSITORY_SCOPE, label: 'Other repository' });

		return options;
	}

	private getRepoForCurrentScope(): string | undefined {
		if (this.searchScope === 'linked-issue') {
			return this.issueLinkedRepository;
		}
		if (this.searchScope === 'linked-dashboard') {
			return this.dashboardLinkedRepository;
		}
		if (this.searchScope === OTHER_REPOSITORY_SCOPE) {
			return this.selectedOtherRepository;
		}
		return undefined;
	}

	onClose(): void {
		if (this.searchTimeout !== undefined) {
			clearTimeout(this.searchTimeout);
			this.searchTimeout = undefined;
		}
		if (!this.hasResolved) {
			this.hasResolved = true;
			this.onCancel?.();
		}
		this.contentEl.empty();
	}
}
