<script lang="ts">
  import { Menu, Notice, TFile } from 'obsidian';
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig } from '../../types';
  import { FolderPathModal } from '../../modals/FolderPathModal';
  import { openIssueCreationModal } from '../../modals/issue-creation-modal';
  import { NoteImportModal } from '../../modals/note-import-modal';
  import { RepositoryLinkerModal } from '../../modals/RepositoryLinkerModal';
  import { hasSettingsTabApi } from '../../settings/settings-helpers';
  import { createPlatformService } from '../../utils/platform';
  import { parseDashboard } from '../../dashboard/DashboardParser';
  import { getButtonVisibility } from '../../dashboard/dashboard-issue-actions';
  import {
    observeContentBlockSiblings,
    setIssueCollapsed as setIssueCollapsedDom
  } from '../../dashboard/dashboard-issue-surface';
  import { refreshDashboard } from '../../dashboard/dashboard-refresh';
  import { getLinkedRepositories } from '../../dashboard/dashboard-writer-helpers';
  import ActionButton from '../ActionButton.svelte';
  import SortDropdown from './SortDropdown.svelte';

  interface Props {
    plugin: TasksDashboardPlugin;
    source: string;
    containerElement: HTMLElement;
  }

  let { plugin, source, containerElement }: Props = $props();

  let sortButtonElement: HTMLButtonElement | undefined = $state(undefined);
  let isSortOpen = $state(false);

  const platformService = createPlatformService();

  let dashboardId = $derived(source.match(/dashboard:\s*([\w-]+)/)?.[1]);
  let dashboard = $derived(
    dashboardId !== undefined
      ? plugin.settings.dashboards.find((d) => d.id === dashboardId)
      : undefined
  );
  let linkedRepos = $derived(dashboard !== undefined ? getLinkedRepositories(dashboard) : []);
  let projectFolder = $derived(dashboard?.projectFolder);
  let hasFolder = $derived(projectFolder !== undefined && projectFolder !== '');
  let hasRepos = $derived(linkedRepos.length > 0);
  let visibility = $derived(dashboard !== undefined ? getButtonVisibility(dashboard) : undefined);

  let sortOptions = $derived.by(() => {
    if (dashboard === undefined) {
      return [];
    }
    const opts: { label: string; action: () => void }[] = [];
    if (dashboard.prioritiesEnabled !== false) {
      opts.push({
        label: 'Priority',
        action: () => void plugin.dashboardWriter.sortByPriority(dashboard)
      });
    }
    opts.push(
      { label: 'Newest Created', action: () => void plugin.dashboardWriter.sortByCreatedDate(dashboard, 'newest') },
      { label: 'Oldest Created', action: () => void plugin.dashboardWriter.sortByCreatedDate(dashboard, 'oldest') },
      { label: 'Recently Edited', action: () => void plugin.dashboardWriter.sortByEditedDate(dashboard, 'newest') },
      { label: 'Least Recently Edited', action: () => void plugin.dashboardWriter.sortByEditedDate(dashboard, 'oldest') },
      { label: 'Worktree Folder', action: () => void plugin.dashboardWriter.sortByWorktreeFolder(dashboard) },
      { label: 'PR State', action: () => void plugin.dashboardWriter.sortByPrState(dashboard) }
    );
    return opts;
  });

  function openProjectFolderModal(): void {
    if (dashboard === undefined) {
      return;
    }
    new FolderPathModal(plugin.app, plugin, dashboard).open();
  }

  function openRepositoryLinkerModal(): void {
    if (dashboard === undefined) {
      return;
    }
    new RepositoryLinkerModal(plugin, dashboard, (repos) => {
      dashboard!.githubRepos = repos;
      void plugin.saveSettings();
      plugin.triggerDashboardRefresh();
      const count = repos.length;
      if (count === 0) {
        new Notice('Cleared all linked repositories.');
      } else {
        new Notice(`Linked ${count} repositor${count === 1 ? 'y' : 'ies'}.`);
      }
    }).open();
  }

  function handleFolderDependentClick(action: (folderPath: string) => void): void {
    if (hasFolder) {
      action(projectFolder!);
      return;
    }
    openProjectFolderModal();
  }

  function findDashboardElement(element: HTMLElement): Element | null {
    return (
      element.closest('.markdown-preview-view') ??
      element.closest('.markdown-reading-view') ??
      element.closest('.cm-editor') ??
      element.closest('.markdown-source-view')
    );
  }

  async function getDashboardIssueIds(): Promise<string[]> {
    if (dashboard === undefined) {
      return [];
    }
    const filename = dashboard.dashboardFilename || 'Dashboard.md';
    const dashboardPath = `${dashboard.rootPath}/${filename}`;
    const file = plugin.app.vault.getAbstractFileByPath(dashboardPath);
    if (!(file instanceof TFile)) {
      return [];
    }
    const content = await plugin.app.vault.read(file);
    const parsed = parseDashboard(content);
    return [
      ...parsed.activeIssues.map((issue) => issue.id),
      ...parsed.archivedIssues.map((issue) => issue.id)
    ];
  }

  function applyCollapseToControlBlocks(
    dashboardElement: Element,
    collapsed: boolean
  ): void {
    for (const controlBlock of Array.from(
      dashboardElement.querySelectorAll(
        '.block-language-tasks-dashboard-controls, [data-tdc-issue]'
      )
    )) {
      if (controlBlock instanceof HTMLElement) {
        const issueId = controlBlock.getAttribute('data-tdc-issue') ?? '';
        const shouldBeCollapsed =
          collapsed && plugin.settings.collapsedIssues[issueId] === true;
        setIssueCollapsedDom(controlBlock, shouldBeCollapsed);
        if (shouldBeCollapsed) {
          observeContentBlockSiblings(
            controlBlock,
            () => plugin.settings.collapsedIssues[issueId] === true,
            () => {}
          );
        }
      }
    }
  }

  function toggleAllIssues(collapsed: boolean): void {
    if (dashboard === undefined) {
      return;
    }
    const currentDashboard = dashboard;
    void getDashboardIssueIds().then((issueIds) => {
      for (const issueId of issueIds) {
        if (collapsed) {
          plugin.settings.collapsedIssues[issueId] = true;
        } else {
          delete plugin.settings.collapsedIssues[issueId];
        }
      }
      void plugin.saveSettings();

      const dashboardElement = findDashboardElement(containerElement);
      if (dashboardElement !== null) {
        applyCollapseToControlBlocks(dashboardElement, collapsed);
      }

      plugin.triggerDashboardRefresh();
    });
  }

  function openDashboardSettings(): void {
    if (dashboard === undefined) {
      return;
    }
    const settingApi: unknown = Reflect.get(plugin.app, 'setting');
    if (typeof settingApi !== 'object' || settingApi === null) {
      return;
    }

    const openSettings = (settingApi as Record<string, unknown>).open;
    if (typeof openSettings === 'function') {
      Reflect.apply(openSettings, settingApi, []);
    }

    const openTabById = (settingApi as Record<string, unknown>).openTabById;
    if (typeof openTabById === 'function') {
      Reflect.apply(openTabById, settingApi, [plugin.manifest.id]);
    }

    window.setTimeout(() => {
      const selector = `.tdc-dashboard-config[data-dashboard-id="${dashboard!.id}"]`;
      const dashboardSettings = document.querySelector(selector);
      if (dashboardSettings instanceof HTMLElement) {
        dashboardSettings.scrollIntoView({ behavior: 'smooth', block: 'start' });
        dashboardSettings.focus({ preventScroll: true });
      }
    }, 120);
  }
