<script lang="ts">
  import { tick } from 'svelte';
  import type { IssueColorEntry } from '../../utils/color';
  import {
    ISSUE_COLOR_PICKER_COLUMNS,
    collectUsedIssueColors,
    getNextAvailableIssueColor,
    getThemeAwareIssueColorPalette,
    isIssueColorUsed
  } from '../../utils/issue-colors';
  import { collectDashboardIssueIdSet } from '../../settings/dashboard-cleanup';
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig } from '../../types';
  import { getWrappedIndex } from '../../utils/array-utils';
  import { Notice, type App } from 'obsidian';
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    app: App;
    plugin: TasksDashboardPlugin;
    dashboard: DashboardConfig;
    initialColor?: string;
    onselect: (color: string) => void;
    oncancel: () => void;
    onback?: () => void;
  }

  let { app, plugin, dashboard, initialColor, onselect, oncancel, onback }: Props = $props();

  let colorPresets: readonly IssueColorEntry[] = $state.raw([]);
  let usedColors: Set<string> = $state.raw(new Set());
  // svelte-ignore state_referenced_locally
  let selectedColor: string = $state(initialColor ?? getThemeAwareIssueColorPalette()[0].background);
  // svelte-ignore state_referenced_locally
  let colorInputValue: string = $state(selectedColor);
  let dashboardIssueIds: Set<string> | undefined = $state.raw(undefined);
  let isLoaded: boolean = $state(false);
  const presetButtonRefs = new Map<string, HTMLButtonElement>();

  $effect(() => {
    void loadAndRender();
  });

  $effect(() => {
    if (isLoaded) {
      void focusSelectedPresetButton();
    }
  });

  async function focusSelectedPresetButton(): Promise<void> {
    await tick();
    const button = presetButtonRefs.get(selectedColor);
    if (button !== undefined) {
      button.focus();
    }
  }

  async function loadAndRender(): Promise<void> {
    try {
      dashboardIssueIds = await collectDashboardIssueIdSet(app, dashboard);
    } catch {
      dashboardIssueIds = undefined;
    }

    colorPresets = getThemeAwareIssueColorPalette();
    usedColors = collectUsedIssueColors(plugin.settings.issueColors, dashboardIssueIds);

    if (
      isIssueColorUsed(plugin.settings.issueColors, selectedColor, undefined, dashboardIssueIds)
    ) {
      selectedColor = getNextAvailableIssueColor(
        plugin.settings.issueColors,
        dashboardIssueIds,
        plugin.settings.lastUsedColorIndex
      );
      colorInputValue = selectedColor;
    }
    isLoaded = true;
  }

  async function movePresetSelection(step: number): Promise<void> {
    if (colorPresets.length === 0) {
      return;
    }
    const currentIndex = colorPresets.findIndex((entry) => entry.background === selectedColor);
    let nextIndex = currentIndex;
    for (let i = 0; i < colorPresets.length; i += 1) {
      nextIndex = getWrappedIndex(nextIndex, step, colorPresets.length);
      const nextColor = colorPresets[nextIndex].background;
      if (!usedColors.has(nextColor)) {
        selectColor(nextColor);
        await tick();
        presetButtonRefs.get(nextColor)?.focus();
        return;
      }
    }
  }

  function selectColor(color: string): void {
    selectedColor = color;
    colorInputValue = color;
  }

  function handlePresetKeydown(event: KeyboardEvent, color: string): void {
    if (event.key === ' ') {
      event.preventDefault();
      selectColor(color);
    }
  }

  function handleColorInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmSelection();
      return;
    }
    if (event.key === 'Backspace' && onback !== undefined) {
      event.preventDefault();
      onback();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      void movePresetSelection(-1);
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      void movePresetSelection(1);
    }
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    // Skip if user is interacting with the color input
    if (event.target instanceof HTMLInputElement && event.target.type === 'color') {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      void movePresetSelection(-1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      void movePresetSelection(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      void movePresetSelection(-ISSUE_COLOR_PICKER_COLUMNS);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      void movePresetSelection(ISSUE_COLOR_PICKER_COLUMNS);
      return;
    }
    if (event.key === 'Enter') {
      if (event.target instanceof HTMLButtonElement) {
        const isPresetButton = event.target.closest('.tdc-color-preset-row') !== null;
        if (isPresetButton) {
          event.preventDefault();
          confirmSelection();
          return;
        }
        return; // action buttons keep native click behavior
      }
      event.preventDefault();
      confirmSelection();
      return;
    }
    if (event.key === 'Backspace' && onback !== undefined) {
      event.preventDefault();
      onback();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      oncancel();
    }
  }

  function confirmSelection(): void {
    const color = colorInputValue.trim();
    if (isIssueColorUsed(plugin.settings.issueColors, color, undefined, dashboardIssueIds)) {
      new Notice('Color already assigned. Pick an available color.');
      return;
    }
    onselect(color);
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="tdc-color-preset-row-six-columns">
  <ModalLayout title="Issue Color">
    {#snippet children()}
      {#if isLoaded}
        <div class="tdc-color-preset-row" role="radiogroup">
          {#each colorPresets as entry, index (entry.background)}
            {@const isUnavailable = usedColors.has(entry.background)}
            {@const isSelected = entry.background === selectedColor}
            <button
              class={['tdc-color-preset-btn', isSelected && 'is-selected', isUnavailable && 'is-disabled']}
              type="button"
              style:background-color={entry.background}
              style:--tdc-swatch-fg={entry.foreground}
              style:--tdc-swatch-bg={entry.background}
              aria-checked={isSelected}
              role="radio"
              tabindex={isSelected ? 0 : -1}
              aria-disabled={isUnavailable}
              disabled={isUnavailable}
              onclick={() => { if (!isUnavailable) { selectColor(entry.background); } }}
              onkeydown={(event) => handlePresetKeydown(event, entry.background)}
              {@attach (node) => {
                presetButtonRefs.set(entry.background, node as HTMLButtonElement);
                return () => { presetButtonRefs.delete(entry.background); };
              }}
            >
              <span class="tdc-color-preset-indicator" style:color={entry.foreground}>A</span>
            </button>
          {/each}
        </div>
        <div class="tdc-color-picker-row">
          <span class="tdc-color-picker-label">Color picker</span>
          <input
            type="color"
            class="tdc-color-picker-circle"
            aria-label="Color picker"
            bind:value={colorInputValue}
            oninput={() => { selectedColor = colorInputValue; }}
            onkeydown={handleColorInputKeydown}
          />
        </div>
      {/if}
    {/snippet}
    {#snippet actions()}
      {#if onback !== undefined}
        <button class="tdc-prompt-btn tdc-prompt-btn-secondary" onclick={onback}>
          Back <kbd>⟵</kbd>
        </button>
      {/if}
      <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={oncancel}>
        Cancel <kbd>Esc</kbd>
      </button>
      <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={confirmSelection}>
        Confirm <kbd>↵</kbd>
      </button>
    {/snippet}
  </ModalLayout>
</div>
