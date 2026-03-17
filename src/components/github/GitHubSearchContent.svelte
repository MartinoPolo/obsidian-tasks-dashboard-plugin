<script lang="ts">
  import type TasksDashboardPlugin from '../../../main';
  import type {
    DashboardConfig,
    GitHubIssueMetadata,
    GitHubRepository,
    GitHubSearchScope
  } from '../../types';
  import type { GitHubSearchModalLinkedRepositories } from '../../modals/GitHubSearchModal';
  import { attachAutofocus } from '../../lib/attach-autofocus';
  import GitHubSearchResultItem from './GitHubSearchResultItem.svelte';
  import GitHubSearchButtonBar from './GitHubSearchButtonBar.svelte';
  import {
    type ScopeOption,
    SEARCH_DEBOUNCE_MS,
    TITLE_TRUNCATION_LENGTH,
    OTHER_REPOSITORY_SCOPE,
    SEARCH_MODE_LABELS,
    resolveConfig,
    buildScopeOptions
  } from './github-search-config';
  import { isGitHubUrl, createSearchEngine } from './github-search-engine';
  import { createSearchDataLoaders } from './github-search-data-loaders';

  interface Props {
    plugin: TasksDashboardPlugin;
    dashboard: DashboardConfig;
    onselect: (url: string | undefined, metadata?: GitHubIssueMetadata, searchQuery?: string) => void;
    linkedRepositories?: GitHubSearchModalLinkedRepositories;
    oncancel?: () => void;
    onback?: () => void;
  }

  let { plugin, dashboard, onselect, linkedRepositories, oncancel, onback }: Props = $props();

  // Resolve config once from linkedRepositories (stable for component lifetime)
  // svelte-ignore state_referenced_locally
  const config = resolveConfig(dashboard, linkedRepositories, oncancel, onback);
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

  const scopeOptions = buildScopeOptions(issueLinkedRepository, dashboardLinkedRepositories);
  const initialOption = scopeOptions[0];
  const searchModeLabels = SEARCH_MODE_LABELS[searchMode];

  // svelte-ignore state_referenced_locally
  const dataLoaders = createSearchDataLoaders(plugin.githubService);

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
  let selectedOtherRepository: string | undefined = $state(undefined);
  let userRepositories: GitHubRepository[] | undefined = $state.raw(undefined);
  let hasResolved: boolean = $state(false);
  let urlPreview: string | undefined = $state(undefined);
  let resultsTitle: string = $state('');
  let noResults: boolean = $state(false);

  let searchTimeout: ReturnType<typeof setTimeout> | undefined;
  let activeRequestId = 0;

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

  // Create search engine with reactive scope callbacks
  // svelte-ignore state_referenced_locally
  const searchEngine = createSearchEngine({
    githubService: plugin.githubService,
    searchMode,
    getRepoForCurrentScope,
    isMyReposScope: () => searchScope === 'my-repos'
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

    try {
      await dataLoaders.ensureAuthenticatedUsernameLoaded();
      const searchResults = await searchEngine.loadRecentIssues(
        dataLoaders.getAuthenticatedUsername()
      );

      if (!isLatestRequest(requestId)) {
        return;
      }

      setResultsWithSelection(searchResults.results, searchResults.title, false);
    } catch {
      if (!isLatestRequest(requestId)) {
        return;
      }
      setResultsWithSelection([], 'Recent Issues', false);
      noResults = true;
    }
  }

  async function performSearch(
    query: string,
    requestId: number,
    preselectFirstResult: boolean
  ): Promise<void> {
    showLoadingState('Searching...');
    selectedIndex = -1;

    try {
      await dataLoaders.ensureAuthenticatedUsernameLoaded();
      const searchResults = await searchEngine.performSearch(
        query,
        dataLoaders.getAuthenticatedUsername()
      );

      if (!isLatestRequest(requestId)) {
        return;
      }

      setResultsWithSelection(
        searchResults.results,
        searchResults.title,
        preselectFirstResult
      );
    } catch {
      if (!isLatestRequest(requestId)) {
        return;
      }
      setResultsWithSelection([], 'Search Results (0)', false);
      noResults = true;
    }
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
    resultsTitle = searchModeLabels.selectedResultsTitle;
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
    const trimmedQuery = searchQuery.trim();
    onselect(url, metadata, trimmedQuery !== '' ? trimmedQuery : undefined);
  }

  function handleSearchScopeChange(): void {
    const selectedOption = parseScopeOptionBySelectValue(selectedScopeValue);
    searchScope = selectedOption?.scope ?? scopeOptions[0].scope;
    selectedScopeRepository = selectedOption?.repository;

    if (searchScope === OTHER_REPOSITORY_SCOPE) {
      void dataLoaders.ensureUserRepositoriesLoaded().then((repos) => {
        userRepositories = repos;
        if (repos.length > 0 && repos[0].fullName !== '') {
          selectedOtherRepository = repos[0].fullName;
        }
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

  const hasBackNavigation = showBackButton && resolvedOnBack !== undefined;

  // Initialize on mount
  $effect(() => {
    void dataLoaders.ensureAuthenticatedUsernameLoaded();
    void loadRecentIssues(nextRequestId());
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
  onmousedown={hasBackNavigation ? handleMouseBack : undefined}
  onmouseup={hasBackNavigation ? handleMouseBack : undefined}
  onauxclick={hasBackNavigation ? handleMouseBack : undefined}
>
  <div class="tdc-prompt-title">{searchModeLabels.modalTitle}</div>

  <div class="tdc-gh-search-container">
    <input
      bind:value={searchQuery}
      {@attach attachAutofocus()}
      type="text"
      class="tdc-prompt-input tdc-gh-search-input"
      placeholder={searchModeLabels.searchPlaceholder}
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
          <GitHubSearchResultItem
            {item}
            isSelected={index === selectedIndex}
            titleTruncationLength={TITLE_TRUNCATION_LENGTH}
            onclick={() => handleResultItemClick(index, item)}
          />
        {/each}
      </div>
    {/if}
  </div>

  <GitHubSearchButtonBar
    showBackButton={hasBackNavigation}
    {showSkipButton}
    {separateSkipAndCancelButtons}
    {skipButtonLabel}
    {enterButtonLabel}
    onback={() => goBack()}
    onskip={() => skipSelection()}
    oncancel={() => cancelSelection()}
    onconfirm={() => selectCurrent()}
  />
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
