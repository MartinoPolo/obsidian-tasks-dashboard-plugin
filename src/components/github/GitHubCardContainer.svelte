<script lang="ts">
  import type TasksDashboardPlugin from '../../../main';
  import type {
    DashboardConfig,
    GitHubDisplayMode,
    GitHubIssueMetadata,
    GitHubRepoMetadata
  } from '../../types';
  import { isGitHubRepoUrl, parseGitHubRepoName } from '../../utils/github-url';
  import { parseGitHubUrlInfo } from '../../utils/github';
  import GitHubCard from './GitHubCard.svelte';
  import GitHubRepoCard from './GitHubRepoCard.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    githubUrl: string;
    issueId?: string;
    dashboard?: DashboardConfig;
  }

  let { plugin, githubUrl, issueId, dashboard }: Props = $props();

  let metadata = $state.raw<GitHubIssueMetadata | GitHubRepoMetadata | undefined>(undefined);
  let isRepo = $state(false);
  let error = $state<string | undefined>(undefined);
  let isLoading = $state(true);
  let isAuthenticated = $derived(plugin.githubService.isAuthenticated());

  let displayMode: GitHubDisplayMode = $derived(plugin.settings.githubDisplayMode);

  let linkText = $derived.by(() => {
    const parsed = parseGitHubUrlInfo(githubUrl);
    if (parsed !== undefined) {
      const type = parsed.type === 'pr' ? 'PR' : 'Issue';
      return `GitHub ${type} #${parsed.number}`;
    }
    const repoMatch = githubUrl.match(/github\.com\/([^/]+\/[^/]+?)\/?$/);
    if (repoMatch !== null) {
      return repoMatch[1];
    }
    return 'GitHub Link';
  });

  let onunlink = $derived.by(() => {
    if (issueId === undefined || dashboard === undefined) {
      return undefined;
    }
    return (): void => {
      void plugin.issueManager.removeGitHubLink(dashboard!, issueId!, githubUrl);
    };
  });

  function clearCacheForUrl(): void {
    if (isRepo) {
      plugin.githubService.clearCache();
    } else {
      plugin.githubService.clearCacheForUrl(githubUrl);
    }
  }

  async function fetchMetadata(): Promise<void> {
    isLoading = true;
    error = undefined;

    try {
      if (isGitHubRepoUrl(githubUrl)) {
        isRepo = true;
        const parsed = parseGitHubRepoName(githubUrl);
        if (parsed === undefined) {
          metadata = undefined;
          return;
        }
        metadata = await plugin.githubService.getRepository(parsed.owner, parsed.repo);
      } else {
        isRepo = false;
        metadata = await plugin.githubService.getMetadataFromUrl(githubUrl);
      }
    } catch (fetchError) {
      error = fetchError instanceof Error ? fetchError.message : 'Failed to fetch GitHub data';
      metadata = undefined;
    } finally {
      isLoading = false;
    }
  }

  function handleRefresh(): void {
    clearCacheForUrl();
    void fetchMetadata();
  }

  $effect(() => {
    if (!isAuthenticated) {
      isLoading = false;
      return;
    }
    void fetchMetadata();
  });
</script>

{#if isLoading}
  <div class="tdc-gh-loading">
    <span>Loading GitHub data...</span>
  </div>
{:else if !isAuthenticated}
  <a class="tdc-gh-simple-link" href={githubUrl} target="_blank">{linkText}</a>
{:else if error !== undefined}
  <div class="tdc-gh-error">
    <span>{error}</span>
  </div>
{:else if metadata !== undefined && isRepo}
  <GitHubRepoCard
    metadata={metadata as GitHubRepoMetadata}
    {displayMode}
    onrefresh={handleRefresh}
    {onunlink}
  />
{:else if metadata !== undefined}
  <GitHubCard
    metadata={metadata as GitHubIssueMetadata}
    {displayMode}
    onrefresh={handleRefresh}
    {onunlink}
  />
{/if}

<style>
.tdc-gh-loading {
  padding: 12px;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
}

.tdc-gh-error {
  padding: 12px;
  color: var(--text-error);
  font-size: 0.9em;
}

.tdc-gh-simple-link {
  color: var(--text-accent);
}
</style>
