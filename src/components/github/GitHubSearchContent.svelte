<script lang="ts">
  import type TasksDashboardPlugin from '../../../main';
  import type {
    DashboardConfig,
    GitHubIssueMetadata,
    GitHubRepository,
    GitHubSearchScope
  } from '../../types';
  import { getStateClass, getStateText, truncateText } from '../../utils/github-helpers';
  import Icon from '../Icon.svelte';

  type GitHubSearchMode = 'issues-and-prs' | 'issues-only' | 'prs-only';

  export interface GitHubSearchModalLinkedRepositories {
    issueRepository?: string;
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

  export interface ScopeOption {
    value: string;
    scope: GitHubSearchScope;
    label: string;
    repository?: string;
  }

  interface Props {
    plugin: TasksDashboardPlugin;
    dashboard: DashboardConfig;
    onselect: (url: string | undefined, metadata?: GitHubIssueMetadata) => void;
    linkedRepositories?: GitHubSearchModalLinkedRepositories;
    oncancel?: () => void;
    onback?: () => void;
  }

  const SEARCH_DEBOUNCE_MS = 300;
  const MAX_COMBINED_RESULTS = 20;
  const RECENT_ISSUES_LIMIT = 20;
  const TITLE_TRUNCATION_LENGTH = 50;
  const OTHER_REPOSITORY_SCOPE: GitHubSearchScope = 'other-repo';

  let { plugin, dashboard, onselect, linkedRepositories, oncancel, onback }: Props = $props();

  // Resolve config once from linkedRepositories (stable for component lifetime)
  function resolveConfig() {
    const linked = linkedRepositories;
    const skip = linked?.skipButtonLabel ?? 'Cancel';
    return {
      issueLinkedRepository: linked?.issueRepository,
      dashboardLinkedRepositories: (dashboard.githubRepos ?? []).filter((repo: string) => repo !== ''),
      showBackButton: linked?.showBackButton ?? false,
      skipButtonLabel: skip,
      confirmButtonLabel: linked?.confirmButtonLabel ?? 'Select',
      selectionLockUntilCleared: linked?.selectionLockUntilCleared ?? false,
      searchMode: (linked?.searchMode ?? 'issues-and-prs') as GitHubSearchMode,
      enterSkipsWithoutSelection: linked?.enterSkipsWithoutSelection ?? false,
      separateSkipAndCancelButtons: linked?.separateSkipAndCancelButtons ?? false,
      enterSkipLabel: linked?.enterSkipLabel ?? skip,
      showSkipButton: linked?.showSkipButton ?? true,
      resolvedOnCancel: linked?.onCancel ?? oncancel,
      resolvedOnBack: linked?.onBack ?? onback
    };
  }
  const config = resolveConfig();
  const {
    issueLinkedRepository,
    dashboardLinkedRepositories,
    showBackButton,
    skipButtonLabel,
    confirmButtonLabel,
    selectionLockUntilCleared,
    searchMode,
    enterSkipsWithoutSelection,
    separateSkipAndCancelButtons,
    enterSkipLabel,
    showSkipButton,
    resolvedOnCancel,
    resolvedOnBack
  } = config;

  // Build scope options
  const scopeOptions: ScopeOption[] = buildScopeOptions();
  const initialOption = scopeOptions[0];

  // Reactive state
  let searchQuery: string = $state('');
  let searchScope: GitHubSearchScope = $state(initialOption.scope);
  let selectedScopeRepository: string | undefined = $state(initialOption.repository);
  let selectedScopeValue: string = $state(initialOption.value);
  let selectedIndex: number = $state(-1);
  let currentResults: GitHubIssueMetadata[] = $state.raw([]);
  let isLoading: boolean = $state(false);
  let loadingMessage: string = $state('');
  let lockedSelection: GitHubIssueMetadata | undefined = $state.raw(undefined);
  let authenticatedUsername: string | undefined = $state(undefined);
  let userRepositories: GitHubRepository[] | undefined = $state.raw(undefined);
  let selectedOtherRepository: string | undefined = $state(undefined);
  let hasResolved: boolean = $state(false);
  let urlPreview: string | undefined = $state(undefined);
  let resultsTitle: string = $state('');
  let noResults: boolean = $state(false);

  let searchTimeout: ReturnType<typeof setTimeout> | undefined;
  let activeRequestId = 0;
  let authenticatedUsernamePromise: Promise<void> | undefined;
  let userRepositoriesPromise: Promise<void> | undefined;
  let searchInputElement: HTMLInputElement | undefined = $state(undefined);

  let showOtherRepositorySelector: boolean = $derived(searchScope === OTHER_REPOSITORY_SCOPE);

  let otherRepositoryOptions = $derived.by((): Array<{ value: string; label: string }> => {
    if (userRepositories === undefined) {
      return [{ value: '', label: 'Loading repositories...' }];
    }
    if (userRepositories.length === 0) {
      return [{ value: '', label: 'No repositories available' }];
    }
    return userRepositories.map((repo) => ({ value: repo.fullName, label: repo.fullName }));
  });

  let enterButtonLabel = $derived.by((): string => {
    if (enterSkipsWithoutSelection && !hasEnterSelectableTarget()) {
      return enterSkipLabel;
    }
    return confirmButtonLabel;
  });

  function hasEnterSelectableTarget(): boolean {
    if (urlPreview !== undefined) {
      return true;
    }
    if (selectionLockUntilCleared && lockedSelection !== undefined) {
      return true;
    }
    return selectedIndex >= 0 && selectedIndex < currentResults.length;
  }

  function buildScopeOptions(): ScopeOption[] {
    const options: ScopeOption[] = [];
    const issueRepo = issueLinkedRepository;

    if (issueRepo !== undefined && issueRepo !== '') {
      options.push({
        value: 'linked-issue',
        scope: 'linked-issue',
        label: `Issue linked repository (${issueRepo})`,
        repository: issueRepo
      });
    }

    for (const dashboardRepo of dashboardLinkedRepositories) {
      if (dashboardRepo === issueRepo) {
        continue;
      }
      const optionValue =
        dashboardLinkedRepositories.length > 1
          ? `linked-dashboard:${dashboardRepo}`
          : 'linked-dashboard';
      options.push({
        value: optionValue,
        scope: 'linked-dashboard',
        label: `Dashboard repository (${dashboardRepo})`,
        repository: dashboardRepo
      });
    }

    options.push({
      value: 'my-repos',
      scope: 'my-repos',
      label: 'My repositories'
    });
    options.push({
      value: OTHER_REPOSITORY_SCOPE,
      scope: OTHER_REPOSITORY_SCOPE,
      label: 'Other repository'
    });

    return options;
  }

  function getModalTitle(): string {
    if (searchMode === 'issues-only') {
      return 'GitHub Issue (optional)';
    }
    if (searchMode === 'prs-only') {
      return 'GitHub PR (optional)';
    }
    return 'GitHub Issue/PR (optional)';
  }

  function getSearchPlaceholder(): string {
    if (searchMode === 'issues-only') {
      return 'Search issues or paste URL...';
    }
    if (searchMode === 'prs-only') {
      return 'Search pull requests or paste URL...';
    }
    return 'Search issues or paste URL...';
  }

  function getSelectedResultsTitle(): string {
    if (searchMode === 'issues-only') {
      return 'Selected GitHub Issue';
    }
    if (searchMode === 'prs-only') {
      return 'Selected GitHub PR';
    }
    return 'Selected GitHub Issue/PR';
  }

  function getRepoForCurrentScope(): string | undefined {
    if (searchScope === 'linked-issue') {
      return selectedScopeRepository ?? issueLinkedRepository;
    }
    if (searchScope === 'linked-dashboard') {
      return selectedScopeRepository ?? dashboardLinkedRepositories[0];
    }
    if (searchScope === OTHER_REPOSITORY_SCOPE) {
      return selectedOtherRepository;
    }
    return undefined;
  }

  function isGitHubUrl(text: string): boolean {
    return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/\d+$/.test(text.trim());
  }

  function nextRequestId(): number {
    activeRequestId += 1;
    return activeRequestId;
  }

  function isLatestRequest(requestId: number): boolean {
    return requestId === activeRequestId;
  }

  function parseScopeOptionBySelectValue(value: string): ScopeOption | undefined {
    return scopeOptions.find((option) => option.value === value);
  }

  function isResultAllowedByMode(item: GitHubIssueMetadata): boolean {
    if (searchMode === 'issues-only') {
      return item.isPR === false;
    }
    if (searchMode === 'prs-only') {
      return item.isPR === true;
    }
    return true;
  }

  function rankResults(results: GitHubIssueMetadata[]): GitHubIssueMetadata[] {
    const currentUsername = authenticatedUsername?.toLowerCase();
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

  async function loadAuthenticatedUsername(): Promise<void> {
    authenticatedUsername = await plugin.githubService.getAuthenticatedUser();
  }

  async function ensureAuthenticatedUsernameLoaded(): Promise<void> {
    if (plugin.githubService.isAuthenticated() === false) {
      return;
    }
    if (authenticatedUsername !== undefined) {
      return;
    }
    if (authenticatedUsernamePromise === undefined) {
      authenticatedUsernamePromise = loadAuthenticatedUsername().finally(() => {
        authenticatedUsernamePromise = undefined;
      });
    }
    await authenticatedUsernamePromise;
  }

  async function loadUserRepositories(): Promise<void> {
    userRepositories = await plugin.githubService.getUserRepositories();
    if (userRepositories.length > 0) {
      const nextRepository = userRepositories[0].fullName;
      if (nextRepository !== '') {
        selectedOtherRepository = nextRepository;
      }
    }
  }

  async function ensureUserRepositoriesLoaded(): Promise<void> {
    if (userRepositories !== undefined) {
      return;
    }
    if (userRepositoriesPromise === undefined) {
      userRepositoriesPromise = loadUserRepositories().finally(() => {
        userRepositoriesPromise = undefined;
      });
    }
    await userRepositoriesPromise;
  }

  async function searchByMode(query: string): Promise<GitHubIssueMetadata[]> {
    if (searchScope === 'my-repos') {
      if (searchMode === 'issues-only') {
        const issueResults = await plugin.githubService.searchIssuesInMyRepos(query);
        return issueResults.items;
      }
      if (searchMode === 'prs-only') {
        const prResults = await plugin.githubService.searchPullRequestsInMyRepos(query);
        return prResults.items;
      }
      const [issueResults, prResults] = await Promise.all([
        plugin.githubService.searchIssuesInMyRepos(query),
        plugin.githubService.searchPullRequestsInMyRepos(query)
      ]);
      return [...issueResults.items, ...prResults.items];
    }

    const repo = getRepoForCurrentScope();
    if (repo === undefined || repo === '') {
      return [];
    }

    if (searchMode === 'issues-only') {
      const issueResults = await plugin.githubService.searchIssues(query, repo);
      return issueResults.items;
    }
    if (searchMode === 'prs-only') {
      const prResults = await plugin.githubService.searchPullRequests(query, repo);
      return prResults.items;
    }

    const [issueResults, prResults] = await Promise.all([
      plugin.githubService.searchIssues(query, repo),
      plugin.githubService.searchPullRequests(query, repo)
    ]);
    return [...issueResults.items, ...prResults.items];
  }

  async function getNumericRepositoryMatches(query: string): Promise<GitHubIssueMetadata[]> {
    if (!/^\d+$/.test(query)) {
      return [];
    }
    const scopedRepository = getRepoForCurrentScope();
    if (scopedRepository === undefined || scopedRepository === '') {
      return [];
    }
    const recent = await plugin.githubService.getRecentIssues(scopedRepository, 100);
    return recent.filter((item) => {
      return String(item.number).includes(query) && isResultAllowedByMode(item);
    });
  }

  function showLoadingState(message: string): void {
    isLoading = true;
    loadingMessage = message;
    urlPreview = undefined;
    noResults = false;
  }

  function showUrlPreviewState(url: string): void {
    urlPreview = url;
    currentResults = [];
    selectedIndex = -1;
    isLoading = false;
    noResults = false;
  }

  function setResultsWithSelection(
    results: GitHubIssueMetadata[],
    title: string,
    preselectFirstResult: boolean
  ): void {
    currentResults = results;
    resultsTitle = title;
    isLoading = false;
    urlPreview = undefined;
    noResults = results.length === 0;

    if (!preselectFirstResult || results.length === 0) {
      selectedIndex = -1;
    } else {
      selectedIndex = 0;
    }
  }

  async function loadRecentIssues(requestId: number): Promise<void> {
    showLoadingState('Loading recent issues...');
    selectedIndex = -1;
    await ensureAuthenticatedUsernameLoaded();

    let results: GitHubIssueMetadata[] = [];
    if (searchScope === 'my-repos') {
      results = rankResults(await searchByMode('')).slice(0, RECENT_ISSUES_LIMIT);
    } else {
      const repo = getRepoForCurrentScope();
      if (repo === undefined || repo === '') {
        if (!isLatestRequest(requestId)) {
          return;
        }
        setResultsWithSelection([], 'Recent Issues', false);
        return;
      }
      const recentResults = await plugin.githubService.getRecentIssues(
        repo,
        RECENT_ISSUES_LIMIT * 3
      );
      results = rankResults(
        recentResults.filter((item) => isResultAllowedByMode(item))
      ).slice(0, RECENT_ISSUES_LIMIT);
    }

    if (!isLatestRequest(requestId)) {
      return;
    }

    setResultsWithSelection(results, 'Recent Issues', false);
  }

  async function performSearch(
    query: string,
    requestId: number,
    preselectFirstResult: boolean
  ): Promise<void> {
    showLoadingState('Searching...');
    selectedIndex = -1;
    await ensureAuthenticatedUsernameLoaded();

    const searchResults = await searchByMode(query);
    const numericMatches = await getNumericRepositoryMatches(query);

    if (!isLatestRequest(requestId)) {
      return;
    }

    const unique = new Map<string, GitHubIssueMetadata>();
    for (const match of numericMatches) {
      unique.set(match.url, match);
    }
    for (const result of rankResults(searchResults)) {
      unique.set(result.url, result);
    }

    const combined = Array.from(unique.values()).slice(0, MAX_COMBINED_RESULTS);
    setResultsWithSelection(combined, `Search Results (${combined.length})`, preselectFirstResult);
  }

  function handleSearchInput(trigger: 'typing' | 'scope' | 'repository'): void {
    if (searchTimeout !== undefined) {
      clearTimeout(searchTimeout);
    }

    const requestId = nextRequestId();
    const query = searchQuery.trim().replace(/^#/, '');

    if (selectionLockUntilCleared && lockedSelection !== undefined && query !== '') {
      renderLockedSelection();
      return;
    }

    if (selectionLockUntilCleared && lockedSelection !== undefined && query === '') {
      lockedSelection = undefined;
    }

    if (isGitHubUrl(query)) {
      showUrlPreviewState(query);
      return;
    }

    if (query === '') {
      void loadRecentIssues(requestId);
      return;
    }

    const preselectFirstResult = trigger === 'typing';

    searchTimeout = setTimeout(() => {
      void performSearch(query, requestId, preselectFirstResult);
    }, SEARCH_DEBOUNCE_MS);
  }

  function lockSelection(selection: GitHubIssueMetadata): void {
    lockedSelection = selection;
    searchQuery = `#${selection.number} ${selection.title}`;
    renderLockedSelection();
  }

  function renderLockedSelection(): void {
    if (lockedSelection === undefined) {
      return;
    }
    currentResults = [lockedSelection];
    resultsTitle = getSelectedResultsTitle();
    isLoading = false;
    urlPreview = undefined;
    noResults = false;
    selectedIndex = 0;
  }

  function moveSelection(delta: number): void {
    if (selectionLockUntilCleared && lockedSelection !== undefined) {
      return;
    }

    if (currentResults.length === 0) {
      return;
    }

    selectedIndex = Math.max(0, Math.min(currentResults.length - 1, selectedIndex + delta));
  }

  function selectCurrent(): void {
    const query = searchQuery.trim();

    if (isGitHubUrl(query)) {
      finishSelection(query);
      return;
    }

    if (selectionLockUntilCleared && lockedSelection !== undefined) {
      finishSelection(lockedSelection.url, lockedSelection);
      return;
    }

    if (selectedIndex >= 0 && selectedIndex < currentResults.length) {
      const selected = currentResults[selectedIndex];
      if (selectionLockUntilCleared) {
        lockSelection(selected);
        return;
      }
      finishSelection(selected.url, selected);
      return;
    }

    if (enterSkipsWithoutSelection) {
      skipSelection();
      return;
    }

    finishSelection(undefined);
  }

  function goBack(): void {
    if (hasResolved) {
      return;
    }
    hasResolved = true;
    resolvedOnBack?.();
  }

  function skipSelection(): void {
    finishSelection(undefined);
  }

  function cancelSelection(): void {
    if (hasResolved) {
      return;
    }
    hasResolved = true;
    resolvedOnCancel?.();
  }

  function finishSelection(url: string | undefined, metadata?: GitHubIssueMetadata): void {
    if (hasResolved) {
      return;
    }
    hasResolved = true;
    onselect(url, metadata);
  }

  function handleSearchScopeChange(): void {
    const selectedOption = parseScopeOptionBySelectValue(selectedScopeValue);
    searchScope = selectedOption?.scope ?? scopeOptions[0].scope;
    selectedScopeRepository = selectedOption?.repository;

    if (searchScope === OTHER_REPOSITORY_SCOPE) {
      void ensureUserRepositoriesLoaded().then(() => {
        handleSearchInput('scope');
      });
      return;
    }

    handleSearchInput('scope');
  }

  function handleOtherRepositoryChange(): void {
    handleSearchInput('repository');
  }

  function handleInputEvent(): void {
    handleSearchInput('typing');
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      event.stopPropagation();
      return;
    }

    const isNextKey = event.key === 'ArrowDown';
    if (isNextKey) {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    const isPreviousKey = event.key === 'ArrowUp';
    if (isPreviousKey) {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === 'Backspace' && showBackButton && resolvedOnBack !== undefined) {
      event.preventDefault();
      event.stopPropagation();
      goBack();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      if (!showSkipButton) {
        cancelSelection();
        return;
      }
      if (separateSkipAndCancelButtons) {
        cancelSelection();
        return;
      }
      skipSelection();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      selectCurrent();
    }
  }

  function handleResultItemClick(index: number, item: GitHubIssueMetadata): void {
    selectedIndex = index;
    if (selectionLockUntilCleared) {
      lockSelection(item);
      return;
    }
    selectCurrent();
  }

  function handleMouseBack(event: MouseEvent): void {
    if (event.button !== 3) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    goBack();
  }

  // Initialize on mount
  $effect(() => {
    void ensureAuthenticatedUsernameLoaded();
    void loadRecentIssues(nextRequestId());
    searchInputElement?.focus();
  });

  // Cleanup debounce on destroy
  $effect(() => {
    return () => {
      if (searchTimeout !== undefined) {
        clearTimeout(searchTimeout);
        searchTimeout = undefined;
      }
    };
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="tdc-gh-search-content"
  onmousedown={showBackButton && resolvedOnBack !== undefined ? handleMouseBack : undefined}
  onmouseup={showBackButton && resolvedOnBack !== undefined ? handleMouseBack : undefined}
  onauxclick={showBackButton && resolvedOnBack !== undefined ? handleMouseBack : undefined}
>
  <div class="tdc-prompt-title">{getModalTitle()}</div>

  <div class="tdc-gh-search-container">
    <input
      bind:this={searchInputElement}
      bind:value={searchQuery}
      type="text"
      class="tdc-prompt-input tdc-gh-search-input"
      placeholder={getSearchPlaceholder()}
      oninput={handleInputEvent}
      onkeydown={handleKeydown}
    />
  </div>

  <div class="tdc-gh-options">
    <label class="tdc-gh-scope-label">
      <span>Search scope</span>
      <select
        class="tdc-gh-scope-select"
        bind:value={selectedScopeValue}
        onchange={handleSearchScopeChange}
      >
        {#each scopeOptions as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </label>

    <label
      class="tdc-gh-scope-label"
      style:display={showOtherRepositorySelector ? '' : 'none'}
    >
      <span>Repository</span>
      <select
        class="tdc-gh-scope-select"
        bind:value={selectedOtherRepository}
        onchange={handleOtherRepositoryChange}
      >
        {#each otherRepositoryOptions as repoOption (repoOption.value)}
          <option value={repoOption.value}>{repoOption.label}</option>
        {/each}
      </select>
    </label>
  </div>

  <div class="tdc-gh-results">
    {#if isLoading}
      <div class="tdc-gh-loading">{loadingMessage}</div>
    {:else if urlPreview !== undefined}
      <div class="tdc-gh-url-preview">
        <span>URL detected: </span>
        <a href={urlPreview} target="_blank">{urlPreview}</a>
        <div class="tdc-gh-hint">Press Enter to use this URL</div>
      </div>
    {:else if noResults}
      <div class="tdc-gh-no-results">No results found</div>
    {:else if currentResults.length > 0}
      <div class="tdc-gh-results-title">{resultsTitle}</div>
      <div class="tdc-gh-results-list">
        {#each currentResults as item, index (item.url)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class={['tdc-gh-result-item', index === selectedIndex && 'tdc-gh-selected']}
            onclick={() => handleResultItemClick(index, item)}
          >
            <span class="tdc-gh-result-icon">
              <Icon name={item.isPR ? 'pr' : 'issue'} size={16} />
            </span>
            <span class="tdc-gh-result-number">#{item.number}</span>
            <span class="tdc-gh-result-title">{truncateText(item.title, TITLE_TRUNCATION_LENGTH)}</span>
            <span class={`tdc-gh-result-state tdc-gh-state-${getStateClass(item)}`}>{getStateText(item)}</span>
            {#if item.repository !== ''}
              <span class="tdc-gh-result-repo">{item.repository}</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="tdc-prompt-buttons">
    {#if showBackButton && resolvedOnBack !== undefined}
      <button class="tdc-prompt-btn tdc-prompt-btn-secondary" onclick={() => goBack()}>
        Back <kbd>&#x27F5;</kbd>
      </button>
    {/if}

    {#if separateSkipAndCancelButtons}
      {#if showSkipButton}
        <button class="tdc-prompt-btn tdc-prompt-btn-secondary" onclick={() => skipSelection()}>
          {skipButtonLabel}
        </button>
      {/if}
      <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={() => cancelSelection()}>
        Cancel <kbd>Esc</kbd>
      </button>
    {:else}
      {#if showSkipButton}
        <button class="tdc-prompt-btn tdc-prompt-btn-secondary" onclick={() => skipSelection()}>
          {skipButtonLabel} <kbd>Esc</kbd>
        </button>
      {/if}
    {/if}

    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={() => selectCurrent()}>
      {enterButtonLabel} <kbd>&#x21B5;</kbd>
    </button>
  </div>
</div>

<style>
.tdc-gh-search-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tdc-gh-search-container {
  margin-bottom: 12px;
}

.tdc-gh-search-input {
  width: 100%;
}

.tdc-gh-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.tdc-gh-scope-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: var(--text-muted);
}

.tdc-gh-scope-select {
  flex: 1;
  padding: 4px 8px;
  border-radius: var(--tdc-border-radius-sm);
  border: 1px solid var(--background-modifier-border);
  background: var(--background-primary);
  color: var(--text-normal);
  font-size: 0.9em;
  cursor: pointer;
}

.tdc-gh-scope-select:focus {
  border-color: var(--interactive-accent);
  outline: none;
}

.tdc-gh-results {
  max-height: 460px;
  overflow-y: auto;
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--tdc-border-radius);
  background: var(--background-primary);
}

.tdc-gh-results-title {
  font-size: 0.8em;
  font-weight: 500;
  color: var(--text-muted);
  padding: 8px 12px;
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
}

.tdc-gh-results-list {
  padding: 4px 0;
}

.tdc-gh-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: var(--tdc-transition-fast);
}

.tdc-gh-result-item:hover,
.tdc-gh-selected {
  background: var(--background-modifier-hover);
}

.tdc-gh-result-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.tdc-gh-result-icon :global(svg) {
  width: 16px;
  height: 16px;
}

.tdc-gh-result-number {
  font-weight: 600;
  color: var(--text-accent);
  flex-shrink: 0;
}

.tdc-gh-result-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tdc-gh-result-state {
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.tdc-gh-result-repo {
  font-size: 0.75em;
  color: var(--text-faint);
  font-family: monospace;
}

.tdc-gh-loading {
  padding: 12px;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
}

.tdc-gh-url-preview {
  padding: 16px;
  text-align: center;
}

.tdc-gh-url-preview a {
  color: var(--text-accent);
  word-break: break-all;
}

.tdc-gh-no-results {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
}

.tdc-gh-hint {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 0.85em;
}

</style>
