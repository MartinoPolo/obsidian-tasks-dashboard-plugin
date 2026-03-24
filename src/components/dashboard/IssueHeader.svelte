<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type TasksDashboardPlugin from '../../../main';
  import { HEADER_HOVER_TITLE_MIN_WIDTH } from '../../dashboard/dashboard-renderer-constants';
  import type {
  	ControlParams,
  	IssueActionDescriptor,
  	RuntimeIssueActionLayout
  } from '../../dashboard/dashboard-renderer-types';
  import { getLinkedRepositories } from '../../dashboard/dashboard-writer-helpers';
  import {
    BRANCH_NAME_MAX_DISPLAY_LENGTH,
    BRANCH_STATUS_CSS_CLASS,
    BRANCH_STATUS_ICON,
    BRANCH_STATUS_TOOLTIP_PREFIX
  } from '../../git-status/git-badge-maps';
  import { buildGitStatusDisplayInfo } from '../../git-status/git-status-helpers';
  import type { IssueGitStatus } from '../../git-status/git-status-types';
  import { attachResizeObserver } from '../../lib/attach-resize-observer';
  import { attachTooltip } from '../../lib/attach-tooltip';
  import { WorktreeRetryModal } from '../../modals/worktree-retry-modal';
  import type { DashboardConfig, IssueActionKey } from '../../types';
  import { getIssueFolderStorageKey } from '../../issues/issue-manager-shared';
  import { buildWorktreeLocationTooltip, deriveWorktreeDisplayState } from '../../utils/worktree-helpers';
  import ActionButton from '../ActionButton.svelte';
  import Icon from '../Icon.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import HeaderBadges from './HeaderBadges.svelte';
  import IssueInfoPanel from './IssueInfoPanel.svelte';
  import OverflowPanel from './OverflowPanel.svelte';
  import WorktreeIndicator from './WorktreeIndicator.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    params: ControlParams;
    dashboard: DashboardConfig;
    actions: Map<IssueActionKey, IssueActionDescriptor>;
    layout: RuntimeIssueActionLayout;
    containerElement: HTMLElement;
    row2VisibleActionKeys: Set<IssueActionKey>;
    isCollapsed: boolean;
    onCollapseToggle: (newCollapsed: boolean) => void;
  }

  let {
    plugin,
    params,
    dashboard,
    actions,
    layout,
    containerElement,
    row2VisibleActionKeys,
    isCollapsed,
    onCollapseToggle
  }: Props = $props();

  // Layout override — updated by OverflowPanel's onlayoutchange until next full refresh
  // svelte-ignore state_referenced_locally
  let actionLayout = $state(layout);
  $effect(() => { actionLayout = layout; });

  // State
  let gitStatus = $state.raw<IssueGitStatus | undefined>(undefined);
  let gitStatusInfoLines: string[] = $state([]);
  let isInfoPanelOpen = $state(false);
  let isOverflowOpen = $state(false);
  let badgesContextMenuPosition: { x: number; y: number } | undefined = $state(undefined);
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

  // Derived — worktree display state
  let isWorktreeIssue = $derived(params.worktree === true);
  let worktreeDisplay = $derived(
    deriveWorktreeDisplayState(
      isWorktreeIssue,
      params.worktree_setup_state,
      params.worktree_safe_delete === true
    )
  );

  let issueFolderKey = $derived(getIssueFolderStorageKey(dashboard.id, params.issue));
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

  // Row1 visible action keys -- filter hidden
  let row1ActionKeys = $derived(
    actionLayout.row1.filter((key) => !actionLayout.hidden.includes(key) && actions.has(key))
  );

  // getVisibleActionKeys for overflow panel
  function getVisibleActionKeys(): Set<IssueActionKey> {
    const visible = new Set<IssueActionKey>();
    for (const [key, button] of row1Buttons) {
      if (!button.classList.contains('tdc-row1-hidden-width')) {
        visible.add(key);
      }
    }
    if (!isCollapsed) {
      for (const row2Key of row2VisibleActionKeys) {
        visible.add(row2Key);
      }
    }
    return visible;
  }

  // Row1 priority layout -- hide buttons when title is truncated
  function applyRow1PriorityLayout(): void {
    for (const button of row1Buttons.values()) {
      button.classList.remove('tdc-row1-hidden-width');
    }

    const orderedVisibleKeys = actionLayout.row1.filter((key) => row1Buttons.has(key));
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

  // Badge compaction -- measure at non-compact size to decide if compaction is needed.
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
    onCollapseToggle(!isCollapsed);
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
    badgesContextMenuPosition = { x: event.clientX, y: event.clientY };
  }

  function handleBadgesRefresh(): void {
    plugin.gitStatusService.invalidate(dashboard.id, params.issue);
    plugin.triggerDashboardRefresh();
  }

  let badgesContextMenuItems = $derived([
    { label: 'Refresh', action: handleBadgesRefresh }
  ]);

  // Async fetch git status
  $effect(() => {
    let isDestroyed = false;
    let rafId: number | undefined;

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

          const displayInfo = buildGitStatusDisplayInfo(result);
          gitStatusInfoLines = displayInfo.infoLines;
          prAccentClass = displayInfo.prAccentClass;

          // Apply badge compaction after render
          rafId = requestAnimationFrame(() => {
            rafId = undefined;
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
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
      }
    };
  });

  // Initial layout after mount
  onMount(() => {
    if (headerElement !== undefined) {
      setTimeout(() => {
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

  // Worktree location tooltip
  let worktreeLocationTooltip = $derived(
    buildWorktreeLocationTooltip(
      params.worktree_origin_folder,
      params.worktree_branch,
      params.worktree_base_branch
    )
  );

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
      icon: BRANCH_STATUS_ICON[gitStatus.branchStatus],
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

  <HeaderBadges
    {gitStatus}
    {branchBadge}
    {isBadgesLoading}
    {shouldCompact}
    bind:badgesElement
    oncontextmenu={handleBadgesContextMenu}
  />

  {#if isWorktreeIssue}
    <WorktreeIndicator
      isWorktreeClickable={worktreeDisplay.isClickable}
      isWorktreeActive={worktreeDisplay.isActive}
      worktreeStatusStateClass={worktreeDisplay.stateClass}
      worktreeStatusText={worktreeDisplay.statusText}
      {worktreeLocationTooltip}
      onRetry={handleWorktreeRetry}
      onRefresh={handleWorktreeRefresh}
    />
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
      layout={actionLayout}
      {getVisibleActionKeys}
      onlayoutchange={(newLayout) => { actionLayout = newLayout; }}
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

  {#if badgesContextMenuPosition !== undefined}
    <ContextMenu
      items={badgesContextMenuItems}
      position={badgesContextMenuPosition}
      onclose={() => { badgesContextMenuPosition = undefined; }}
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

/* PR accent -- bottom border + gradient */
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

/* Issue 3 -- Header button icon colors respect issue color */
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

/* Issue 7 -- Badge text color overrides */
.tdc-issue-header :global(.tdc-git-badge[class*='tdc-git-badge-branch-']),
.tdc-issue-header :global(.tdc-git-badge[class*='tdc-git-badge-open']),
.tdc-issue-header :global(.tdc-git-badge[class*='tdc-git-badge-merged']),
.tdc-issue-header :global(.tdc-git-badge[class*='tdc-git-badge-closed']),
.tdc-issue-header :global(.tdc-git-badge[class*='tdc-git-badge-draft']),
.tdc-issue-header :global(.tdc-git-badge[class*='tdc-git-badge-review']),
.tdc-issue-header :global(.tdc-git-badge[class*='tdc-git-badge-issue-']) {
  color: var(--tdc-issue-header-link-color, var(--text-normal));
}

/* Per-state SVG color overrides */
.tdc-issue-header :global(.tdc-git-badge-branch-active svg) { color: var(--tdc-git-branch-active); }
.tdc-issue-header :global(.tdc-git-badge-branch-local svg) { color: var(--tdc-git-branch-local); }
.tdc-issue-header :global(.tdc-git-badge-branch-remote-gone svg) { color: var(--tdc-git-branch-remote-gone); }
.tdc-issue-header :global(.tdc-git-badge-branch-deleted svg) { color: var(--tdc-git-branch-deleted); }
.tdc-issue-header :global(.tdc-git-badge-branch-unknown svg) { color: var(--text-muted); }
.tdc-issue-header :global(.tdc-git-badge-open svg) { color: var(--tdc-git-pr-open); }
.tdc-issue-header :global(.tdc-git-badge-merged svg) { color: var(--tdc-git-pr-merged); }
.tdc-issue-header :global(.tdc-git-badge-closed svg) { color: var(--tdc-git-pr-closed); }
.tdc-issue-header :global(.tdc-git-badge-draft svg) { color: var(--tdc-git-pr-draft); }
.tdc-issue-header :global(.tdc-git-badge-review svg) { color: var(--tdc-git-pr-review); }
.tdc-issue-header :global(.tdc-git-badge-issue-open svg) { color: var(--tdc-gh-open); }
.tdc-issue-header :global(.tdc-git-badge-issue-closed svg) { color: var(--tdc-gh-closed); }
.tdc-issue-header :global(.tdc-git-badge-issue-not-planned svg) { color: var(--text-muted); }
</style>
