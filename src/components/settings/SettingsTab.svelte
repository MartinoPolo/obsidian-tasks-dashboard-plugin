<script lang="ts">
  import { Notice, Setting } from 'obsidian';
  import type TasksDashboardPlugin from '../../../main';
  import { addDropdownOptions } from '../../settings/settings-helpers';
  import {
    DEFAULT_DASHBOARD_FILENAME,
    PROGRESS_DISPLAY_OPTIONS,
    isProgressDisplayMode
  } from '../../settings/settings-options';
  import type { DashboardConfig } from '../../types';
  import { generateId } from '../../utils/slugify';
  import DashboardSettings from './DashboardSettings.svelte';
  import GitHubSettings from './GitHubSettings.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
  }

  let { plugin }: Props = $props();

  let globalSettingsEl: HTMLElement | undefined = $state(undefined);
  let releaseColorsEl: HTMLElement | undefined = $state(undefined);
  let addDashboardEl: HTMLElement | undefined = $state(undefined);

  let renderKey: number = $state(0);

  function refresh(): void {
    renderKey++;
  }

  function saveSettings(): void {
    void plugin.saveSettings();
  }

  function saveSettingsAndRefreshDashboard(): void {
    saveSettings();
    plugin.triggerDashboardRefresh();
  }

  $effect(() => {
    if (globalSettingsEl === undefined) {
      return;
    }

    globalSettingsEl.empty();

    new Setting(globalSettingsEl).setName('Dashboard configuration').setHeading();
    globalSettingsEl.createEl('p', {
      text: 'Configure your task dashboards. Each dashboard manages issues in its own folder.',
      cls: 'setting-item-description'
    });

    new Setting(globalSettingsEl)
      .setName('Progress display')
      .setDesc('How to show task progress for each issue')
      .addDropdown((dropdown) => {
        addDropdownOptions(dropdown, PROGRESS_DISPLAY_OPTIONS);
        dropdown.setValue(plugin.settings.progressDisplayMode).onChange((value) => {
          if (!isProgressDisplayMode(value)) {
            return;
          }

          plugin.settings.progressDisplayMode = value;
          saveSettingsAndRefreshDashboard();
        });
      });

    new Setting(globalSettingsEl)
      .setName('Worktree bash path (Windows)')
      .setDesc(
        'Optional full path to bash.exe used for setup/remove worktree scripts on Windows. Leave empty to use default Git Bash locations.'
      )
      .addText((text) =>
        text
          .setPlaceholder('C:\\_MP_apps\\Git\\bin\\bash.exe')
          .setValue(plugin.settings.worktreeBashPath ?? '')
          .onChange((value) => {
            plugin.settings.worktreeBashPath =
              value.trim() !== '' ? value.trim() : undefined;
            saveSettings();
          })
      );
  });

  $effect(() => {
    if (releaseColorsEl === undefined) {
      return;
    }

    releaseColorsEl.empty();
    new Setting(releaseColorsEl)
      .setName('Release all issue colors')
      .setDesc('Clear all color assignments so they can be reused')
      .addButton((btn) =>
        btn
          .setButtonText('Release all colors')
          .setWarning()
          .onClick(() => {
            plugin.settings.issueColors = {};
            saveSettingsAndRefreshDashboard();
            new Notice('All issue colors released');
          })
      );
  });

  $effect(() => {
    if (addDashboardEl === undefined) {
      return;
    }

    addDashboardEl.empty();
    new Setting(addDashboardEl)
      .setName('Add dashboard')
      .setDesc('Create a new dashboard configuration')
      .addButton((btn) =>
        btn
          .setButtonText('+ add dashboard')
          .setCta()
          .onClick(() => {
            const newDashboard: DashboardConfig = {
              id: generateId(),
              rootPath: '',
              dashboardFilename: DEFAULT_DASHBOARD_FILENAME,
              githubEnabled: true
            };
            plugin.settings.dashboards.push(newDashboard);
            saveSettings();
            plugin.registerDashboardCommands();
            refresh();
          })
      );
  });
</script>

{#key renderKey}
  <div class="tdc-settings">
    <div bind:this={globalSettingsEl}></div>

    <GitHubSettings {plugin} onrefresh={refresh} />

    <div bind:this={releaseColorsEl}></div>
    <div bind:this={addDashboardEl}></div>

    {#if plugin.settings.dashboards.length === 0}
      <p class="tdc-no-dashboards">No dashboards configured. Add one to get started.</p>
    {/if}

    {#each plugin.settings.dashboards as dashboard, index (dashboard.id)}
      <DashboardSettings {plugin} {dashboard} {index} onrefresh={refresh} />
    {/each}
  </div>
{/key}
