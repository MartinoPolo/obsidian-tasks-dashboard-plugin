<script lang="ts">
  import type { MarkdownPostProcessorContext } from 'obsidian';
  import type TasksDashboardPlugin from '../../../main';
  import type { IssueActionKey, IssueProgress } from '../../types';
  import { parseParams } from '../../dashboard/dashboard-renderer-params';
  import { getIssueActionLayout } from '../../dashboard/dashboard-renderer-layout';
  import { buildIssueActionDescriptors } from '../../dashboard/dashboard-issue-actions';
  import {
    applyIssueSurfaceStyles,
    observeContentBlockSiblings,
    setIssueCollapsed
  } from '../../dashboard/dashboard-issue-surface';
  import { createPlatformService } from '../../utils/platform';
  import type { IssueActionDescriptor } from '../../dashboard/dashboard-renderer-types';
  import ActionButton from '../ActionButton.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import IssueHeader from './IssueHeader.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    source: string;
    ctx: MarkdownPostProcessorContext;
    containerElement: HTMLElement;
  }

  let { plugin, source, ctx, containerElement }: Props = $props();

  let issueContainerElement: HTMLDivElement | undefined = $state(undefined);

  let params = $derived(parseParams(source));
  let dashboard = $derived(
    params !== null
      ? plugin.settings.dashboards.find((d) => d.id === params!.dashboard)
      : undefined
  );
  let isCollapsed = $derived(
    params !== null ? plugin.settings.collapsedIssues[params.issue] === true : false
  );
  let prioritiesDisabled = $derived(dashboard !== undefined && dashboard.prioritiesEnabled === false);
  let progressBarPriority = $derived(
    prioritiesDisabled ? 'low' as const : (params?.priority ?? 'low')
  );

  let actionLayout = $derived(dashboard !== undefined ? getIssueActionLayout(dashboard) : undefined);

  // Issue progress — fetched async
  let progress = $state.raw<IssueProgress>({ done: 0, total: 0, percentage: 0 });

  const platformService = createPlatformService();

  // Tracks whether the initial surface style application has fired
  let hasMountedSurfaceStyles = false;

  // Build action descriptors
  let issueActions = $derived.by(() => {
    if (params === null || dashboard === undefined || issueContainerElement === undefined) {
      return new Map<IssueActionKey, IssueActionDescriptor>();
    }
    return buildIssueActionDescriptors({
      plugin,
      container: issueContainerElement,
      params,
      dashboard,
      platformService,
      applyIssueSurfaceStyles
    });
  });

  // Row2 action keys — single filter pass, then derive the Set from it
  let row2ActionKeys = $derived.by(() => {
    if (actionLayout === undefined) {
      return [] as IssueActionKey[];
    }
    return actionLayout.row2.filter((key) => {
      if (actionLayout!.hidden.includes(key)) {
        return false;
      }
      const descriptor = issueActions.get(key);
      return descriptor !== undefined && descriptor.shouldRender;
    });
  });

  let row2VisibleActionKeys = $derived(new Set(row2ActionKeys));

  // Apply surface styles + fetch progress
  $effect(() => {
    if (params === null || containerElement === undefined) {
      return;
    }
    containerElement.setAttribute('data-tdc-issue', params.issue);
    applyIssueSurfaceStyles(containerElement, plugin.settings.issueColors[params.issue]);

    // Deferred re-application only needed on initial mount (Obsidian DOM settling)
    if (!hasMountedSurfaceStyles) {
      hasMountedSurfaceStyles = true;
      const currentIssue = params.issue;
      window.setTimeout(() => {
        applyIssueSurfaceStyles(containerElement, plugin.settings.issueColors[currentIssue]);
      }, 60);
    }
  });

  // Fetch progress async
  $effect(() => {
    if (params === null) {
      return;
    }
    const currentPath = params.path;
    void plugin.progressTracker.getProgress(currentPath).then((result) => {
      progress = result;
    });
  });

  // Handle collapsed state for sibling content blocks
  $effect(() => {
    if (params === null || !isCollapsed) {
      return;
    }
    setIssueCollapsed(containerElement, true);

    const currentIssue = params.issue;
    const disconnect = observeContentBlockSiblings(
      containerElement,
      () => plugin.settings.collapsedIssues[currentIssue] === true,
      (controlBlock) =>
        applyIssueSurfaceStyles(controlBlock, plugin.settings.issueColors[currentIssue])
    );

    return disconnect;
  });
</script>

{#if params !== null && dashboard !== undefined && actionLayout !== undefined}
  <div
    class={[
      'tdc-issue-container',
      `priority-${params.priority}`,
      isCollapsed && 'tdc-collapsed',
      prioritiesDisabled && 'tdc-priorities-disabled'
    ]}
    bind:this={issueContainerElement}
  >
    <IssueHeader
      {plugin}
      {params}
      {dashboard}
      actions={issueActions}
      layout={actionLayout}
      {containerElement}
      getRow2VisibleActionKeys={() => row2VisibleActionKeys}
    />

    <div class="tdc-controls">
      <ProgressBar
        {progress}
        priority={progressBarPriority}
        displayMode={plugin.settings.progressDisplayMode}
      />

      <div class="tdc-btn-group">
        {#each row2ActionKeys as key (key)}
          {@const descriptor = issueActions.get(key)}
          {#if descriptor !== undefined}
            <ActionButton
              icon={descriptor.iconKey}
              label={descriptor.label}
              class={descriptor.cssClass}
              variant={descriptor.variant}
              faded={descriptor.faded}
              onclick={() => descriptor.onClick()}
              oncontextmenu={descriptor.onContextMenu}
            />
          {/if}
        {/each}
      </div>
    </div>
  </div>
{:else if params === null}
  <span class="tdc-error">Invalid control block</span>
{/if}

<style>
.tdc-issue-container {
  margin: 8px 0;
  --tdc-issue-main-color: var(--tdc-priority-medium);
  --tdc-issue-controls-bg: var(--background-secondary);
  --tdc-issue-checklist-bg: var(--background-primary-alt);
  --tdc-issue-controls-border: var(--background-modifier-border);
  --tdc-issue-checklist-border: var(--background-modifier-border);
}

.tdc-issue-container[class*='priority-'] {
  --tdc-issue-main-color: var(--tdc-priority-color);
}

.tdc-issue-container.tdc-collapsed :global(.tdc-controls) {
  display: none;
}

.tdc-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background: var(--tdc-issue-controls-bg);
  border: 1px solid var(--tdc-issue-controls-border);
  border-radius: var(--tdc-border-radius);
  margin-bottom: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.tdc-controls::-webkit-scrollbar {
  display: none;
}

.tdc-btn-group {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.tdc-error {
  color: var(--text-error);
}
</style>
