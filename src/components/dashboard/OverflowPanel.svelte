<script lang="ts">
  import { Notice } from 'obsidian';
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig, IssueActionKey } from '../../types';
  import { DEFAULT_ROW1_ACTIONS, ISSUE_ACTION_ORDER } from '../../dashboard/dashboard-renderer-constants';
  import { dedupeIssueActionKeys, saveIssueActionLayout } from '../../dashboard/dashboard-renderer-layout';
  import type { IssueActionDescriptor, RuntimeIssueActionLayout } from '../../dashboard/dashboard-renderer-types';
  import { attachPortal } from '../../lib/attach-portal';
  import ActionButton from '../ActionButton.svelte';
  import Icon from '../Icon.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    anchorElement: HTMLElement;
    dashboard: DashboardConfig;
    actions: Map<IssueActionKey, IssueActionDescriptor>;
    layout: RuntimeIssueActionLayout;
    getVisibleActionKeys: () => Set<IssueActionKey>;
    onclose: () => void;
  }

  let {
    plugin,
    anchorElement,
    dashboard,
    actions,
    layout,
    getVisibleActionKeys,
    onclose
  }: Props = $props();

  let panelElement: HTMLDivElement | undefined = $state(undefined);
  let position = $state({ top: 0, left: 0, maxHeight: 0 });
  let inSettingsMode = $state(false);
  let hasAutoSavedLayoutChanges = $state(false);

  // Draft layout for settings mode — wrap in function to avoid state_referenced_locally warning
  const getInitialDraftRow1 = () => [...layout.row1];
  const getInitialDraftRow2 = () => [...layout.row2];
  const getInitialDraftHidden = () => [...layout.hidden];
  let draftRow1: IssueActionKey[] = $state(getInitialDraftRow1());
  let draftRow2: IssueActionKey[] = $state(getInitialDraftRow2());
  let draftHidden: IssueActionKey[] = $state(getInitialDraftHidden());

  const resetDraftLayout = () => {
    draftRow1 = getInitialDraftRow1();
    draftRow2 = getInitialDraftRow2();
    draftHidden = getInitialDraftHidden();
  };

  const resetDraftLayoutToDefaults = () => {
    draftRow1 = [...DEFAULT_ROW1_ACTIONS];
    draftRow2 = ISSUE_ACTION_ORDER.filter((key) => !draftRow1.includes(key));
    draftHidden = ['change-priority'];
  };

  const ensureActionPlacement = () => {
    for (const key of ISSUE_ACTION_ORDER) {
      const existsInRow1 = draftRow1.includes(key);
      const existsInRow2 = draftRow2.includes(key);
      if (!existsInRow1 && !existsInRow2) {
        draftRow2 = [...draftRow2, key];
      }
    }
    draftRow1 = dedupeIssueActionKeys(draftRow1);
    draftRow2 = dedupeIssueActionKeys(draftRow2.filter((key) => !draftRow1.includes(key)));
    draftHidden = dedupeIssueActionKeys(draftHidden);
  };

  const persistDraftLayout = () => {
    ensureActionPlacement();
    const draftLayout: RuntimeIssueActionLayout = {
      row1: draftRow1,
      row2: draftRow2,
      hidden: draftHidden
    };
    saveIssueActionLayout(plugin, dashboard, draftLayout, { triggerRefresh: false });
    layout.row1 = [...draftRow1];
    layout.row2 = [...draftRow2];
    layout.hidden = [...draftHidden];
    hasAutoSavedLayoutChanges = true;
    new Notice('Dashboard action layout saved', 1200);
  };

  const closePanel = () => {
    if (hasAutoSavedLayoutChanges) {
      plugin.triggerDashboardRefresh();
    }
    onclose();
  };

  const positionPanel = () => {
    if (panelElement === undefined || !anchorElement.isConnected) {
      closePanel();
      return;
    }

    const triggerRect = anchorElement.getBoundingClientRect();
    const viewportPadding = 8;
    const panelWidth = Math.max(panelElement.offsetWidth, 280);
    const verticalOffset = 4;
    const availableSpaceBelow = Math.max(
      120,
      window.innerHeight - triggerRect.bottom - viewportPadding - verticalOffset
    );
    const availableSpaceAbove = Math.max(
      120,
      triggerRect.top - viewportPadding - verticalOffset
    );
    const shouldOpenAbove = availableSpaceAbove > availableSpaceBelow;
    const maxPanelHeight = shouldOpenAbove ? availableSpaceAbove : availableSpaceBelow;

    const panelHeight = panelElement.offsetHeight;
    const maxLeft = window.innerWidth - panelWidth - viewportPadding;
    const alignedLeft = triggerRect.right - panelWidth;
    const left = Math.max(viewportPadding, Math.min(alignedLeft, maxLeft));

    let top = triggerRect.bottom + verticalOffset;
    if (shouldOpenAbove) {
      top = Math.max(viewportPadding, triggerRect.top - panelHeight - verticalOffset);
    } else {
      const maxTop = window.innerHeight - panelHeight - viewportPadding;
      top = Math.max(viewportPadding, Math.min(top, maxTop));
    }

    position = { top, left, maxHeight: maxPanelHeight };
  };

  const handleOutsideClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      closePanel();
      return;
    }
    if (panelElement !== undefined && panelElement.contains(target)) {
      return;
    }
    if (anchorElement.contains(target)) {
      return;
    }
    closePanel();
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    closePanel();
  };

  $effect(() => {
    requestAnimationFrame(positionPanel);

    window.addEventListener('scroll', positionPanel, true);
    window.addEventListener('resize', positionPanel);
    window.addEventListener('blur', closePanel);
    document.addEventListener('click', handleOutsideClick, true);
    document.addEventListener('keydown', handleEscape, true);

    return () => {
      window.removeEventListener('scroll', positionPanel, true);
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('blur', closePanel);
      document.removeEventListener('click', handleOutsideClick, true);
      document.removeEventListener('keydown', handleEscape, true);
    };
  });

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

  // Settings mode helpers
  const getActionPosition = (actionKey: IssueActionKey): { row: 'row1' | 'row2'; index: number } | undefined => {
    const row1Index = draftRow1.indexOf(actionKey);
    if (row1Index !== -1) {
      return { row: 'row1', index: row1Index };
    }
    const row2Index = draftRow2.indexOf(actionKey);
    if (row2Index !== -1) {
      return { row: 'row2', index: row2Index };
    }
    return undefined;
  };

  const canMoveAction = (actionKey: IssueActionKey, direction: 'up' | 'down'): boolean => {
    const pos = getActionPosition(actionKey);
    if (pos === undefined) {
      return false;
    }
    if (direction === 'up') {
      if (pos.row === 'row1') {
        return pos.index > 0;
      }
      return pos.index >= 0;
    }
    if (pos.row === 'row2') {
      return pos.index < draftRow2.length - 1;
    }
    return pos.index <= draftRow1.length - 1;
  };

  const moveActionByOne = (actionKey: IssueActionKey, direction: 'up' | 'down') => {
    const pos = getActionPosition(actionKey);
    if (pos === undefined) {
      return;
    }
    if (direction === 'up') {
      if (pos.row === 'row1') {
        if (pos.index === 0) {
          return;
        }
        const newRow1 = [...draftRow1];
        const previousKey = newRow1[pos.index - 1];
        newRow1[pos.index - 1] = actionKey;
        newRow1[pos.index] = previousKey;
        draftRow1 = newRow1;
        return;
      }
      if (pos.index > 0) {
        const newRow2 = [...draftRow2];
        const previousKey = newRow2[pos.index - 1];
        newRow2[pos.index - 1] = actionKey;
        newRow2[pos.index] = previousKey;
        draftRow2 = newRow2;
        return;
      }
      draftRow2 = draftRow2.slice(1);
      draftRow1 = [...draftRow1, actionKey];
      return;
    }
    if (pos.row === 'row2') {
      if (pos.index >= draftRow2.length - 1) {
        return;
      }
      const newRow2 = [...draftRow2];
      const nextKey = newRow2[pos.index + 1];
      newRow2[pos.index + 1] = actionKey;
      newRow2[pos.index] = nextKey;
      draftRow2 = newRow2;
      return;
    }
    if (pos.index < draftRow1.length - 1) {
      const newRow1 = [...draftRow1];
      const nextKey = newRow1[pos.index + 1];
      newRow1[pos.index + 1] = actionKey;
      newRow1[pos.index] = nextKey;
      draftRow1 = newRow1;
      return;
    }
    draftRow1 = draftRow1.slice(0, -1);
    draftRow2 = [actionKey, ...draftRow2];
  };

  const toggleVisibility = (key: IssueActionKey) => {
    const isVisible = !draftHidden.includes(key);
    if (isVisible) {
      draftHidden = [...draftHidden, key];
    } else {
      draftHidden = draftHidden.filter((hiddenKey) => hiddenKey !== key);
    }
    draftHidden = dedupeIssueActionKeys(draftHidden);
    persistDraftLayout();
  };

  const handleMoveUp = (key: IssueActionKey) => {
    if (!canMoveAction(key, 'up')) {
      return;
    }
    moveActionByOne(key, 'up');
    persistDraftLayout();
  };

  const handleMoveDown = (key: IssueActionKey) => {
    if (!canMoveAction(key, 'down')) {
      return;
    }
    moveActionByOne(key, 'down');
    persistDraftLayout();
  };

  const handleResetDefaults = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    resetDraftLayoutToDefaults();
    persistDraftLayout();
  };

  const handleDone = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    inSettingsMode = false;
    resetDraftLayout();
  };
