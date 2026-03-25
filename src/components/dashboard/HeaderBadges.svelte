<script lang="ts">
  import type { IssueGitStatus } from '../../git-status/git-status-types';
  import {
    BRANCH_NAME_MAX_DISPLAY_LENGTH,
    BRANCH_STATUS_CSS_CLASS,
    BRANCH_STATUS_ICON,
    BRANCH_STATUS_TOOLTIP_PREFIX,
    ISSUE_STATE_ICON,
    ISSUE_STATE_CSS_CLASS,
    ISSUE_STATE_LABEL,
    PR_STATE_ICON,
    PR_STATE_CSS_CLASS,
    PR_STATE_LABEL
  } from '../../git-status/git-badge-maps';
  import { attachTooltip } from '../../lib/attach-tooltip';
  import GitBadge from '../GitBadge.svelte';
  import Icon from '../Icon.svelte';

  interface Props {
    gitStatus: IssueGitStatus | undefined;
    isBadgesLoading: boolean;
    shouldCompact: boolean;
    isSyncing: boolean;
    badgesElement: HTMLDivElement | undefined;
    oncontextmenu: (event: MouseEvent) => void;
    onsync: (() => void) | undefined;
  }

  let {
    gitStatus,
    isBadgesLoading,
    shouldCompact,
    isSyncing,
    badgesElement = $bindable(),
    oncontextmenu,
    onsync
  }: Props = $props();

  // Derive branch badge from git status
  let branchBadge = $derived.by(() => {
    if (gitStatus === undefined || gitStatus.branchName === undefined) {
      return undefined;
    }
    const displayName = gitStatus.branchName.length > BRANCH_NAME_MAX_DISPLAY_LENGTH
      ? gitStatus.branchName.slice(0, BRANCH_NAME_MAX_DISPLAY_LENGTH) + '\u2026'
      : gitStatus.branchName;
    const tooltipPrefix = BRANCH_STATUS_TOOLTIP_PREFIX[gitStatus.branchStatus];
    return {
      icon: BRANCH_STATUS_ICON[gitStatus.branchStatus],
      text: displayName,
      tooltip: `${tooltipPrefix}: ${gitStatus.branchName}`,
      class: BRANCH_STATUS_CSS_CLASS[gitStatus.branchStatus]
    };
  });

  let isBehindBase = $derived(
    gitStatus !== undefined &&
    gitStatus.behindBaseCount !== undefined &&
    gitStatus.behindBaseCount > 0
  );
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class={[
    'tdc-header-badges',
    isBadgesLoading && 'tdc-header-badges-loading',
    shouldCompact && 'tdc-badges-compact'
  ]}
  bind:this={badgesElement}
  {oncontextmenu}
>
  {#if gitStatus !== undefined}
    {#each gitStatus.linkedIssues as linkedIssue (linkedIssue.url)}
      {@const stateLabel = ISSUE_STATE_LABEL[linkedIssue.state]}
      <GitBadge
        type="issue"
        icon={ISSUE_STATE_ICON[linkedIssue.state]}
        text={stateLabel !== '' ? `#${linkedIssue.number} ${stateLabel}` : `#${linkedIssue.number}`}
        tooltip={`${linkedIssue.title} — ${linkedIssue.state}`}
        class={ISSUE_STATE_CSS_CLASS[linkedIssue.state]}
        href={linkedIssue.url}
      />
    {/each}

    {#if branchBadge !== undefined}
      <GitBadge
        type="branch"
        icon={branchBadge.icon}
        text={branchBadge.text}
        tooltip={branchBadge.tooltip}
        class={branchBadge.class}
      />
    {/if}

    {#if isBehindBase}
      {@const baseName = gitStatus.baseBranch ?? 'base'}
      <GitBadge
        type="sync"
        icon="sync"
        text={`${gitStatus.behindBaseCount} behind`}
        tooltip={`Branch is ${gitStatus.behindBaseCount} commit${gitStatus.behindBaseCount === 1 ? '' : 's'} behind ${baseName}`}
        class="tdc-git-badge-sync-behind"
      />
      {#if gitStatus.mergeConflict === true}
        <GitBadge
          type="sync"
          icon="alertTriangle"
          text="Conflicts"
          tooltip="Merge conflicts detected"
          class="tdc-git-badge-merge-conflict"
        />
      {/if}

      {#if onsync !== undefined}
        <button
          class={['tdc-sync-button', isSyncing && 'tdc-sync-spinning']}
          onclick={(event) => { event.stopPropagation(); onsync(); }}
          disabled={isSyncing}
          {@attach attachTooltip(isSyncing ? 'Syncing...' : 'Sync branch with base')}
        >
          <Icon name="sync" size={14} />
        </button>
      {/if}
    {/if}

    {#each gitStatus.linkedPullRequests as pr (pr.url)}
      <GitBadge
        type="pr"
        icon={PR_STATE_ICON[pr.state]}
        text={`#${pr.number} ${PR_STATE_LABEL[pr.state]}`}
        tooltip={`${pr.title} — ${pr.state}`}
        class={PR_STATE_CSS_CLASS[pr.state]}
        href={pr.url}
      />
    {/each}
  {/if}
</div>

<style>
.tdc-header-badges {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
}

.tdc-header-badges-loading {
  min-width: 60px;
}

.tdc-header-badges-loading::after {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid var(--text-muted);
  border-top-color: transparent;
  border-radius: 50%;
  animation: tdc-spin 0.6s linear infinite;
}

.tdc-badges-compact :global(.tdc-git-badge) {
  padding: 2px 4px;
}

.tdc-badges-compact :global(.tdc-git-badge > span) {
  display: none;
}

.tdc-sync-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--tdc-git-sync-behind) 40%, transparent);
  border-radius: 50%;
  background: color-mix(in srgb, var(--tdc-git-sync-behind) 20%, transparent);
  color: var(--tdc-git-sync-behind);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.tdc-sync-button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--tdc-git-sync-behind) 35%, transparent);
}

.tdc-sync-button:disabled {
  cursor: default;
  opacity: 0.7;
}

.tdc-sync-button :global(svg) {
  width: 14px;
  height: 14px;
}

.tdc-sync-spinning :global(svg) {
  animation: tdc-spin 0.8s linear infinite;
}
</style>
