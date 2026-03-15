<script lang="ts">
  import { tick } from 'svelte';
  import type TasksDashboardPlugin from '../../../main';
  import { setIssueCollapsed } from '../../dashboard/dashboard-issue-surface';
  import { HEADER_HOVER_TITLE_MIN_WIDTH } from '../../dashboard/dashboard-renderer-constants';
  import type {
  	ControlParams,
  	IssueActionDescriptor,
  	RuntimeIssueActionLayout
  } from '../../dashboard/dashboard-renderer-types';
  import { getLinkedRepositories } from '../../dashboard/dashboard-writer-helpers';
  import type {
  	BranchStatus,
  	IssueGitStatus,
  	IssueState,
  	PrState
  } from '../../git-status/git-status-types';
  import { attachResizeObserver } from '../../lib/attach-resize-observer';
  import { attachTooltip } from '../../lib/attach-tooltip';
  import { WorktreeRetryModal } from '../../modals/worktree-retry-modal';
  import type { DashboardConfig, IssueActionKey } from '../../types';
  import { extractLastPathSegment } from '../../utils/path-utils';
  import { createPlatformService } from '../../utils/platform';
  import ActionButton from '../ActionButton.svelte';
  import GitBadge from '../GitBadge.svelte';
  import Icon from '../Icon.svelte';
  import type { IconName } from '../icons/index';
  import IssueInfoPanel from './IssueInfoPanel.svelte';
  import OverflowPanel from './OverflowPanel.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    params: ControlParams;
    dashboard: DashboardConfig;
    actions: Map<IssueActionKey, IssueActionDescriptor>;
    layout: RuntimeIssueActionLayout;
    containerElement: HTMLElement;
    getRow2VisibleActionKeys: () => Set<IssueActionKey>;
  }

  let {
    plugin,
    params,
    dashboard,
    actions,
    layout,
    containerElement,
    getRow2VisibleActionKeys
  }: Props = $props();

  // State
  const getInitialCollapsed = () => plugin.settings.collapsedIssues[params.issue] === true;
  let isCollapsed = $state(getInitialCollapsed());
  let gitStatus = $state.raw<IssueGitStatus | undefined>(undefined);
  let gitStatusInfoLines: string[] = $state([]);
  let isInfoPanelOpen = $state(false);
  let isOverflowOpen = $state(false);
  let shouldCompact = $state(false);
  let isBadgesLoading = $state(false);
  let prAccentClass = $state('');

  // Element refs
  let headerElement: HTMLDivElement | undefined = $state(undefined);
  let linkElement: HTMLAnchorElement | undefined = $state(undefined);
  let badgesElement: HTMLDivElement | undefined = $state(undefined);
  let infoButtonElement: HTMLButtonElement | undefined = $state(undefined);
  let overflowButtonElement: HTMLElement | undefined = $state(undefined);
  let row1Buttons = $state(new Map<IssueActionKey, HTMLElement>());

  // Derived
  let isWorktreeIssue = $derived(params.worktree === true);
  let worktreeStatus = $derived(params.worktree_setup_state);
  let isPendingWorktreeSetup = $derived(worktreeStatus === 'pending');
  let isFailedWorktreeSetup = $derived(worktreeStatus === 'failed');
  let isSafeToDeleteWorktree = $derived(params.worktree_safe_delete === true);
  let worktreeStatusStateClass = $derived(
    isPendingWorktreeSetup ? 'pending'
    : isFailedWorktreeSetup ? 'failed'
    : isSafeToDeleteWorktree ? 'inactive'
    : 'active'
  );
  let worktreeStatusText = $derived(
    isPendingWorktreeSetup ? 'Pending worktree setup verification'
    : isFailedWorktreeSetup ? 'Worktree setup failed — retry available'
    : isSafeToDeleteWorktree ? 'Worktree safe to delete (merged/closed PR or deleted branch)'
    : 'Worktree active'
  );
  let isWorktreeClickable = $derived(
    isWorktreeIssue && (isFailedWorktreeSetup || worktreeStatus === undefined)
  );
  let isWorktreeActive = $derived(isWorktreeIssue && worktreeStatusStateClass === 'active');

  let issueFolderKey = $derived(`${dashboard.id}:${params.issue}`);
  let hasAssignedIssueFolder = $derived(
    Object.prototype.hasOwnProperty.call(plugin.settings.issueFolders, issueFolderKey)
  );
  let assignedIssueFolder = $derived.by(() => {
    if (!hasAssignedIssueFolder) {
      return undefined;
    }
    const candidate: unknown = plugin.settings.issueFolders[issueFolderKey];
    return typeof candidate === 'string' ? candidate : undefined;
  });

  // Git badge data maps
  const PR_STATE_ICON: Record<PrState, IconName> = {
    none: 'gitPrOpen',
    open: 'gitPrOpen',
    draft: 'gitPrDraft',
    merged: 'gitPrMerged',
    closed: 'gitPrClosed',
    'review-requested': 'gitPrOpen'
  };

  const PR_STATE_CSS_CLASS: Record<PrState, string> = {
    none: '',
    open: 'tdc-git-badge-open',
    draft: 'tdc-git-badge-draft',
    merged: 'tdc-git-badge-merged',
    closed: 'tdc-git-badge-closed',
    'review-requested': 'tdc-git-badge-review'
  };

  const PR_STATE_LABEL: Record<PrState, string> = {
    none: '',
    open: 'Open',
    draft: 'Draft',
    merged: 'Merged',
    closed: 'Closed',
    'review-requested': 'Review'
  };

  const ISSUE_STATE_ICON: Record<IssueState, IconName> = {
    open: 'gitIssueOpen',
    closed: 'gitIssueClosed',
    not_planned: 'gitIssueNotPlanned',
    unknown: 'gitIssueOpen'
  };

  const ISSUE_STATE_CSS_CLASS: Record<IssueState, string> = {
    open: 'tdc-git-badge-issue-open',
    closed: 'tdc-git-badge-issue-closed',
    not_planned: 'tdc-git-badge-issue-not-planned',
    unknown: ''
  };

  const ISSUE_STATE_LABEL: Record<IssueState, string> = {
    open: 'Open',
    closed: 'Closed',
    not_planned: 'Not Planned',
    unknown: ''
  };

  const BRANCH_STATUS_CSS_CLASS: Record<BranchStatus, string> = {
    active: 'tdc-git-badge-branch-active',
    local: 'tdc-git-badge-branch-local',
    'remote-gone': 'tdc-git-badge-branch-remote-gone',
    deleted: 'tdc-git-badge-branch-deleted',
    unknown: 'tdc-git-badge-branch-unknown'
  };

  const BRANCH_STATUS_TOOLTIP_PREFIX: Record<BranchStatus, string> = {
    active: 'Branch exists',
    local: 'Branch local only (not pushed)',
    'remote-gone': 'Remote branch deleted',
    deleted: 'Branch deleted',
    unknown: 'Branch status unknown'
  };

  const BRANCH_NAME_MAX_DISPLAY_LENGTH = 16;

  function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) {
      return 'just now';
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  const platformService = createPlatformService();
  const defaultBranchCache = new Map<string, string | undefined>();

  function getCachedDefaultBranch(originFolder: string): string | undefined {
    if (defaultBranchCache.has(originFolder)) {
      return defaultBranchCache.get(originFolder);
    }
    const result = platformService.getDefaultBranch(originFolder);
    defaultBranchCache.set(originFolder, result);
    return result;
  }

  function buildWorktreeLocationTooltip(
    originFolder: string | undefined,
    checkedOutBranch: string | undefined,
    storedBaseBranch?: string
  ): string {
    if (originFolder === undefined || originFolder.trim() === '') {
      return 'Worktree active';
    }
    const baseFolderName = extractLastPathSegment(originFolder);
    const baseBranch = storedBaseBranch ?? getCachedDefaultBranch(originFolder);
    const branchDisplay = checkedOutBranch ?? 'unknown';
    if (baseBranch !== undefined) {
      return `${baseFolderName}/${baseBranch} \u2192 ${branchDisplay}`;
    }
    return `${baseFolderName} \u2192 ${branchDisplay}`;
  }

  // Build info panel content
  let infoContent = $derived.by(() => {
    const githubLinksText = params.githubLinks.length > 0 ? params.githubLinks.join('\n') : 'None';
    const worktreeSummary = isWorktreeIssue
      ? [
          `branch: ${params.worktree_branch ?? 'n/a'}`,
          `origin: ${params.worktree_origin_folder ?? 'n/a'}`,
          `expected folder: ${params.worktree_expected_folder ?? 'n/a'}`,
          `setup state: ${params.worktree_setup_state ?? 'n/a'}`,
          `base repository: ${params.worktree_base_repository ?? 'n/a'}`,
          `base branch: ${params.worktree_base_branch ?? 'n/a'}`
        ].join('\n')
      : 'not a worktree issue';

    const sections: string[] = [
      `Dashboard: ${dashboard.id}\nIssue: ${params.issue}`,
      `Assigned folder: ${assignedIssueFolder ?? 'None'}`,
      `GitHub links:\n${githubLinksText}`,
      `Worktree:\n${worktreeSummary}`
    ];
    if (gitStatusInfoLines.length > 0) {
      sections.push(gitStatusInfoLines.join('\n'));
    } else {
      sections.push('Last refreshed: Not yet');
    }
    return sections.join('\n\n');
  });

  // Row1 visible action keys — filter hidden
  let row1ActionKeys = $derived(
    layout.row1.filter((key) => !layout.hidden.includes(key) && actions.has(key))
  );

  // getVisibleActionKeys for overflow panel
  function getVisibleActionKeys(): Set<IssueActionKey> {
    const visible = new Set<IssueActionKey>();
    for (const [key, button] of row1Buttons) {
      if (!button.classList.contains('tdc-row1-hidden-width')) {
        visible.add(key);
      }
    }
    const isCardCollapsed = containerElement.classList.contains('tdc-collapsed');
    if (!isCardCollapsed) {
      for (const row2Key of getRow2VisibleActionKeys()) {
        visible.add(row2Key);
      }
    }
    return visible;
  }

  // Row1 priority layout — hide buttons when title is truncated
  function applyRow1PriorityLayout(): void {
    for (const button of row1Buttons.values()) {
      button.classList.remove('tdc-row1-hidden-width');
    }

    const orderedVisibleKeys = layout.row1.filter((key) => row1Buttons.has(key));
    for (const key of [...orderedVisibleKeys].reverse()) {
      if (linkElement === undefined) {
        break;
      }
      const titleIsTruncated = linkElement.scrollWidth > linkElement.clientWidth;
      if (!titleIsTruncated) {
        break;
      }
      const actionButton = row1Buttons.get(key);
      if (actionButton === undefined) {
        continue;
      }
      actionButton.classList.add('tdc-row1-hidden-width');
    }
  }

  // Badge compaction — measure at non-compact size to decide if compaction is needed.
  // Uses tick() so Svelte applies shouldCompact=false to the DOM before measuring.
  let badgeCompactionPending = false;
  async function applyBadgeCompaction(): Promise<void> {
    if (badgesElement === undefined || headerElement === undefined || linkElement === undefined) {
      return;
    }
    if (badgeCompactionPending) {
      return;
    }
    badgeCompactionPending = true;

    // Remove compact to measure at full size
    shouldCompact = false;
    await tick();

    const headerOverflowing = headerElement.scrollWidth > headerElement.clientWidth;
    const titleTruncated = linkElement.scrollWidth > linkElement.clientWidth;
    shouldCompact = headerOverflowing || titleTruncated;
    badgeCompactionPending = false;
  }

  // Resize observer callback
  function handleResize(): void {
    applyRow1PriorityLayout();
    void applyBadgeCompaction();
  }

  // Toggle collapse
  function toggleCollapse(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const currentlyCollapsed = plugin.settings.collapsedIssues[params.issue] === true;
    const newCollapsed = !currentlyCollapsed;
    if (newCollapsed) {
      plugin.settings.collapsedIssues[params.issue] = true;
    } else {
      delete plugin.settings.collapsedIssues[params.issue];
    }
    void plugin.saveSettings();
    isCollapsed = newCollapsed;
    setIssueCollapsed(containerElement, newCollapsed);
  }

  // Toggle info panel
  function toggleInfoPanel(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    isInfoPanelOpen = !isInfoPanelOpen;
  }

  // Badge context menu (event delegation)
  function handleBadgesContextMenu(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest('.tdc-git-badge') === null) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    // Simple context menu — "Refresh"
    const dropdown = document.createElement('div');
    dropdown.className = 'tdc-sort-dropdown tdc-sort-dropdown-portal';
    document.body.appendChild(dropdown);

    const refreshItem = dropdown.createDiv({ cls: 'tdc-sort-dropdown-item', text: 'Refresh' });

    const removeDropdown = (): void => {
      document.removeEventListener('click', handleOutsideClick, true);
      document.removeEventListener('keydown', handleEscape, true);
      dropdown.remove();
    };

    refreshItem.addEventListener('click', (clickEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      removeDropdown();
      plugin.gitStatusService.invalidate(dashboard.id, params.issue);
      plugin.triggerDashboardRefresh();
    });

    const handleOutsideClick = (outsideEvent: MouseEvent): void => {
      const outsideTarget = outsideEvent.target;
      if (outsideTarget instanceof Node && dropdown.contains(outsideTarget)) {
        return;
      }
      removeDropdown();
    };

    const handleEscape = (keyEvent: KeyboardEvent): void => {
      if (keyEvent.key !== 'Escape') {
        return;
      }
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      removeDropdown();
    };

    const viewportPadding = 8;
    dropdown.style.left = `${Math.max(viewportPadding, event.clientX)}px`;
    dropdown.style.top = `${Math.max(viewportPadding, event.clientY)}px`;

    document.addEventListener('click', handleOutsideClick, true);
    document.addEventListener('keydown', handleEscape, true);
  }

  // Async fetch git status
  $effect(() => {
    let isDestroyed = false;

    if (isWorktreeIssue || params.githubLinks.length > 0) {
      isBadgesLoading = true;
      const linkedReposForInfo = getLinkedRepositories(dashboard);
      void plugin.gitStatusService
        .getIssueGitStatus({
          branchName: params.worktree_branch,
          originFolder: params.worktree_origin_folder,
          baseBranch: params.worktree_base_branch,
          githubLinks: params.githubLinks,
          dashboardId: dashboard.id,
          issueId: params.issue,
          linkedRepos: linkedReposForInfo
        })
        .then((result) => {
          if (isDestroyed) {
            return;
          }
          gitStatus = result;
          isBadgesLoading = false;

          // Build info lines
          const lines: string[] = [];
          if (result.branchName !== undefined) {
            lines.push(`Branch: ${result.branchName} (${result.branchStatus})`);
            if (result.baseBranch !== undefined) {
              lines.push(`Base branch: ${result.baseBranch}`);
            }
          }
          if (result.linkedPullRequests.length > 0) {
            const prLines = result.linkedPullRequests.map(
              (pr) => `  #${pr.number} ${pr.state} — ${pr.title}`
            );
            lines.push(`PRs:\n${prLines.join('\n')}`);
          }
          lines.push(`Last refreshed: ${formatRelativeTime(result.fetchedAt)}`);
          gitStatusInfoLines = lines;

          // PR accent class
          if (result.aggregatePrState !== 'none') {
            prAccentClass = `tdc-pr-accent-${result.aggregatePrState}`;
          }

          // Apply badge compaction after render
          requestAnimationFrame(() => {
            void applyBadgeCompaction();
          });
        })
        .catch(() => {
          if (isDestroyed) {
            return;
          }
          gitStatusInfoLines = ['Last refreshed: Error'];
          isBadgesLoading = false;
        });
    }

    return () => {
      isDestroyed = true;
    };
  });

  // Initial layout after mount
  $effect(() => {
    if (headerElement !== undefined) {
      applyRow1PriorityLayout();
      void applyBadgeCompaction();
      window.setTimeout(() => {
        applyRow1PriorityLayout();
        void applyBadgeCompaction();
      }, 0);
    }
  });

  // Worktree retry handler
  function handleWorktreeRetry(): void {
    const suggestedBranchName =
      params.worktree_branch !== undefined && params.worktree_branch !== ''
        ? params.worktree_branch
        : params.issue;
    new WorktreeRetryModal(plugin.app, plugin, {
      dashboard,
      issueId: params.issue,
      suggestedBranchName,
      worktreeOriginFolder: params.worktree_origin_folder
    }).open();
  }

  // Worktree active refresh handler
  function handleWorktreeRefresh(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    void plugin.issueManager.refreshWorktreeState(dashboard, params.issue);
  }

  // Branch badge data
  let branchBadge = $derived.by(() => {
    if (gitStatus === undefined || gitStatus.branchName === undefined) {
      return undefined;
    }
    const displayName = gitStatus.branchName.length > BRANCH_NAME_MAX_DISPLAY_LENGTH
      ? gitStatus.branchName.slice(0, BRANCH_NAME_MAX_DISPLAY_LENGTH) + '\u2026'
      : gitStatus.branchName;
    const tooltipPrefix = BRANCH_STATUS_TOOLTIP_PREFIX[gitStatus.branchStatus];
    return {
      icon: 'gitBranch' as IconName,
      text: displayName,
      tooltip: `${tooltipPrefix}: ${gitStatus.branchName}`,
      class: BRANCH_STATUS_CSS_CLASS[gitStatus.branchStatus]
    };
  });
