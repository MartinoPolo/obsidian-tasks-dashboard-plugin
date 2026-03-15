<script lang="ts">
  import { Notice } from 'obsidian';
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig } from '../../types';
  import { getIssueFolderStorageKey } from '../../issues/issue-manager-shared';
  import { createPlatformService } from '../../utils/platform';
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    dashboard: DashboardConfig;
    issueId?: string;
    onclose: () => void;
  }

  let { plugin, dashboard, issueId, onclose }: Props = $props();

  let inputElement: HTMLInputElement | undefined = $state(undefined);

  function getStorageKey(): string | undefined {
    if (issueId === undefined) {
      return undefined;
    }
    return getIssueFolderStorageKey(dashboard.id, issueId);
  }

  function getCurrentValue(): string | undefined {
    const key = getStorageKey();
    if (key !== undefined) {
      return plugin.settings.issueFolders[key];
    }
    return dashboard.projectFolder;
  }

  function setValue(newValue: string | undefined): void {
    const key = getStorageKey();
    if (key !== undefined) {
      if (newValue === undefined) {
        delete plugin.settings.issueFolders[key];
      } else {
        plugin.settings.issueFolders[key] = newValue;
      }
    } else {
      dashboard.projectFolder = newValue;
    }
  }

  let modalTitle = $derived(issueId !== undefined ? 'Issue Folder' : 'Project Folder');
  let subjectLabel = $derived(issueId !== undefined ? 'Issue folder' : 'Project folder');
  let currentValue = getCurrentValue();
  let value: string = $state(currentValue ?? '');

  $effect(() => {
    if (inputElement !== undefined) {
      inputElement.focus();
      if (currentValue !== undefined) {
        inputElement.select();
      }
    }
  });

  function persistChanges(noticeMessage: string): void {
    void plugin.saveSettings();
    plugin.triggerDashboardRefresh();
    new Notice(noticeMessage);
    onclose();
  }

  function confirm(): void {
    const inputValue = value.trim();
    if (inputValue === '') {
      setValue(undefined);
      persistChanges(`${subjectLabel} cleared`);
      return;
    }
    setValue(inputValue);
    persistChanges(`${subjectLabel} set: ${inputValue}`);
  }

  function clearFolder(): void {
    setValue(undefined);
    persistChanges(`${subjectLabel} cleared`);
  }

  async function handleBrowse(): Promise<void> {
    const platformService = createPlatformService();
    const inputValue = value.trim();
    const folderPath = await platformService.pickFolder(
      inputValue !== '' ? inputValue : undefined
    );
    if (folderPath !== undefined) {
      value = folderPath;
      inputElement?.focus();
    }
  }
</script>

<ModalLayout title={modalTitle} onsubmit={confirm}>
  {#snippet children()}
    <p class="setting-item-description">Enter the absolute path to your project folder on disk.</p>
    <input
      type="text"
      class="tdc-prompt-input"
      placeholder="C:\projects\my-app"
      bind:value={value}
      bind:this={inputElement}
      onkeydown={(event) => { if (event.key === 'Escape') { return; } event.stopPropagation(); }}
    />
    <button class="tdc-prompt-btn tdc-prompt-btn-browse" onclick={() => void handleBrowse()}>
      Browse...
    </button>
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={onclose}>
      Cancel <kbd>Esc</kbd>
    </button>
    {#if currentValue !== undefined}
      <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={clearFolder}>
        Clear
      </button>
    {/if}
    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={confirm}>
      Save <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>
