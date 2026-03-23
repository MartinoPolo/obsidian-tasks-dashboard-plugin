<script lang="ts">
  import { Notice, Setting } from 'obsidian';
  import type TasksDashboardPlugin from '../../../main';
  import Icon from '../Icon.svelte';
  import { DashboardDeleteConfirmationModal } from '../../modals/dashboard-delete-modal';
  import { RepositoryLinkerModal } from '../../modals/RepositoryLinkerModal';
  import {
    cleanupDashboardSettingData,
    collectDashboardIssueIds,
    trashDashboardFiles
  } from '../../settings/dashboard-cleanup';
  import {
    buildVaultPath,
    getDashboardFilename,
    getErrorMessage,
    hasSettingsTabApi,
    resolveCollapsedDashboardSettingsMap,
    withMarkdownExtension
  } from '../../settings/settings-helpers';
  import {
    DASHBOARD_VISIBILITY_TOGGLES,
    type VisibilityToggleKey
  } from '../../settings/settings-options';
  import { type DashboardConfig, getDashboardDisplayName } from '../../types';
  import { createPlatformService } from '../../utils/platform';
  import {
    saveSettings as pluginSaveSettings,
    saveSettingsAndRefreshDashboard as pluginSaveSettingsAndRefreshDashboard
  } from '../../utils/settings-helpers';

  interface Props {
    plugin: TasksDashboardPlugin;
    dashboard: DashboardConfig;
    index: number;
    onrefresh: () => void;
  }

  let { plugin, dashboard, index, onrefresh }: Props = $props();

  let settingsBodyEl: HTMLElement | undefined = $state(undefined);

  const platformService = createPlatformService();

  function saveSettings(): void {
    pluginSaveSettings(plugin);
  }

  function saveSettingsAndRefreshDashboard(): void {
    pluginSaveSettingsAndRefreshDashboard(plugin);
  }

  let displayName = $derived(getDashboardDisplayName(dashboard));

  let isCollapsed = $derived.by(() => {
    const collapsedMap = resolveCollapsedDashboardSettingsMap(plugin.settings);
    return collapsedMap[dashboard.id] === true;
  });

  function toggleCollapsed(): void {
    const collapsedMap = resolveCollapsedDashboardSettingsMap(plugin.settings);
    if (isCollapsed) {
      delete collapsedMap[dashboard.id];
    } else {
      collapsedMap[dashboard.id] = true;
    }
    saveSettings();
    onrefresh();
  }

  async function deleteDashboard(): Promise<void> {
    const issueIds = await collectDashboardIssueIds(plugin.app, dashboard);
    cleanupDashboardSettingData(plugin.settings, dashboard, issueIds);
    plugin.settings.dashboards.splice(index, 1);
    await plugin.saveSettings();
    plugin.registerDashboardCommands();
    onrefresh();
  }

  async function deleteDashboardWithFiles(): Promise<void> {
    const issueIds = await collectDashboardIssueIds(plugin.app, dashboard);
    cleanupDashboardSettingData(plugin.settings, dashboard, issueIds);
    await trashDashboardFiles(plugin.app, dashboard);
    plugin.settings.dashboards.splice(index, 1);
    await plugin.saveSettings();
    plugin.registerDashboardCommands();
    onrefresh();
  }

  function renderSettings(container: HTMLElement): void {
    container.empty();

    new Setting(container)
      .setName('Root path')
      .setDesc(
        'Path to the folder containing your dashboard file. If you rename the folder in Obsidian, update this path to match.'
      )
      .addText((text) =>
        text
          .setPlaceholder('Projects/my-project')
          .setValue(dashboard.rootPath)
          .onChange((value) => {
            dashboard.rootPath = value;
            saveSettings();
          })
      );

    new Setting(container)
      .setName('Dashboard filename')
      .setDesc(
        'Name of the dashboard file (also used as display name). If you rename the file in Obsidian, update this to match.'
      )
      .addText((text) =>
        text
          .setPlaceholder('Dashboard.md')
          .setValue(getDashboardFilename(dashboard))
          .onChange((value) => {
            dashboard.dashboardFilename = withMarkdownExtension(value);
            saveSettings();
            plugin.registerDashboardCommands();
          })
      );

    new Setting(container)
      .setName('GitHub integration')
      .setDesc('Enable GitHub issue linking for this dashboard')
      .addToggle((toggle) =>
        toggle.setValue(dashboard.githubEnabled).onChange((value) => {
          dashboard.githubEnabled = value;
          saveSettingsAndRefreshDashboard();
          onrefresh();
        })
      );

    if (dashboard.githubEnabled) {
      renderRepositoryPicker(container);
    }

    const projectFolderSetting = new Setting(container)
      .setName('Project folder')
      .setDesc(
        'Absolute path to the on-disk project folder. Enables open folder and terminal buttons on the dashboard.'
      )
      .addText((text) =>
        text
          .setPlaceholder('C:\\projects\\my-app')
          .setValue(dashboard.projectFolder ?? '')
          .onChange((value) => {
            dashboard.projectFolder = value !== '' ? value : undefined;
            saveSettingsAndRefreshDashboard();
          })
      );

    projectFolderSetting.addButton((btn) =>
      btn.setButtonText('Browse').onClick(() => {
        void platformService.pickFolder(dashboard.projectFolder).then((folderPath) => {
          if (folderPath !== undefined) {
            dashboard.projectFolder = folderPath;
            saveSettings();
            onrefresh();
          }
        });
      })
    );

    for (const toggle of DASHBOARD_VISIBILITY_TOGGLES) {
      createVisibilityToggle(container, toggle.key, toggle.name, toggle.description);
    }

    new Setting(container)
      .setName('Enable priorities')
      .setDesc('Show priority indicators and allow priority selection during issue creation')
      .addToggle((toggle) =>
        toggle.setValue(dashboard.prioritiesEnabled !== false).onChange((value) => {
          dashboard.prioritiesEnabled = value;
          saveSettingsAndRefreshDashboard();
        })
      );

    renderDashboardFilesSection(container);

    new Setting(container)
      .setName('Hotkey')
      .setDesc(
        `Configure hotkey in Obsidian settings → Hotkeys → search for "Create issue: ${displayName}"`
      )
      .addButton((btn) =>
        btn.setButtonText('Open hotkeys').onClick(() => {
          if (hasSettingsTabApi(plugin.app)) {
            plugin.app.setting?.openTabById('hotkeys');
          }
        })
      );

    new Setting(container)
      .setName('Rebuild dashboard')
      .setDesc('Reconstruct dashboard from issue files (fixes corrupted dashboards)')
      .addButton((btn) =>
        btn
          .setButtonText('Rebuild')
          .setWarning()
          .onClick(() => {
            if (dashboard.rootPath === '') {
              new Notice('Please set a root path first');
              return;
            }
            plugin.dashboardWriter.rebuildDashboardFromFiles(dashboard).catch((error: unknown) => {
              new Notice(`Error: ${getErrorMessage(error)}`);
            });
          })
      );

    new Setting(container)
      .setName('Remove dashboard')
      .setDesc('Delete this dashboard configuration and clean up related settings')
      .addButton((btn) =>
        btn
          .setButtonText('Remove')
          .setWarning()
          .onClick(() => {
            new DashboardDeleteConfirmationModal(
              plugin.app,
              getDashboardDisplayName(dashboard),
              (result) => {
                if (!result.confirmed) {
                  return;
                }
                if (result.deleteFiles) {
                  void deleteDashboardWithFiles();
                } else {
                  void deleteDashboard();
                }
              }
            ).open();
          })
      );
  }

  function createVisibilityToggle(
    container: HTMLElement,
    key: VisibilityToggleKey,
    name: string,
    description: string
  ): void {
    new Setting(container)
      .setName(name)
      .setDesc(description)
      .addToggle((toggle) =>
        toggle.setValue(dashboard[key] ?? true).onChange((value) => {
          dashboard[key] = value;
          saveSettingsAndRefreshDashboard();
        })
      );
  }

  function renderRepositoryPicker(container: HTMLElement): void {
    const linkedRepos = dashboard.githubRepos ?? [];
    const repoCount = linkedRepos.length;
    const isAuthenticated = plugin.githubService.isAuthenticated();

    const repoSetting = new Setting(container)
      .setName('GitHub repositories')
      .setDesc(repoCount > 0 ? `Linked repositories: ${repoCount}` : 'No repositories linked');

    if (isAuthenticated) {
      repoSetting.addButton((button) =>
        button
          .setButtonText('Manage')
          .setCta()
          .onClick(() => {
            new RepositoryLinkerModal(plugin, dashboard, (repos) => {
              dashboard.githubRepos = repos;
              saveSettings();
              onrefresh();
            }).open();
          })
      );
    } else {
      repoSetting.addText((text) =>
        text
          .setPlaceholder('Owner/repo, owner/repo')
          .setValue(linkedRepos.join(', '))
          .onChange((value) => {
            const parsed = value
              .split(',')
              .map((segment) => segment.trim())
              .filter((segment) => segment !== '');
            dashboard.githubRepos = parsed.length > 0 ? parsed : undefined;
            saveSettings();
          })
      );
    }
  }

  function renderDashboardFilesSection(container: HTMLElement): void {
    const currentFilename = getDashboardFilename(dashboard);
    const currentPath =
      dashboard.rootPath !== '' ? buildVaultPath(dashboard.rootPath, currentFilename) : '';
    const exists =
      currentPath !== '' && plugin.app.vault.getAbstractFileByPath(currentPath) !== null;

    const dashboardFilesSetting = new Setting(container).setName('Dashboard files');

    if (exists) {
      dashboardFilesSetting.setDesc('Dashboard file exists');
      dashboardFilesSetting.addButton((btn) =>
        btn.setButtonText('Open dashboard').onClick(() => {
          void plugin.app.workspace.openLinkText(currentPath, '', false);
        })
      );
    } else {
      dashboardFilesSetting.setDesc(
        `Create ${currentFilename} and issue folders at the specified path`
      );
      dashboardFilesSetting.addButton((btn) =>
        btn
          .setButtonText('Create files')
          .setCta()
          .onClick(() => {
            if (dashboard.rootPath === '') {
              new Notice('Please set a root path first');
              return;
            }
            plugin
              .createDashboardFiles(dashboard)
              .then(() => {
                new Notice(`Dashboard created at ${currentPath}`);
                onrefresh();
              })
              .catch((error: unknown) => {
                new Notice(`Error: ${getErrorMessage(error)}`);
              });
          })
      );
    }
  }

  $effect(() => {
    if (settingsBodyEl === undefined || isCollapsed) {
      return;
    }

    renderSettings(settingsBodyEl);
  });
</script>

<div class="tdc-dashboard-config" data-dashboard-id={dashboard.id}>
  <div class="tdc-dashboard-config-header">
    <button
      type="button"
      class={['tdc-btn-collapse', isCollapsed && 'tdc-chevron-collapsed']}
      aria-expanded={String(!isCollapsed)}
      aria-label={isCollapsed
        ? `Expand settings for ${displayName}`
        : `Collapse settings for ${displayName}`}
      onclick={toggleCollapsed}
    >
      <Icon name="chevron" size={16} />
    </button>
    <div class="tdc-dashboard-config-title">
      <h3>Dashboard: {displayName}</h3>
    </div>
  </div>
  {#if !isCollapsed}
    <div bind:this={settingsBodyEl}></div>
  {/if}
</div>
