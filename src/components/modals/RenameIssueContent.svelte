<script lang="ts">
  import { Notice } from 'obsidian';
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig } from '../../types';
  import { getErrorMessage } from '../../settings/settings-helpers';
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    dashboard: DashboardConfig;
    issueId: string;
    currentName: string;
    onclose: () => void;
  }

  let { plugin, dashboard, issueId, currentName, onclose }: Props = $props();

  // svelte-ignore state_referenced_locally
  let value: string = $state(currentName);
  let hasError: boolean = $state(false);
  let inputElement: HTMLInputElement | undefined = $state(undefined);

  $effect(() => {
    if (inputElement !== undefined) {
      inputElement.focus();
      inputElement.select();
    }
  });

  async function confirm(): Promise<void> {
    const trimmed = value.trim();
    if (trimmed === '') {
      hasError = true;
      inputElement?.focus();
      return;
    }

    if (trimmed === currentName) {
      onclose();
      return;
    }

    onclose();
    try {
      await plugin.issueManager.renameIssue(dashboard, issueId, trimmed);
    } catch (error) {
      new Notice(`Error renaming issue: ${getErrorMessage(error)}`);
    }
  }
</script>

<ModalLayout title="Rename Issue" onsubmit={() => void confirm()}>
  {#snippet children()}
    <input
      type="text"
      class={['tdc-prompt-input', hasError && 'tdc-input-error']}
      placeholder="Enter new name..."
      bind:value={value}
      bind:this={inputElement}
      oninput={() => { hasError = false; }}
      onkeydown={(event) => { if (event.key === 'Escape') { return; } event.stopPropagation(); }}
    />
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={onclose}>
      Cancel <kbd>Esc</kbd>
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={() => void confirm()}>
      Rename <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>