</script>

<div
  class="tdc-overflow-panel tdc-overflow-panel-portal"
  bind:this={panelElement}
  style:top="{position.top}px"
  style:left="{position.left}px"
  style:max-height="{position.maxHeight}px"
  {@attach attachPortal()}
>
  {#if inSettingsMode}
    <div class="tdc-overflow-settings">
      {#each draftRow1 as key (key)}
        {@const descriptor = actions.get(key)}
        {#if descriptor !== undefined}
          {@const isVisible = !draftHidden.includes(key)}
          <div class={['tdc-overflow-settings-row', !isVisible && 'tdc-overflow-settings-row-hidden']}>
            <div class="tdc-overflow-settings-action-info">
              <span class="tdc-overflow-settings-item-icon">
                <Icon name={descriptor.iconKey} size={16} />
              </span>
              <span>{descriptor.label}</span>
            </div>
            <div class="tdc-overflow-settings-actions">
              <ActionButton
                icon={isVisible ? 'eye' : 'eyeOff'}
                label={isVisible ? `Hide ${descriptor.label}` : `Show ${descriptor.label}`}
                class="tdc-overflow-settings-visibility"
                onclick={() => toggleVisibility(key)}
              />
              <ActionButton
                icon="up"
                label={`Move ${descriptor.label} up`}
                class="tdc-overflow-settings-move"
                faded={!canMoveAction(key, 'up')}
                onclick={() => handleMoveUp(key)}
              />
              <ActionButton
                icon="down"
                label={`Move ${descriptor.label} down`}
                class="tdc-overflow-settings-move"
                faded={!canMoveAction(key, 'down')}
                onclick={() => handleMoveDown(key)}
              />
            </div>
          </div>
        {/if}
      {/each}

      <div class="tdc-overflow-settings-divider"></div>

      {#each draftRow2 as key (key)}
        {@const descriptor = actions.get(key)}
        {#if descriptor !== undefined}
          {@const isVisible = !draftHidden.includes(key)}
          <div class={['tdc-overflow-settings-row', !isVisible && 'tdc-overflow-settings-row-hidden']}>
            <div class="tdc-overflow-settings-action-info">
              <span class="tdc-overflow-settings-item-icon">
                <Icon name={descriptor.iconKey} size={16} />
              </span>
              <span>{descriptor.label}</span>
            </div>
            <div class="tdc-overflow-settings-actions">
              <ActionButton
                icon={isVisible ? 'eye' : 'eyeOff'}
                label={isVisible ? `Hide ${descriptor.label}` : `Show ${descriptor.label}`}
                class="tdc-overflow-settings-visibility"
                onclick={() => toggleVisibility(key)}
              />
              <ActionButton
                icon="up"
                label={`Move ${descriptor.label} up`}
                class="tdc-overflow-settings-move"
                faded={!canMoveAction(key, 'up')}
                onclick={() => handleMoveUp(key)}
              />
              <ActionButton
                icon="down"
                label={`Move ${descriptor.label} down`}
                class="tdc-overflow-settings-move"
                faded={!canMoveAction(key, 'down')}
                onclick={() => handleMoveDown(key)}
              />
            </div>
          </div>
        {/if}
      {/each}

      <div class="tdc-overflow-settings-footer">
        <button class="tdc-btn tdc-overflow-settings-save" onclick={handleResetDefaults}>
          Reset to default layout
        </button>
        <button class="tdc-btn tdc-overflow-settings-save" onclick={handleDone}>
          Done
        </button>
      </div>
    </div>
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
        ensureActionPlacement();
      }}
    >
      Layout settings
    </button>
  {/if}
</div>

<style>
.tdc-overflow-panel {
  position: fixed;
  right: auto;
  top: 0;
  left: 0;
  z-index: 10000;
  min-width: 280px;
  padding: 8px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--tdc-border-radius);
  box-shadow: var(--shadow-s);
  max-height: calc(100vh - 16px);
  overflow-y: auto;
  overflow-x: auto;
}

.tdc-overflow-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

:global(.tdc-overflow-item) {
  justify-content: flex-start;
  width: 100%;
  height: auto;
  padding: 6px 8px;
  gap: 8px;
}

:global(.tdc-overflow-item .tdc-btn-label) {
  font-size: 1em;
  margin-left: 0;
}

:global(.tdc-overflow-item.tdc-btn-delete) {
  color: var(--tdc-priority-high);
}

:global(.tdc-overflow-item.tdc-btn-archive) {
  color: var(--tdc-priority-medium);
}

.tdc-overflow-empty {
  font-size: 0.85em;
  color: var(--text-muted);
  padding: 4px 2px;
}

.tdc-overflow-settings-toggle,
.tdc-overflow-settings-save {
  width: 100%;
  height: auto;
  padding: 6px 8px;
}

.tdc-overflow-settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tdc-overflow-settings-divider {
  height: 1px;
  background: var(--background-modifier-border);
  margin: 2px 0;
}

.tdc-overflow-settings-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}

.tdc-overflow-settings-action-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.tdc-overflow-settings-row-hidden .tdc-overflow-settings-action-info {
  color: var(--text-muted);
  opacity: 0.5;
}

.tdc-overflow-settings-row-hidden :global(.tdc-overflow-settings-item-icon) {
  opacity: 0.5;
}

.tdc-overflow-settings-action-info > span:last-child {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tdc-overflow-settings-item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--tdc-btn-square-size);
  height: var(--tdc-btn-square-size);
  color: var(--text-muted);
  flex-shrink: 0;
}

.tdc-overflow-settings-item-icon :global(svg) {
  width: var(--tdc-btn-icon-size);
  height: var(--tdc-btn-icon-size);
}

.tdc-overflow-settings-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

:global(.tdc-overflow-settings-visibility),
:global(.tdc-overflow-settings-move) {
  width: var(--tdc-btn-square-size);
  height: var(--tdc-btn-square-size);
  padding: 0;
}

:global(.tdc-overflow-settings-move) {
  font-size: 1em;
}

.tdc-overflow-settings-footer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
