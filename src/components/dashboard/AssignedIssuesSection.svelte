<script lang="ts">
  import { Notice, TFile } from 'obsidian';
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig, GitHubIssueMetadata } from '../../types';
  import type { QuickCreateDefaults } from '../../modals/issue-creation-modal';
  import { openAssignedIssueNamePrompt } from '../../modals/issue-creation-modal';
  import { collectDashboardIssueIdSet } from '../../settings/dashboard-cleanup';
  import { getNextAvailableIssueColor } from '../../utils/issue-colors';
  import { createPlatformService } from '../../utils/platform';
  import { getLinkedRepositories } from '../../dashboard/dashboard-writer-helpers';
  import { parseSourceKeyValueLines } from '../../dashboard/dashboard-renderer-params';
  import ActionButton from '../ActionButton.svelte';
  import LoadingIndicator from '../LoadingIndicator.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    source: string;
  }

  let { plugin, source }: Props = $props();

  interface RepoResult {
    repoName: string;
    items: GitHubIssueMetadata[];
    totalCount: number;
  }

  let isLoading = $state(true);
  let errorMessage: string | undefined = $state(undefined);
  let repoResults: RepoResult[] = $state([]);
  let existingDashboardUrls = $state(new Set<string>());
  let summaryText = $state('Assigned issues');

  const DEFAULT_ASSIGNED_ISSUES_PER_REPO = 10;
  const assignedIssuesLimitByRepo = new Map<string, number>();

  let dashboardIdLine = $derived(
    parseSourceKeyValueLines(source).find((line) => line.key === 'dashboard')
  );
  let dashboardId = $derived(dashboardIdLine?.value);
  let dashboard = $derived.by(() => {
    if (dashboardId === undefined || dashboardId.trim() === '') {
      return undefined;
    }
    return plugin.settings.dashboards.find((item) => item.id === dashboardId);
  });

  let validationError = $derived.by(() => {
    if (dashboardId === undefined || dashboardId.trim() === '') {
      return 'Invalid assigned issues block: missing dashboard';
    }
    if (dashboard === undefined) {
      return 'Dashboard configuration not found.';
    }
    if (!dashboard.githubEnabled) {
      return 'Enable GitHub integration in dashboard settings to view assigned issues.';
    }
    if (!plugin.githubService.isAuthenticated()) {
      return 'Authenticate GitHub in plugin settings to view assigned issues.';
    }
    const repos = getLinkedRepositories(dashboard);
    if (repos.length === 0) {
      return 'Link a repository in dashboard settings to show assigned issues.';
    }
    return undefined;
  });

  let repos = $derived(dashboard !== undefined ? getLinkedRepositories(dashboard) : []);
  let isMultiRepo = $derived(repos.length > 1);

  const platformService = createPlatformService();
  let dashboardProjectFolder = $derived(dashboard?.projectFolder);
  let worktreeCreationAvailable = $derived(
    dashboardProjectFolder !== undefined &&
    dashboardProjectFolder !== '' &&
    platformService.isGitRepositoryFolder(dashboardProjectFolder)
  );

  function getRepoLimit(repoName: string): number {
    if (dashboardId === undefined) {
      return DEFAULT_ASSIGNED_ISSUES_PER_REPO;
    }
    const repoKey = `${dashboardId}:${repoName}`;
    return assignedIssuesLimitByRepo.get(repoKey) ?? DEFAULT_ASSIGNED_ISSUES_PER_REPO;
  }

  let isFetching = false;

  async function fetchAssignedIssues(cancelSignal: { cancelled: boolean }): Promise<void> {
    if (dashboard === undefined || dashboardId === undefined) {
      return;
    }

    if (isFetching) {
      return;
    }
    isFetching = true;

    isLoading = true;
    errorMessage = undefined;

    try {
      const results = await Promise.all(
        repos.map(async (repoName) => {
          const repoLimit = getRepoLimit(repoName);
          const result = await plugin.githubService.getAssignedIssues(repoName, repoLimit);
          return { repoName, items: result.items, totalCount: result.totalCount };
        })
      );

      if (cancelSignal.cancelled) {
        return;
      }

      repoResults = results;

      // Build set of existing dashboard issue URLs
      const urls = new Set<string>();
      try {
        const filename = dashboard.dashboardFilename || 'Dashboard.md';
        const dashboardPath = `${dashboard.rootPath}/${filename}`;
        const dashboardFile = plugin.app.vault.getAbstractFileByPath(dashboardPath);
        if (dashboardFile instanceof TFile) {
          const dashboardContent = await plugin.app.vault.read(dashboardFile);
          const githubLinkPattern = /github_link:\s*(\S+)/g;
          let match: RegExpExecArray | null;
          while ((match = githubLinkPattern.exec(dashboardContent)) !== null) {
            urls.add(match[1]);
          }
        }
      } catch {
        // ignore — proceed without filtering
      }

      if (cancelSignal.cancelled) {
        return;
      }

      existingDashboardUrls = urls;

      const totalLoaded = repoResults.reduce((sum, r) => sum + r.items.length, 0);
      const totalAvailable = repoResults.reduce((sum, r) => sum + r.totalCount, 0);
      summaryText = `Assigned Issues (${totalLoaded}/${totalAvailable} loaded)`;

      isLoading = false;
    } catch (error: unknown) {
      if (cancelSignal.cancelled) {
        return;
      }
      console.error('Tasks Dashboard: failed to fetch assigned issues', error);
      errorMessage = 'Failed to load assigned issues. Check your GitHub connection.';
      isLoading = false;
    } finally {
      isFetching = false;
    }
  }

  // Fetch on mount; cancel on unmount or re-run
  $effect(() => {
    const cancelSignal = { cancelled: false };

    if (validationError === undefined) {
      void fetchAssignedIssues(cancelSignal);
    } else {
      isLoading = false;
    }

    return () => {
      cancelSignal.cancelled = true;
    };
  });

  function handleAddIssue(issue: GitHubIssueMetadata): void {
    if (dashboard === undefined) {
      return;
    }
    openAssignedIssueNamePrompt(plugin.app, plugin, {
      dashboard,
      githubMetadata: issue,
      githubUrl: issue.url
    });
  }

  function handleWorktreeIssue(issue: GitHubIssueMetadata, sourceRepo: string): void {
    if (dashboard === undefined || dashboardProjectFolder === undefined) {
      return;
    }
    if (!worktreeCreationAvailable) {
      new Notice('Set dashboard project folder to a Git repository to enable worktree creation.');
      return;
    }
    void collectDashboardIssueIdSet(plugin.app, dashboard)
      .then((dashboardIssueIds) => {
        const nextColor = getNextAvailableIssueColor(
          plugin.settings.issueColors,
          dashboardIssueIds,
          plugin.settings.lastUsedColorIndex
        );
        const quickDefaults: QuickCreateDefaults = {
          priority: dashboard!.prioritiesEnabled === false ? 'low' : 'medium',
          color: nextColor,
          worktree: true,
          worktreeOriginFolder: dashboardProjectFolder!,
          worktreeBaseRepository: sourceRepo
        };
        openAssignedIssueNamePrompt(plugin.app, plugin, {
          dashboard: dashboard!,
          githubMetadata: issue,
          githubUrl: issue.url,
          quickCreateDefaults: quickDefaults
        });
      })
      .catch(() => {
        new Notice('Failed to load dashboard issues');
      });
  }

  function handleLoadMore(repoName: string): void {
    if (dashboardId === undefined) {
      return;
    }
    const repoKey = `${dashboardId}:${repoName}`;
    const currentLimit = getRepoLimit(repoName);
    const newLimit = currentLimit + DEFAULT_ASSIGNED_ISSUES_PER_REPO;
    assignedIssuesLimitByRepo.set(repoKey, newLimit);
    void fetchAssignedIssues({ cancelled: false });
  }

  function isLinkedToDashboard(issue: GitHubIssueMetadata): boolean {
    return existingDashboardUrls.has(issue.url);
  }

  function getUnlinkedIssues(issues: GitHubIssueMetadata[]): GitHubIssueMetadata[] {
    return issues.filter((issue) => !existingDashboardUrls.has(issue.url));
  }

  function getLinkedIssues(issues: GitHubIssueMetadata[]): GitHubIssueMetadata[] {
    return issues.filter((issue) => existingDashboardUrls.has(issue.url));
  }

  let totalLoaded = $derived(repoResults.reduce((sum, r) => sum + r.items.length, 0));
