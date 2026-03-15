<script lang="ts">
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig, GitHubRepository } from '../../types';
  import { truncateDescription } from '../../utils/string-utils';

  interface Props {
    plugin: TasksDashboardPlugin;
    dashboard: DashboardConfig;
    onclose: () => void;
    onsave: (linkedRepos: string[]) => void;
  }

  let { plugin, dashboard, onclose, onsave }: Props = $props();

  // svelte-ignore state_referenced_locally
  let linkedRepos: Set<string> = $state(new Set(dashboard.githubRepos ?? []));
  let allRepositories: GitHubRepository[] = $state.raw([]);
  let searchQuery: string = $state('');
  let isLoading: boolean = $state(true);
  let loadError: string | undefined = $state(undefined);

  $effect(() => {
    void loadRepositories();
  });

  async function loadRepositories(): Promise<void> {
    if (!plugin.githubService.isAuthenticated()) {
      isLoading = false;
      loadError = 'Configure GitHub token in plugin settings to browse repositories.';
      return;
    }

    try {
      allRepositories = await plugin.githubService.getUserRepositories();
      isLoading = false;
    } catch {
      isLoading = false;
      loadError = 'Failed to load repositories. Check your GitHub connection.';
    }
  }

  let filteredRepositories = $derived.by(() => {
    const query = searchQuery.toLowerCase();
    if (query === '') {
      return allRepositories;
    }
    return allRepositories.filter((repo) => {
      const matchesName = repo.fullName.toLowerCase().includes(query);
      const matchesDescription = repo.description.toLowerCase().includes(query);
      return matchesName || matchesDescription;
    });
  });

  let linkedArray = $derived(Array.from(linkedRepos));

  function toggleRepo(repoFullName: string): void {
    const newSet = new Set(linkedRepos);
    if (newSet.has(repoFullName)) {
      newSet.delete(repoFullName);
    } else {
      newSet.add(repoFullName);
    }
    linkedRepos = newSet;
  }

  function unlinkRepo(repoFullName: string): void {
    const newSet = new Set(linkedRepos);
    newSet.delete(repoFullName);
    linkedRepos = newSet;
  }

  function saveAndClose(): void {
    onsave(Array.from(linkedRepos));
    onclose();
  }
</script>

<div class="tdc-repo-linker-modal">
  <h3>Link GitHub repositories</h3>

  <input
    type="text"
    class="tdc-repo-linker-search"
    placeholder="Search repositories..."
    bind:value={searchQuery}
  />

  <div class="tdc-repo-linker-section-label">Available repositories</div>

  <div class="tdc-repo-linker-available-list">
    {#if isLoading}
      <div class="tdc-repo-linker-loading">
        <span class="tdc-loading-spinner"></span>
        <span>Loading repositories...</span>
      </div>
    {:else if loadError !== undefined}
      <div class="tdc-repo-linker-message">{loadError}</div>
    {:else if filteredRepositories.length === 0 && allRepositories.length > 0}
      <div class="tdc-repo-linker-message">No repositories match your search.</div>
    {:else}
      {#each filteredRepositories as repo (repo.fullName)}
        {@const isLinked = linkedRepos.has(repo.fullName)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="tdc-repo-linker-available-row"
          onclick={(event) => { if (!(event.target instanceof HTMLInputElement)) { toggleRepo(repo.fullName); } }}
        >
          <input
            type="checkbox"
            checked={isLinked}
            onchange={() => toggleRepo(repo.fullName)}
          />
          <div class="tdc-repo-linker-repo-info">
            <div class="tdc-repo-suggestion-header">
              <span class="tdc-repo-suggestion-name">{repo.fullName}</span>
              <span class={['tdc-repo-badge', repo.isPrivate ? 'tdc-repo-badge-private' : 'tdc-repo-badge-public']}>
                {repo.isPrivate ? 'Private' : 'Public'}
              </span>
            </div>
            {#if repo.description !== ''}
              <div class="tdc-repo-suggestion-description">
                {truncateDescription(repo.description)}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <div class="tdc-repo-linker-section-label">Linked ({linkedArray.length})</div>

  <div class="tdc-repo-linker-linked-list">
    {#if linkedArray.length === 0}
      <div class="tdc-repo-linker-message">No repositories linked.</div>
    {:else}
      {#each linkedArray as repoName (repoName)}
        <div class="tdc-repo-linker-linked-row">
          <span>{repoName}</span>
          <button
            class="tdc-repo-linker-unlink-btn"
            aria-label={`Unlink ${repoName}`}
            onclick={() => unlinkRepo(repoName)}
          >
            &times;
          </button>
        </div>
      {/each}
    {/if}
  </div>

  <div class="tdc-repo-linker-buttons">
    <button class="mod-cta" onclick={saveAndClose}>Done</button>
  </div>
</div>
