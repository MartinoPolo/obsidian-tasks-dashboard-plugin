import { App, Modal } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, GitHubIssueMetadata, GitHubSearchScope } from '../types';
import { getStateClass, getStateText, truncateText } from '../utils/github-helpers';

type OnSelectCallback = (url: string | undefined, metadata?: GitHubIssueMetadata) => void;

export class GitHubSearchModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private onSelect: OnSelectCallback;
	private searchInput!: HTMLInputElement;
	private resultsContainer!: HTMLElement;
	private searchScopeSelect!: HTMLSelectElement;
	private searchScope: GitHubSearchScope;
	private selectedIndex = -1;
	private currentResults: GitHubIssueMetadata[] = [];
	private searchTimeout: ReturnType<typeof setTimeout> | undefined;
	private isSearching = false;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		onSelect: OnSelectCallback
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.onSelect = onSelect;
		this.searchScope = this.hasLinkedRepo() ? 'linked' : 'my-repos';
	}

	onOpen(): void {
		const { contentEl, modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal', 'tdc-github-search-modal');
		contentEl.empty();

		contentEl.createEl('div', {
			cls: 'tdc-prompt-title',
			text: 'GitHub Issue/PR (optional)'
		});

		const searchContainer = contentEl.createDiv({ cls: 'tdc-gh-search-container' });

		this.searchInput = searchContainer.createEl('input', {
			type: 'text',
			cls: 'tdc-prompt-input tdc-gh-search-input',
			attr: { placeholder: 'Search issues or paste URL...' }
		});

		const optionsContainer = contentEl.createDiv({ cls: 'tdc-gh-options' });

		const scopeLabel = optionsContainer.createEl('label', { cls: 'tdc-gh-scope-label' });
		scopeLabel.createSpan({ text: 'Search scope' });

		this.searchScopeSelect = scopeLabel.createEl('select', { cls: 'tdc-gh-scope-select' });

		if (this.hasLinkedRepo()) {
			this.searchScopeSelect.createEl('option', {
				value: 'linked',
				text: `Linked repository (${this.dashboard.githubRepo})`
			});
		}
		this.searchScopeSelect.createEl('option', {
			value: 'my-repos',
			text: 'My repositories'
		});
		this.searchScopeSelect.createEl('option', {
			value: 'all-github',
			text: 'All GitHub'
		});

		this.searchScopeSelect.value = this.searchScope;

		this.resultsContainer = contentEl.createDiv({ cls: 'tdc-gh-results' });

		const btnContainer = contentEl.createDiv({ cls: 'tdc-prompt-buttons' });

		const skipBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-secondary'
		});
		skipBtn.innerHTML = 'Skip <kbd>Esc</kbd>';
		skipBtn.addEventListener('click', () => {
			this.close();
			this.onSelect(undefined);
		});

		const selectBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-confirm'
		});
		selectBtn.innerHTML = 'Select <kbd>↵</kbd>';
		selectBtn.addEventListener('click', () => {
			this.selectCurrent();
		});

		this.setupEventListeners();
		this.searchInput.focus();

		void this.loadRecentIssues();
	}

	private setupEventListeners(): void {
		this.searchInput.addEventListener('input', () => {
			this.handleSearchInput();
		});

		this.searchInput.addEventListener('keydown', (e) => {
			this.handleKeydown(e);
		});

		this.searchScopeSelect.addEventListener('change', () => {
			this.searchScope = this.searchScopeSelect.value as GitHubSearchScope;
			this.handleSearchInput();
		});
	}

	private handleSearchInput(): void {
		if (this.searchTimeout !== undefined) {
			clearTimeout(this.searchTimeout);
		}

		const query = this.searchInput.value.trim();

		if (this.isGitHubUrl(query)) {
			this.showUrlPreview(query);
			return;
		}

		if (query === '') {
			void this.loadRecentIssues();
			return;
		}

		this.searchTimeout = setTimeout(() => {
			void this.performSearch(query);
		}, 300);
	}

	private handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			this.moveSelection(1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			this.moveSelection(-1);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			this.selectCurrent();
		} else if (e.key === 'Escape') {
			this.close();
			this.onSelect(undefined);
		}
	}

	private moveSelection(delta: number): void {
		const items = this.resultsContainer.querySelectorAll('.tdc-gh-result-item');
		if (items.length === 0) {
			return;
		}

		const previousItem = items[this.selectedIndex] as HTMLElement | undefined;
		previousItem?.removeClass('tdc-gh-selected');
		this.selectedIndex = Math.max(0, Math.min(items.length - 1, this.selectedIndex + delta));
		const currentItem = items[this.selectedIndex] as HTMLElement | undefined;
		currentItem?.addClass('tdc-gh-selected');
		currentItem?.scrollIntoView({ block: 'nearest' });
	}

	private selectCurrent(): void {
		const query = this.searchInput.value.trim();

		if (this.isGitHubUrl(query)) {
			this.close();
			this.onSelect(query);
			return;
		}

		if (this.selectedIndex >= 0 && this.selectedIndex < this.currentResults.length) {
			const selected = this.currentResults[this.selectedIndex];
			this.close();
			this.onSelect(selected.url, selected);
			return;
		}

		// No explicit selection + non-URL text = skip GitHub linking
		this.close();
		this.onSelect(undefined);
	}

	private isGitHubUrl(text: string): boolean {
		return /github\.com\/[^/]+\/[^/]+\/(issues|pull)\/\d+/.test(text);
	}

	private async loadRecentIssues(): Promise<void> {
		this.showLoading('Loading recent issues...');
		this.selectedIndex = -1;

		const repo = this.getRepoForCurrentScope();
		const results = await this.plugin.githubService.getRecentIssues(repo, 10);

		this.currentResults = results;
		this.renderResults(results, 'Recent Issues');

		if (results.length > 0) {
			this.selectedIndex = 0;
			this.resultsContainer.querySelector('.tdc-gh-result-item')?.addClass('tdc-gh-selected');
		}
	}

	private async performSearch(query: string): Promise<void> {
		if (this.isSearching) {
			return;
		}

		this.isSearching = true;
		this.showLoading('Searching...');
		this.selectedIndex = -1;

		try {
			let issueResults, prResults;

			if (this.searchScope === 'my-repos') {
				[issueResults, prResults] = await Promise.all([
					this.plugin.githubService.searchIssuesInMyRepos(query),
					this.plugin.githubService.searchPullRequestsInMyRepos(query)
				]);
			} else {
				const repo = this.getRepoForCurrentScope();
				[issueResults, prResults] = await Promise.all([
					this.plugin.githubService.searchIssues(query, repo),
					this.plugin.githubService.searchPullRequests(query, repo)
				]);
			}

			const combined = [...issueResults.items, ...prResults.items]
				.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
				.slice(0, 20);

			this.currentResults = combined;
			this.renderResults(combined, `Search Results (${combined.length})`);

			if (combined.length > 0) {
				this.selectedIndex = 0;
				this.resultsContainer.querySelector('.tdc-gh-result-item')?.addClass('tdc-gh-selected');
			}
		} finally {
			this.isSearching = false;
		}
	}

	private showLoading(message: string): void {
		this.resultsContainer.empty();
		this.resultsContainer.createDiv({
			cls: 'tdc-gh-loading',
			text: message
		});
	}

	private showUrlPreview(url: string): void {
		this.resultsContainer.empty();
		this.currentResults = [];

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
				this.selectCurrent();
			});

			row.addEventListener('mouseenter', () => {
				list.querySelectorAll('.tdc-gh-result-item').forEach((el) => {
					el.removeClass('tdc-gh-selected');
				});
				row.addClass('tdc-gh-selected');
				this.selectedIndex = index;
			});

			const icon = row.createSpan({ cls: 'tdc-gh-result-icon' });
			icon.innerHTML = item.isPR ? this.getPRIcon() : this.getIssueIcon();

			row.createSpan({
				cls: 'tdc-gh-result-number',
				text: `#${item.number}`
			});

			row.createSpan({
				cls: 'tdc-gh-result-title',
				text: truncateText(item.title, 50)
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

	private getIssueIcon(): string {
		return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
	}

	private getPRIcon(): string {
		return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>`;
	}

	private hasLinkedRepo(): boolean {
		return this.dashboard.githubRepo !== undefined && this.dashboard.githubRepo !== '';
	}

	private getRepoForCurrentScope(): string | undefined {
		if (this.searchScope === 'linked') {
			return this.dashboard.githubRepo;
		}
		return undefined;
	}

	onClose(): void {
		if (this.searchTimeout !== undefined) {
			clearTimeout(this.searchTimeout);
		}
		this.contentEl.empty();
	}
}
