<script lang="ts">
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig, IssueActionKey } from '../../types';
  import { ISSUE_ACTION_ORDER } from '../../dashboard/dashboard-renderer-constants';
  import type { IssueActionDescriptor, RuntimeIssueActionLayout } from '../../dashboard/dashboard-renderer-types';
  import { attachAnchoredPanel } from '../../lib/anchored-panel';
  import ActionButton from '../ActionButton.svelte';
  import OverflowLayoutSettings from './OverflowLayoutSettings.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    anchorElement: HTMLElement;
    dashboard: DashboardConfig;
    actions: Map<IssueActionKey, IssueActionDescriptor>;
    layout: RuntimeIssueActionLayout;
    getVisibleActionKeys: () => Set<IssueActionKey>;
    onlayoutchange: (layout: RuntimeIssueActionLayout) => void;
    onclose: () => void;
  }

  let {
    plugin,
    anchorElement,
    dashboard,
    actions,
    layout,
    getVisibleActionKeys,
    onlayoutchange,
    onclose
  }: Props = $props();

  let inSettingsMode = $state(false);
  let hasAutoSavedLayoutChanges = $state(false);

  const closePanel = () => {
    if (hasAutoSavedLayoutChanges) {
      plugin.triggerDashboardRefresh();
    }
    onclose();
  };

  // Overflow actions — visible in non-settings mode
  let overflowActionKeys = $derived.by(() => {
    const visibleActionKeys = getVisibleActionKeys();
    return ISSUE_ACTION_ORDER.filter((key) => {
      const descriptor = actions.get(key);
      if (descriptor === undefined || !descriptor.shouldRender) {
        return false;
      }
      return !visibleActionKeys.has(key);
    });
  });
</script>

<div
  class="tdc-overflow-panel tdc-overflow-panel-portal"
  {@attach attachAnchoredPanel({
    anchorElement,
    onclose: closePanel,
    minPanelWidth: 280
  })}
>
  {#if inSettingsMode}
    <OverflowLayoutSettings
      {plugin}
      {dashboard}
      {actions}
      {layout}
      {onlayoutchange}
      onhasautosaved={() => { hasAutoSavedLayoutChanges = true; }}
      ondone={() => { inSettingsMode = false; }}
    />
  {:else}
    <div class="tdc-overflow-actions">
      {#if overflowActionKeys.length === 0}
        <div class="tdc-overflow-empty">No hidden actions</div>
      {:else}
        {#each overflowActionKeys as key (key)}
          {@const descriptor = actions.get(key)}
          {#if descriptor !== undefined}
            <ActionButton
              icon={descriptor.iconKey}
              label={descriptor.label}
              labelText={descriptor.label}
              class={`tdc-overflow-item ${descriptor.cssClass}`}
              variant={descriptor.variant}
              faded={descriptor.faded}
              onclick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                descriptor.onClick(event);
                closePanel();
              }}
            />
          {/if}
        {/each}
      {/if}
    </div>
    <button
      class="tdc-btn tdc-overflow-settings-toggle"
      onclick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        inSettingsMode = true;
      }}
    >
      Layout settings
    </button>
  {/if}
</div>

<style>
.tdc-overflow-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

/* Parent-scoped :global to beat ActionButton's scoped .tdc-btn specificity */
.tdc-overflow-actions :global(.tdc-overflow-item) {
  justify-content: flex-start;
  width: 100%;
  height: auto;
  padding: 6px 8px;
  gap: 8px;
}

.tdc-overflow-actions :global(.tdc-overflow-item .tdc-btn-label) {
  font-size: 1em;
  margin-left: 0;
}

.tdc-overflow-actions :global(.tdc-overflow-item.tdc-btn-delete) {
  color: var(--tdc-priority-high);
}

.tdc-overflow-actions :global(.tdc-overflow-item.tdc-btn-archive) {
  color: var(--tdc-priority-medium);
}

.tdc-overflow-empty {
  font-size: 0.85em;
  color: var(--text-muted);
  padding: 4px 2px;
}

.tdc-overflow-settings-toggle {
  width: 100%;
  height: auto;
  padding: 6px 8px;
}
</style>