</script>

<div
  class={[
    'tdc-issue-header',
    `priority-${params.priority}`,
    isCollapsed && 'tdc-collapsed',
    prAccentClass
  ]}
  bind:this={headerElement}
  {@attach attachResizeObserver(handleResize)}
>
  <button
    class={['tdc-btn', 'tdc-btn-collapse', isCollapsed && 'tdc-chevron-collapsed']}
    onclick={toggleCollapse}
    {@attach attachTooltip(isCollapsed ? 'Expand' : 'Collapse')}
  >
    <Icon name="chevron" size={16} />
  </button>

  <a
    class="internal-link tdc-header-link"
    href={params.path}
    data-href={params.path}
    style:min-width="{HEADER_HOVER_TITLE_MIN_WIDTH}px"
    bind:this={linkElement}
    onclick={(event) => {
      event.preventDefault();
      void plugin.app.workspace.openLinkText(params.path, '', false);
    }}
  >
    {params.name}
  </a>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class={[
      'tdc-header-badges',
      isBadgesLoading && 'tdc-header-badges-loading',
      shouldCompact && 'tdc-badges-compact'
    ]}
    bind:this={badgesElement}
    oncontextmenu={handleBadgesContextMenu}
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

  {#if isWorktreeIssue}
    {#if isWorktreeClickable}
      <ActionButton
        icon="worktree"
        label="Retry worktree setup"
        class="tdc-worktree-action tdc-worktree-action-retry tdc-worktree-status-failed"
        onclick={handleWorktreeRetry}
      />
    {:else if isWorktreeActive}
      <button
        class={`tdc-worktree-action tdc-worktree-status tdc-worktree-status-${worktreeStatusStateClass}`}
        type="button"
        onclick={handleWorktreeRefresh}
        {@attach attachTooltip(buildWorktreeLocationTooltip(
          params.worktree_origin_folder,
          params.worktree_branch,
          params.worktree_base_branch
        ))}
      >
        <Icon name="worktree" size={16} />
      </button>
    {:else}
      <span
        class={`tdc-worktree-action tdc-worktree-status tdc-worktree-status-${worktreeStatusStateClass}`}
        role="img"
        {@attach attachTooltip(worktreeStatusText)}
      >
        <Icon name="worktree" size={16} />
      </span>
    {/if}
  {/if}

  <button
    class={['tdc-issue-info-inline', isInfoPanelOpen && 'is-open']}
    type="button"
    aria-haspopup="dialog"
    aria-expanded={isInfoPanelOpen ? 'true' : 'false'}
    bind:this={infoButtonElement}
    onclick={toggleInfoPanel}
    {@attach attachTooltip('Issue info')}
  >
    <Icon name="info" size={20} />
  </button>

  <div class="tdc-header-actions">
    {#each row1ActionKeys as key (key)}
      {@const descriptor = actions.get(key)}
      {#if descriptor !== undefined && descriptor.shouldRender}
        <span
          class="tdc-row1-action"
          {@attach (node) => {
            row1Buttons.set(key, node);
            return () => { row1Buttons.delete(key); };
          }}
        >
          <ActionButton
            icon={descriptor.iconKey}
            label={descriptor.label}
            class={descriptor.cssClass}
            variant={descriptor.variant}
            faded={descriptor.faded}
            onclick={(event) => descriptor.onClick(event)}
            oncontextmenu={descriptor.onContextMenu}
          />
        </span>
      {/if}
    {/each}

    <div class="tdc-overflow-wrapper" bind:this={overflowButtonElement}>
      <ActionButton
        icon="more"
        label="More actions"
        class="tdc-btn-overflow tdc-overflow-trigger"
        onclick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          isOverflowOpen = !isOverflowOpen;
        }}
        oncontextmenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          isOverflowOpen = true;
        }}
      />
    </div>
  </div>

  {#if isOverflowOpen && overflowButtonElement !== undefined}
    <OverflowPanel
      {plugin}
      anchorElement={overflowButtonElement}
      {dashboard}
      {actions}
      {layout}
      {getVisibleActionKeys}
      onclose={() => { isOverflowOpen = false; }}
    />
  {/if}

  {#if isInfoPanelOpen && infoButtonElement !== undefined}
    <IssueInfoPanel
      content={infoContent}
      anchorElement={infoButtonElement}
      onclose={() => { isInfoPanelOpen = false; }}
    />
  {/if}
</div>

<style>
.tdc-issue-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-left: 4px solid var(--text-muted);
  margin-bottom: 4px;
  background: var(--background-primary-alt);
  border-radius: 0 var(--tdc-border-radius) var(--tdc-border-radius) 0;
  overflow: visible;
  position: relative;
}

.tdc-issue-header.tdc-collapsed {
  margin-bottom: 0;
}

.tdc-issue-header[class*='priority-'] {
  border-left-color: var(--tdc-priority-color);
}

:global(.tdc-priorities-disabled) .tdc-issue-header {
  border-left: none;
  border-radius: var(--tdc-border-radius);
}

.tdc-header-link {
  font-size: 1.25em;
  font-weight: 600;
  color: var(--tdc-issue-header-link-color, var(--text-normal));
  text-decoration: none;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

:global(.theme-dark) .tdc-header-link {
  color: var(--tdc-issue-header-link-color, #e0e0e0);
}

:global(.theme-light) .tdc-header-link {
  color: var(--tdc-issue-header-link-color, #2a2a2a);
}

.tdc-btn-collapse {
  min-width: var(--tdc-btn-square-size);
  border-radius: var(--tdc-border-radius-sm);
  background: transparent;
  color: var(--tdc-issue-header-link-color, var(--text-muted));
  margin-right: 6px;
  width: var(--tdc-btn-square-size);
  height: var(--tdc-btn-square-size);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: var(--tdc-transition-fast);
}

.tdc-btn-collapse:hover {
  background: color-mix(in srgb, var(--tdc-issue-header-link-color, var(--text-normal)) 15%, transparent);
  color: var(--tdc-issue-header-link-color, var(--text-normal));
}

.tdc-btn-collapse :global(svg) {
  width: var(--tdc-btn-icon-size);
  height: var(--tdc-btn-icon-size);
  transition: transform 0.15s ease;
  transform: rotate(90deg);
}

.tdc-btn-collapse.tdc-chevron-collapsed :global(svg) {
  transform: rotate(0deg);
}

.tdc-issue-info-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0 !important;
  box-shadow: none !important;
  appearance: none;
  -webkit-appearance: none;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  border-radius: var(--tdc-border-radius-sm) !important;
  color: var(--tdc-issue-header-link-color, var(--text-normal)) !important;
  flex-shrink: 0;
  cursor: pointer;
  position: relative;
  outline: none;
}

.tdc-issue-info-inline :global(svg) {
  width: 20px;
  height: 20px;
}

.tdc-issue-info-inline:hover,
.tdc-issue-info-inline:focus-visible,
.tdc-issue-info-inline.is-open {
  background: color-mix(in srgb, var(--tdc-issue-header-link-color, var(--text-normal)) 15%, transparent) !important;
  background-color: color-mix(in srgb, var(--tdc-issue-header-link-color, var(--text-normal)) 15%, transparent) !important;
  background-image: none !important;
  border: 0 !important;
  border-radius: var(--tdc-border-radius-sm) !important;
  box-shadow: none !important;
}

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

@keyframes tdc-spin {
  to { transform: rotate(360deg); }
}

.tdc-badges-compact :global(.tdc-git-badge) {
  padding: 2px 4px;
}

.tdc-badges-compact :global(.tdc-git-badge > span) {
  display: none;
}

.tdc-header-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  align-items: center;
  position: relative;
}

:global(.tdc-row1-hidden-width) {
  display: none !important;
}

.tdc-overflow-wrapper {
  position: relative;
  flex-shrink: 0;
  z-index: 100;
}

.tdc-row1-action {
  display: contents;
}

/* Worktree status styles */
:global(.tdc-worktree-action) {
  flex-shrink: 0;
}

:global(.tdc-worktree-status) {
  width: 24px;
  height: 24px;
  min-width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--tdc-border-radius-sm);
  background: transparent;
  color: var(--text-muted);
  flex-shrink: 0;
}

:global(.tdc-worktree-status) :global(svg) {
  width: 16px;
  height: 16px;
}

:global(.tdc-worktree-status-active) {
  color: var(--tdc-priority-low) !important;
}

:global(.tdc-worktree-status-pending) {
  color: var(--tdc-priority-medium) !important;
}

:global(.tdc-worktree-status-failed) {
  color: var(--tdc-priority-high) !important;
}

:global(.tdc-worktree-status-inactive) {
  color: #9e9e9e !important;
}

:global(.tdc-worktree-status):hover {
  background: color-mix(in srgb, var(--tdc-issue-header-link-color, var(--text-normal)) 15%, transparent);
}

:global(button.tdc-worktree-action-retry) {
  color: var(--tdc-priority-high);
}

:global(button.tdc-worktree-action-retry):hover {
  color: #ff5252;
}

:global(button.tdc-worktree-status.tdc-worktree-status-active) {
  cursor: pointer;
  border: 0 !important;
  box-shadow: none !important;
  appearance: none;
  -webkit-appearance: none;
  background: transparent !important;
  padding: 0;
}

:global(button.tdc-worktree-status.tdc-worktree-status-active):hover {
  color: #66bb6a !important;
  background: color-mix(in srgb, var(--tdc-issue-header-link-color, var(--text-normal)) 15%, transparent) !important;
}

/* PR accent — bottom border + gradient */
.tdc-issue-header[class*='tdc-pr-accent-'] {
  position: relative;
}

.tdc-issue-header.tdc-pr-accent-merged {
  border-bottom: 3px solid var(--tdc-git-pr-merged);
}

.tdc-issue-header.tdc-pr-accent-merged::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--tdc-git-pr-merged) 8%, transparent),
    transparent 60%
  );
  pointer-events: none;
  border-radius: inherit;
}

