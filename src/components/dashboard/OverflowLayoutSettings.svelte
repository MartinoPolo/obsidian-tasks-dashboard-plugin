<script lang="ts">
  import { Notice } from 'obsidian';
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig, IssueActionKey } from '../../types';
  import { DEFAULT_ROW1_ACTIONS, ISSUE_ACTION_ORDER } from '../../dashboard/dashboard-renderer-constants';
  import { dedupeIssueActionKeys, saveIssueActionLayout } from '../../dashboard/dashboard-renderer-layout';
  import type { IssueActionDescriptor, RuntimeIssueActionLayout } from '../../dashboard/dashboard-renderer-types';
  import ActionButton from '../ActionButton.svelte';
  import Icon from '../Icon.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    dashboard: DashboardConfig;
    actions: Map<IssueActionKey, IssueActionDescriptor>;
    layout: RuntimeIssueActionLayout;
    onlayoutchange: (layout: RuntimeIssueActionLayout) => void;
    onhasautosaved: () => void;
    ondone: () => void;
  }

  let {
    plugin,
    dashboard,
    actions,
    layout,
    onlayoutchange,
    onhasautosaved,
    ondone
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let draftRow1: IssueActionKey[] = $state([...layout.row1]);
  // svelte-ignore state_referenced_locally
  let draftRow2: IssueActionKey[] = $state([...layout.row2]);
  // svelte-ignore state_referenced_locally
  let draftHidden: IssueActionKey[] = $state([...layout.hidden]);

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
    onlayoutchange({ row1: [...draftRow1], row2: [...draftRow2], hidden: [...draftHidden] });
    onhasautosaved();
    new Notice('Dashboard action layout saved', 1200);
  };

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
      return true;
    }
    if (pos.row === 'row2') {
      return pos.index < draftRow2.length - 1;
    }
    return true;
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
    ondone();
  };

  // Run ensureActionPlacement on mount to fill any missing actions
  ensureActionPlacement();
</script>

{#snippet settingsRow(keys: IssueActionKey[])}
  {#each keys as key (key)}
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
{/snippet}

<div class="tdc-overflow-settings">
  {@render settingsRow(draftRow1)}
  <div class="tdc-overflow-settings-divider"></div>
  {@render settingsRow(draftRow2)}

  <div class="tdc-overflow-settings-footer">
    <button class="tdc-btn tdc-overflow-settings-save" onclick={handleResetDefaults}>
      Reset to default layout
    </button>
    <button class="tdc-btn tdc-overflow-settings-save" onclick={handleDone}>
      Done
    </button>
  </div>
</div>

<style>
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

.tdc-overflow-settings-actions :global(.tdc-overflow-settings-visibility),
.tdc-overflow-settings-actions :global(.tdc-overflow-settings-move) {
  width: var(--tdc-btn-square-size);
  height: var(--tdc-btn-square-size);
  padding: 0;
}

.tdc-overflow-settings-actions :global(.tdc-overflow-settings-move) {
  font-size: 1em;
}

.tdc-overflow-settings-footer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tdc-overflow-settings-save {
  width: 100%;
  height: auto;
  padding: 6px 8px;
}
</style>