</script>

{#if validationError !== undefined}
  <div class="tdc-assigned-issues-message">{validationError}</div>
{:else}
  <details class="tdc-assigned-issues-details" open>
    <summary class="tdc-assigned-issues-summary">{summaryText}</summary>

    {#if isLoading}
      <div class="tdc-assigned-issues-loading">
        <span class="tdc-loading-spinner"></span>
        <span>Loading assigned issues…</span>
      </div>
    {:else if errorMessage !== undefined}
      <div class="tdc-assigned-issues-message">{errorMessage}</div>
    {:else if totalLoaded === 0}
      <div class="tdc-assigned-issues-message">No open assigned issues found.</div>
    {:else}
      <div class="tdc-assigned-issues-list">
        {#each repoResults as { repoName, items, totalCount } (repoName)}
          {#if totalCount > 0}
            {@const linkedIssues = getLinkedIssues(items)}
            {@const unlinkedIssues = getUnlinkedIssues(items)}
            <div class="tdc-assigned-issues-repo-section">
              {#if isMultiRepo}
                {@const shortName = repoName.includes('/') ? repoName.split('/')[1] : repoName}
                <div class="tdc-assigned-issues-repo-header">
                  {shortName} ({items.length}/{totalCount} loaded)
                </div>
              {/if}

              {#each unlinkedIssues as issue (issue.url)}
                <div class="tdc-assigned-issues-row">
                  <a
                    class="tdc-assigned-issues-link"
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onclick={(event) => event.stopPropagation()}
                  >
                    #{issue.number} {issue.title}
                  </a>
                  <div class="tdc-assigned-issues-actions">
                    <ActionButton
                      icon="plus"
                      label={`Add issue #${issue.number} to dashboard`}
                      class="tdc-btn-square tdc-assigned-issues-add-btn"
                      onclick={() => handleAddIssue(issue)}
                    />
                    <ActionButton
                      icon="worktree"
                      label={worktreeCreationAvailable
                        ? `Quick worktree from #${issue.number}`
                        : 'Set dashboard project folder to a Git repository to enable worktree creation'}
                      class={`tdc-btn-square tdc-assigned-issues-worktree-btn`}
                      faded={!worktreeCreationAvailable}
                      onclick={() => handleWorktreeIssue(issue, repoName)}
                    />
                  </div>
                </div>
              {/each}

              {#if linkedIssues.length > 0}
                <div class="tdc-assigned-issues-divider">In dashboard</div>
                {#each linkedIssues as issue (issue.url)}
                  <div class="tdc-assigned-issues-row">
                    <a
                      class="tdc-assigned-issues-link"
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onclick={(event) => event.stopPropagation()}
                    >
                      #{issue.number} {issue.title}
                    </a>
                  </div>
                {/each}
              {/if}

              {#if items.length < totalCount}
                <button
                  class="tdc-assigned-issues-load-more"
                  onclick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleLoadMore(repoName);
                  }}
                >
                  Load more ({items.length}/{totalCount} loaded)
                </button>
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </details>
{/if}

<style>
.tdc-assigned-issues-message {
  padding: 8px 0;
  color: var(--text-muted);
  font-size: 0.9em;
}

.tdc-assigned-issues-details {
  margin-top: 8px;
}

.tdc-assigned-issues-summary {
  cursor: pointer;
  font-weight: 600;
  padding: 4px 0;
}

.tdc-assigned-issues-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  color: var(--text-muted);
  font-size: 0.9em;
}

.tdc-loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--background-modifier-border);
  border-top-color: var(--text-accent);
  border-radius: 50%;
  animation: tdc-spin 0.6s linear infinite;
}

.tdc-assigned-issues-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.tdc-assigned-issues-link {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tdc-assigned-issues-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.tdc-assigned-issues-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  margin-bottom: 2px;
  font-size: 0.8em;
  color: var(--text-muted);
  font-style: italic;
}

.tdc-assigned-issues-divider::before,
.tdc-assigned-issues-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--background-modifier-border);
}

.tdc-assigned-issues-repo-section {
  margin-bottom: 4px;
}

.tdc-assigned-issues-repo-header {
  font-weight: 600;
  font-size: 0.85em;
  color: var(--text-normal);
  padding: 6px 0 2px;
  border-bottom: 1px solid var(--background-modifier-border);
  margin-top: 4px;
}

.tdc-assigned-issues-load-more {
  display: block;
  width: 100%;
  padding: 6px 12px;
  margin-top: 8px;
  font-size: 0.85em;
  color: var(--text-muted);
  background: var(--background-modifier-hover);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--tdc-border-radius);
  cursor: pointer;
  text-align: center;
  transition:
    background var(--tdc-transition-fast),
    color var(--tdc-transition-fast);
}

.tdc-assigned-issues-load-more:hover {
  background: var(--background-modifier-active-hover, var(--background-modifier-hover));
  color: var(--text-normal);
}
</style>