.tdc-issue-header.tdc-pr-accent-review-requested {
  border-bottom: 3px solid var(--tdc-git-pr-review);
}

.tdc-issue-header.tdc-pr-accent-review-requested::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--tdc-git-pr-review) 8%, transparent),
    transparent 60%
  );
  pointer-events: none;
  border-radius: inherit;
}

.tdc-issue-header.tdc-pr-accent-open {
  border-bottom: 3px solid var(--tdc-git-pr-open);
}

.tdc-issue-header.tdc-pr-accent-draft {
  border-bottom: 3px solid var(--tdc-git-pr-draft);
}

.tdc-issue-header.tdc-pr-accent-closed {
  border-bottom: 3px solid var(--tdc-git-pr-closed);
}

/* Issue 3 — Header button icon colors respect issue color */
.tdc-issue-header :global(.tdc-btn) {
  color: var(--tdc-issue-header-link-color, var(--text-normal));
}

.tdc-issue-header :global(.tdc-btn):hover {
  background: color-mix(in srgb, var(--tdc-issue-header-link-color, var(--text-normal)) 15%, transparent);
  color: var(--tdc-issue-header-link-color, var(--text-normal));
}

.tdc-issue-header :global(.tdc-btn):active {
  background: color-mix(in srgb, var(--tdc-issue-header-link-color, var(--text-normal)) 25%, transparent);
}

