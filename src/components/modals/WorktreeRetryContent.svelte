<script lang="ts">
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig } from '../../types';
  import { attachTooltip } from '../../lib/attach-tooltip';
  import { createPlatformService, type PlatformService, type WorktreeEntry } from '../../utils/platform';
  import { extractLastPathSegment } from '../../utils/path-utils';
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    dashboard: DashboardConfig;
    issueId: string;
    suggestedBranchName: string;
    worktreeOriginFolder: string | undefined;
    onclose: () => void;
  }

  let { plugin, dashboard, issueId, suggestedBranchName, worktreeOriginFolder, onclose }: Props = $props();

  const platformService: PlatformService = createPlatformService();

  // svelte-ignore state_referenced_locally
  let branchName: string = $state(suggestedBranchName);
  let hasError: boolean = $state(false);
  // svelte-ignore state_referenced_locally
  let selectedRepositoryFolder: string | undefined = $state(worktreeOriginFolder);
  let inputElement: HTMLInputElement | undefined = $state(undefined);

  $effect(() => {
    if (inputElement !== undefined) {
      inputElement.focus();
    }
  });

  function getAvailableRepositories(): string[] {
    const repositories: string[] = [];

    if (
      worktreeOriginFolder !== undefined &&
      worktreeOriginFolder.trim() !== '' &&
      platformService.isGitRepositoryFolder(worktreeOriginFolder)
    ) {
      repositories.push(worktreeOriginFolder);
    }

    const dashboardProjectFolder = dashboard.projectFolder;
    if (
      dashboardProjectFolder !== undefined &&
      dashboardProjectFolder.trim() !== '' &&
      platformService.isGitRepositoryFolder(dashboardProjectFolder) &&
      !repositories.includes(dashboardProjectFolder)
    ) {
      repositories.push(dashboardProjectFolder);
    }

    return repositories;
  }

  let availableRepositories = getAvailableRepositories();

  function getWorktreeEntries(): WorktreeEntry[] {
    if (selectedRepositoryFolder === undefined || selectedRepositoryFolder.trim() === '') {
      return [];
    }
    return platformService.listActiveWorktrees(selectedRepositoryFolder);
  }

  let worktreeEntries = $derived(getWorktreeEntries());

  function getDefaultBranch(): string | undefined {
    if (selectedRepositoryFolder === undefined) {
      return undefined;
    }
    return platformService.getDefaultBranch(selectedRepositoryFolder);
  }

  let defaultBranch = $derived(getDefaultBranch());

  function abbreviatePath(fullPath: string): string {
    const normalizedPath = fullPath.replace(/\\/g, '/');
    const segments = normalizedPath.split('/');
    if (segments.length <= 3) {
      return normalizedPath;
    }
    return `.../${segments.slice(-3).join('/')}`;
  }

  function assignWorktree(entry: WorktreeEntry): void {
    if (selectedRepositoryFolder === undefined) {
      return;
    }
    onclose();
    void plugin.issueManager.assignExistingWorktree(
      dashboard,
      issueId,
      entry.path,
      entry.branch,
      selectedRepositoryFolder
    );
  }

  function confirmCreation(): void {
    const trimmed = branchName.trim();
    if (trimmed === '') {
      hasError = true;
      inputElement?.focus();
      return;
    }
    onclose();
    void plugin.issueManager.retryWorktreeSetup(dashboard, issueId, trimmed);
  }

</script>

<ModalLayout title="Worktree Setup" onsubmit={confirmCreation}>
  {#snippet children()}
    {#if availableRepositories.length > 1}
      <div class="tdc-worktree-repo-selector">
        <div class="tdc-worktree-repo-selector-label">Repository</div>
        <select
          class="tdc-worktree-repo-select dropdown"
          bind:value={selectedRepositoryFolder}
        >
          {#each availableRepositories as repo (repo)}
            <option value={repo}>{extractLastPathSegment(repo)}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div class="tdc-worktree-list-container">
      {#if selectedRepositoryFolder === undefined || selectedRepositoryFolder.trim() === ''}
        <div class="tdc-worktree-list-empty">No repository selected</div>
      {:else if worktreeEntries.length === 0}
        <div class="tdc-worktree-list-empty">No active worktrees found</div>
      {:else}
        <div class="tdc-worktree-list-header">
          Active worktrees ({worktreeEntries.length})
          {#if defaultBranch !== undefined}
            <span
              class="tdc-worktree-base-branch-label"
              {@attach attachTooltip(`Default branch: ${defaultBranch}`)}
            >
              (base: {defaultBranch})
            </span>
          {/if}
        </div>
        <div class="tdc-worktree-list">
          {#each worktreeEntries as entry (entry.path)}
            {@const isAssignable = !entry.isBare}
            {@const branchText = entry.branch ?? (entry.isBare ? '(bare)' : '(detached)')}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class={['tdc-worktree-list-row', isAssignable && 'tdc-worktree-list-row-clickable']}
              onclick={isAssignable ? () => assignWorktree(entry) : undefined}
            >
              <div class="tdc-worktree-list-branch">{branchText}</div>
              <div
                class="tdc-worktree-list-path"
                {@attach attachTooltip(entry.path)}
              >
                {abbreviatePath(entry.path)}
              </div>
              {#if isAssignable}
                <button
                  class="tdc-worktree-list-use-btn"
                  onclick={(event) => { event.stopPropagation(); assignWorktree(entry); }}
                >
                  Use
                </button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="tdc-worktree-create-section">
      <div class="tdc-worktree-create-label">Create new worktree</div>
      <input
        type="text"
        class={['tdc-prompt-input', hasError && 'tdc-input-error']}
        placeholder="Branch name..."
        bind:value={branchName}
        bind:this={inputElement}
        oninput={() => { hasError = false; }}
        onkeydown={(event) => { if (event.key === 'Backspace') { event.stopPropagation(); } }}
      />
    </div>
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={onclose}>
      Cancel <kbd>Esc</kbd>
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={confirmCreation}>
      Create <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>
