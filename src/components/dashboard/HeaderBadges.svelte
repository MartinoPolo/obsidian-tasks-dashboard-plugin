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
  import GitBadge from '../GitBadge.svelte';

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
      <div class={['tdc-branch-sync-group', isBehindBase && 'tdc-branch-sync-connected']}>
        <GitBadge
          type="branch"
          icon={branchBadge.icon}
          text={branchBadge.text}
          tooltip={branchBadge.tooltip}
          class={branchBadge.class}
        />

        {#if isBehindBase}
          {@const baseName = gitStatus.baseBranch ?? 'base'}
          {@const hasConflicts = gitStatus.mergeConflict === true}
          {@const badgeClass = hasConflicts ? 'tdc-git-badge-merge-conflict' : 'tdc-git-badge-sync-behind'}
          {@const behindLabel = `${gitStatus.behindBaseCount} commit${gitStatus.behindBaseCount === 1 ? '' : 's'} behind ${baseName}`}
          {@const conflictSuffix = hasConflicts ? ' — merge conflicts detected' : ''}
          {@const clickHint = onsync !== undefined ? (isSyncing ? ' (syncing...)' : ' — click to sync') : ''}
          {@const tooltipText = `Branch is ${behindLabel}${conflictSuffix}${clickHint}`}
          <GitBadge
            type="sync"
            icon="sync"
            text={`${gitStatus.behindBaseCount} behind`}
            tooltip={tooltipText}
            class={badgeClass}
            secondaryIcon={hasConflicts ? 'alertTriangle' : undefined}
            onclick={onsync !== undefined ? onsync : undefined}
            spinning={isSyncing}
            disabled={isSyncing}
          />
        {/if}
      </div>
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

/* Branch + Sync connected pill */
.tdc-branch-sync-group {
  display: inline-flex;
  align-items: center;
}

.tdc-branch-sync-connected :global(.tdc-git-badge:first-child) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
}

.tdc-branch-sync-connected :global(.tdc-git-badge:last-child) {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-left: none;
}

</style>