/* Issue 7 — Badge text color overrides */
.tdc-header-badges :global(.tdc-git-badge[class*='tdc-git-badge-branch-']),
.tdc-header-badges :global(.tdc-git-badge[class*='tdc-git-badge-open']),
.tdc-header-badges :global(.tdc-git-badge[class*='tdc-git-badge-merged']),
.tdc-header-badges :global(.tdc-git-badge[class*='tdc-git-badge-closed']),
.tdc-header-badges :global(.tdc-git-badge[class*='tdc-git-badge-draft']),
.tdc-header-badges :global(.tdc-git-badge[class*='tdc-git-badge-review']),
.tdc-header-badges :global(.tdc-git-badge[class*='tdc-git-badge-issue-']) {
  color: var(--tdc-issue-header-link-color, var(--text-normal));
}

/* Per-state SVG color overrides */
.tdc-header-badges :global(.tdc-git-badge-branch-active svg) { color: var(--tdc-git-branch-active); }
.tdc-header-badges :global(.tdc-git-badge-branch-local svg) { color: var(--tdc-git-branch-local); }
.tdc-header-badges :global(.tdc-git-badge-branch-remote-gone svg) { color: var(--tdc-git-branch-remote-gone); }
.tdc-header-badges :global(.tdc-git-badge-branch-deleted svg) { color: var(--tdc-git-branch-deleted); }
.tdc-header-badges :global(.tdc-git-badge-open svg) { color: var(--tdc-git-pr-open); }
.tdc-header-badges :global(.tdc-git-badge-merged svg) { color: var(--tdc-git-pr-merged); }
.tdc-header-badges :global(.tdc-git-badge-closed svg) { color: var(--tdc-git-pr-closed); }
.tdc-header-badges :global(.tdc-git-badge-draft svg) { color: var(--tdc-git-pr-draft); }
.tdc-header-badges :global(.tdc-git-badge-review svg) { color: var(--tdc-git-pr-review); }
.tdc-header-badges :global(.tdc-git-badge-issue-open svg) { color: var(--tdc-gh-open); }
.tdc-header-badges :global(.tdc-git-badge-issue-closed svg) { color: var(--tdc-gh-closed); }
.tdc-header-badges :global(.tdc-git-badge-issue-not-planned svg) { color: var(--text-muted); }
</style>