</script>

{#if dashboard !== undefined}
  <div class="tdc-dashboard-header">
    <div class="tdc-dashboard-info">
      {#if hasFolder}
        <div class="tdc-dashboard-info-row">
          <span class="tdc-dashboard-info-label">Folder</span>
          <span class="tdc-dashboard-info-value">{projectFolder}</span>
        </div>
      {/if}
      {#if hasRepos}
        <div class="tdc-dashboard-info-row">
          <span class="tdc-dashboard-info-label">
            {linkedRepos.length === 1 ? 'Repository' : 'Repositories'}
          </span>
          <span class="tdc-dashboard-info-value">
            {#each linkedRepos as repo, index}
              {#if index > 0}, {/if}
              <a
                class="tdc-dashboard-info-link"
                href="https://github.com/{repo}"
                target="_blank"
                rel="noopener noreferrer"
                onclick={(event) => event.stopPropagation()}
              >{repo}</a>
            {/each}
          </span>
        </div>
      {/if}
    </div>

    <div class="tdc-sort-container">
      <ActionButton
        icon="plus"
        label="Add Issue"
        class="tdc-btn-action"
        onclick={() => {
          if (dashboard === undefined) { return; }
          const folder = dashboard.projectFolder;
          const hasGitFolder =
            folder !== undefined &&
            folder !== '' &&
            createPlatformService().isGitRepositoryFolder(folder);
          openIssueCreationModal(plugin.app, plugin, dashboard, {
            worktreeContext: hasGitFolder
              ? { eligible: true, worktreeOriginFolder: folder }
              : undefined
          });
        }}
      />

      <ActionButton
        icon="fileInput"
        label="Import Note"
        class="tdc-btn-action"
        onclick={() => {
          if (dashboard === undefined) { return; }
          new NoteImportModal(plugin.app, plugin, dashboard).open();
        }}
      />

      <div class="tdc-sort-wrapper">
        <ActionButton
          icon="sort"
          label="Sort"
          class="tdc-btn-action"
          onclick={(event) => {
            event.stopPropagation();
            isSortOpen = !isSortOpen;
          }}
        />

        {#if isSortOpen}
          <SortDropdown
            options={sortOptions}
            anchorElement={sortButtonElement ?? containerElement}
            onclose={() => { isSortOpen = false; }}
          />
        {/if}
      </div>

      <ActionButton
        icon="foldAll"
        label="Collapse All"
        class="tdc-btn-action tdc-btn-action-secondary"
        onclick={() => toggleAllIssues(true)}
      />

      <ActionButton
        icon="unfoldAll"
        label="Expand All"
        class="tdc-btn-action tdc-btn-action-secondary"
        onclick={() => toggleAllIssues(false)}
      />

      <ActionButton
        icon="refresh"
        label="Refresh Dashboard"
        class="tdc-btn-action tdc-btn-action-secondary"
        onclick={() => {
          if (dashboard !== undefined) {
            void refreshDashboard(plugin, dashboard);
          }
        }}
      />

      <ActionButton
        icon="rebuild"
        label="Rebuild"
        class="tdc-btn-action tdc-btn-action-secondary"
        onclick={() => {
          if (dashboard !== undefined) {
            void plugin.dashboardWriter.rebuildDashboardFromFiles(dashboard);
          }
        }}
      />

      <ActionButton
        icon="settings"
        label="Open Dashboard Settings"
        class="tdc-btn-action tdc-btn-action-secondary"
        onclick={() => {
          if (hasSettingsTabApi(plugin.app)) {
            plugin.app.setting?.openTabById(plugin.manifest.id);
          }
          openDashboardSettings();
        }}
      />

      {#if visibility?.folder}
        <ActionButton
          icon="folder"
          label={hasFolder ? 'Open project folder' : 'Set project folder'}
          class="tdc-btn-action tdc-btn-action-secondary tdc-btn-folder"
          faded={!hasFolder}
          onclick={() => handleFolderDependentClick((f) => platformService.openInFileExplorer(f))}
          oncontextmenu={(e) => { e.preventDefault(); openProjectFolderModal(); }}
        />
      {/if}

      {#if visibility?.terminal}
        <ActionButton
          icon="terminal"
          label={hasFolder ? 'Open terminal' : 'Set project folder'}
          class="tdc-btn-action tdc-btn-action-secondary tdc-btn-terminal"
          faded={!hasFolder}
          onclick={() => handleFolderDependentClick((f) => platformService.openTerminal(f))}
          oncontextmenu={(e) => { e.preventDefault(); openProjectFolderModal(); }}
        />
      {/if}

      {#if visibility?.vscode}
        <ActionButton
          icon="vscode"
          label={hasFolder ? 'Open in VS Code' : 'Set project folder'}
          class="tdc-btn-action tdc-btn-action-secondary tdc-btn-vscode"
          faded={!hasFolder}
          onclick={() => handleFolderDependentClick((f) => platformService.openVSCode(f))}
          oncontextmenu={(e) => { e.preventDefault(); openProjectFolderModal(); }}
        />
      {/if}

      {#if visibility?.github}
        <ActionButton
          icon="github"
          label={hasRepos
            ? linkedRepos.length === 1
              ? 'Open GitHub repo'
              : `Open GitHub repos (${linkedRepos.length})`
            : 'Link GitHub repository'}
          class="tdc-btn-action tdc-btn-action-secondary tdc-btn-github-quickopen"
          faded={!hasRepos}
          onclick={(event) => {
            if (linkedRepos.length === 0) {
              openRepositoryLinkerModal();
              return;
            }
            if (linkedRepos.length === 1) {
              window.open(`https://github.com/${linkedRepos[0]}`, '_blank');
              return;
            }
            const menu = new Menu();
            for (const repo of linkedRepos) {
              menu.addItem((item) => {
                item.setTitle(repo).onClick(() => {
                  window.open(`https://github.com/${repo}`, '_blank');
                });
              });
            }
            menu.showAtPosition({ x: event.clientX, y: event.clientY });
          }}
          oncontextmenu={(e) => { e.preventDefault(); openRepositoryLinkerModal(); }}
        />
      {/if}
    </div>
  </div>
{/if}

<style>
.tdc-dashboard-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tdc-sort-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-left: auto;
  min-width: 0;
  padding-right: 35px;
}

.tdc-sort-wrapper {
  display: inline-block;
  position: relative;
}

.tdc-dashboard-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.8em;
  color: var(--text-muted);
  min-width: 0;
}

.tdc-dashboard-info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.tdc-dashboard-info-label {
  font-weight: 600;
  flex-shrink: 0;
}

.tdc-dashboard-info-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.tdc-dashboard-info-link {
  color: var(--text-accent);
  text-decoration: none;
}

.tdc-dashboard-info-link:hover {
  text-decoration: underline;
}

:global(.tdc-btn-action) {
  border-radius: var(--tdc-border-radius);
  background: var(--background-modifier-hover);
}

:global(.tdc-btn-action-secondary) {
  opacity: 0.7;
}

:global(.tdc-btn-action-secondary:hover) {
  opacity: 1;
}
</style>
