<script lang="ts">
  import { Menu, Notice, TFile } from 'obsidian';
  import type TasksDashboardPlugin from '../../../main';
  import type { DashboardConfig } from '../../types';
  import { FolderPathModal } from '../../modals/FolderPathModal';
  import { openIssueCreationModal, openWorktreeIssueCreationModal } from '../../modals/issue-creation-modal';
  import { NoteImportModal } from '../../modals/note-import-modal';
  import { RepositoryLinkerModal } from '../../modals/RepositoryLinkerModal';
  import { hasSettingsTabApi } from '../../settings/settings-helpers';
  import { SYNC_COMMAND, SYNC_COMMAND_ARGS } from '../../constants/sync-constants';
  import { createPlatformService } from '../../utils/platform';
  import { parseDashboard } from '../../dashboard/DashboardParser';
  import { parseParams } from '../../dashboard/dashboard-renderer-params';
  import { PruneConfirmationModal, type PrunableIssueInfo } from '../../modals/prune-confirmation-modal';
  import { isFullyClosed } from '../../git-status/git-status-types';
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
  let isSyncingAll = $state(false);
  let isPruning = $state(false);
  let prunableCount = $state(0);
  let toolbarElement: HTMLDivElement | undefined = $state(undefined);
  let isToolbarCompact = $state(false);

  const platformService = createPlatformService();
  const DOM_SETTLE_DELAY_MS = 120;
  const COMPACT_TOOLBAR_WIDTH_PX = 500;

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
  let isGitRepository = $derived(
    hasFolder && projectFolder !== undefined
      ? platformService.isGitRepositoryFolder(projectFolder)
      : false
  );
  let hasUnsyncedBranches = $derived(
    dashboardId !== undefined
      ? plugin.gitStatusService.hasUnsyncedBranches(dashboardId)
      : false
  );
  let hasExternalButtons = $derived(
    visibility !== undefined &&
    (!!visibility.folder || !!visibility.terminal || !!visibility.vscode || !!visibility.github)
  );

  $effect(() => {
    if (toolbarElement === undefined) {
      return;
    }
    const element = toolbarElement;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        isToolbarCompact = entry.contentRect.width < COMPACT_TOOLBAR_WIDTH_PX;
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  });

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
    const currentDashboard = dashboard;
    new RepositoryLinkerModal(plugin, currentDashboard, (repos) => {
      if (currentDashboard === undefined) { return; }
      currentDashboard.githubRepos = repos;
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
    const dashboardData = await readDashboardContent();
    if (dashboardData === undefined) {
      return [];
    }
    const { parsed } = dashboardData;
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
    const currentDashboard = dashboard;
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
      const selector = `.tdc-dashboard-config[data-dashboard-id="${currentDashboard.id}"]`;
      const dashboardSettings = document.querySelector(selector);
      if (dashboardSettings instanceof HTMLElement) {
        dashboardSettings.scrollIntoView({ behavior: 'smooth', block: 'start' });
        dashboardSettings.focus({ preventScroll: true });
      }
    }, DOM_SETTLE_DELAY_MS);
  }

  // --- Dashboard Content Helper ---

  const CONTROLS_BLOCK_PATTERN = /```tasks-dashboard-controls\n([\s\S]*?)```/g;

  async function readDashboardContent(): Promise<{ content: string; parsed: ReturnType<typeof parseDashboard> } | undefined> {
    if (dashboard === undefined || dashboardId === undefined) {
      return undefined;
    }
    const filename = dashboard.dashboardFilename || 'Dashboard.md';
    const dashboardPath = `${dashboard.rootPath}/${filename}`;
    const file = plugin.app.vault.getAbstractFileByPath(dashboardPath);
    if (!(file instanceof TFile)) {
      return undefined;
    }
    const content = await plugin.app.vault.read(file);
    const parsed = parseDashboard(content);
    return { content, parsed };
  }

  // --- Sync All ---

  const SEQUENTIAL_SPAWN_DELAY_MS = 2000;

  interface UnsyncedBranchInfo {
    worktreeFolder: string;
  }

  async function getUnsyncedBranches(): Promise<UnsyncedBranchInfo[]> {
    if (dashboardId === undefined) {
      return [];
    }
    const dashboardData = await readDashboardContent();
    if (dashboardData === undefined) {
      return [];
    }
    const { content, parsed } = dashboardData;
    const unsyncedBranches: UnsyncedBranchInfo[] = [];

    for (const issue of parsed.activeIssues) {
      const issueContent = content.substring(issue.startIndex, issue.endIndex);
      for (const match of issueContent.matchAll(CONTROLS_BLOCK_PATTERN)) {
        const controlBlockContent = match[1];
        const controlParams = parseParams(controlBlockContent);
        if (controlParams === null) {
          continue;
        }
        const worktreeFolder = controlParams.worktree_expected_folder;
        if (worktreeFolder === undefined || worktreeFolder === '') {
          continue;
        }
        const cachedStatus = plugin.gitStatusService.getCachedStatus(dashboardId, issue.id);
        if (cachedStatus === undefined) {
          continue;
        }
        const behindCount = cachedStatus.behindBaseCount;
        if (behindCount === undefined || behindCount <= 0) {
          continue;
        }
        unsyncedBranches.push({
          worktreeFolder
        });
      }
    }

    return unsyncedBranches;
  }

  async function handleSyncAllBranches(): Promise<void> {
    if (isSyncingAll) {
      return;
    }
    isSyncingAll = true;

    try {
      const unsyncedBranches = await getUnsyncedBranches();
      if (unsyncedBranches.length === 0) {
        new Notice('No branches need syncing.');
        return;
      }

      new Notice(`Syncing ${unsyncedBranches.length} branch${unsyncedBranches.length === 1 ? '' : 'es'}...`);

      for (let index = 0; index < unsyncedBranches.length; index++) {
        const branch = unsyncedBranches[index];
        platformService.openTerminalWithCommand(
          branch.worktreeFolder,
          SYNC_COMMAND,
          [...SYNC_COMMAND_ARGS]
        );
        // Wait between sequential spawns (skip delay after the last one)
        const isLastBranch = index === unsyncedBranches.length - 1;
        if (!isLastBranch) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, SEQUENTIAL_SPAWN_DELAY_MS);
          });
        }
      }
    } finally {
      isSyncingAll = false;
    }
  }

  // --- Prune Closed Worktrees ---

  let cachedPrunableIssues: PrunableIssueInfo[] = [];
  let prunableCountUpdateInProgress = false;

  async function getPrunableIssues(): Promise<PrunableIssueInfo[]> {
    if (dashboardId === undefined) {
      return [];
    }
    const dashboardData = await readDashboardContent();
    if (dashboardData === undefined) {
      return [];
    }
    const { content, parsed } = dashboardData;
    const prunableIssues: PrunableIssueInfo[] = [];

    for (const issue of parsed.activeIssues) {
      const issueContent = content.substring(issue.startIndex, issue.endIndex);
      for (const match of issueContent.matchAll(CONTROLS_BLOCK_PATTERN)) {
        const controlBlockContent = match[1];
        const controlParams = parseParams(controlBlockContent);
        if (controlParams === null || controlParams.worktree !== true) {
          continue;
        }
        const branchName = controlParams.worktree_branch;
        if (branchName === undefined || branchName === '') {
          continue;
        }
        const cachedStatus = plugin.gitStatusService.getCachedStatus(dashboardId, issue.id);
        if (cachedStatus === undefined) {
          continue;
        }
        if (isFullyClosed(cachedStatus)) {
          prunableIssues.push({
            issueId: issue.id,
            issueName: issue.name,
            branchName
          });
        }
      }
    }

    return prunableIssues;
  }

  function updatePrunableCount(): void {
    if (prunableCountUpdateInProgress) {
      return;
    }
    prunableCountUpdateInProgress = true;
    void getPrunableIssues().then((issues) => {
      cachedPrunableIssues = issues;
      prunableCount = issues.length;
      prunableCountUpdateInProgress = false;
    });
  }

  // Reactively update prunable count when git status data changes
  $effect(() => {
    if (dashboardId === undefined) {
      prunableCount = 0;
      return;
    }
    // Access hasUnsyncedBranches to trigger re-evaluation when git status cache updates
    void hasUnsyncedBranches;
    updatePrunableCount();
  });

  let hasPrunableWorktrees = $derived(prunableCount > 0);

  async function archiveIssuesSequentially(
    currentDashboard: DashboardConfig,
    issues: PrunableIssueInfo[]
  ): Promise<number> {
    let archivedCount = 0;
    for (const issue of issues) {
      try {
        await plugin.issueManager.archiveIssue(currentDashboard, issue.issueId);
        archivedCount++;
      } catch {
        new Notice(`Could not archive: ${issue.issueName}`);
      }
    }
    return archivedCount;
  }

  async function handlePruneWorktrees(): Promise<void> {
    if (isPruning || dashboard === undefined) {
      return;
    }
    isPruning = true;

    try {
      // Use cached results if available, otherwise fetch
      const prunableIssues = cachedPrunableIssues.length > 0
        ? cachedPrunableIssues
        : await getPrunableIssues();

      if (prunableIssues.length === 0) {
        new Notice('No closed worktrees to prune.');
        return;
      }

      const currentDashboard = dashboard;

      new PruneConfirmationModal(plugin.app, prunableIssues, (confirmed) => {
        if (!confirmed) {
          isPruning = false;
          return;
        }

        const branchNames = prunableIssues.map((issue) => issue.branchName);
        const launched = platformService.runBulkWorktreeRemovalScript(
          branchNames,
          currentDashboard.projectFolder
        );

        if (!launched) {
          new Notice('Could not launch worktree removal script.');
          isPruning = false;
          return;
        }

        // Archive sequentially to avoid concurrent file write races
        void archiveIssuesSequentially(currentDashboard, prunableIssues).then((archivedCount) => {
          const total = prunableIssues.length;
          if (archivedCount === total) {
            new Notice(`Pruned ${total} worktree${total === 1 ? '' : 's'} and archived ${total} issue${total === 1 ? '' : 's'}.`);
          } else {
            new Notice(`Pruned ${total} worktree${total === 1 ? '' : 's'}. Archived ${archivedCount} of ${total} issue${total === 1 ? '' : 's'}.`);
          }
          plugin.triggerDashboardRefresh();
          updatePrunableCount();
          isPruning = false;
        });
      }).open();
    } catch {
      isPruning = false;
    }
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
            {#each linkedRepos as repo, index (repo)}
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

    <div class="tdc-sort-container" bind:this={toolbarElement}>
      <!-- Group 1: Create -->
      <div class="tdc-toolbar-group">
        <ActionButton
          icon="plus"
          label="Add Issue"
          onclick={() => {
            if (dashboard === undefined) { return; }
            const folder = dashboard.projectFolder;
            const hasGitFolder =
              folder !== undefined &&
              folder !== '' &&
              platformService.isGitRepositoryFolder(folder);
            openIssueCreationModal(plugin.app, plugin, dashboard, {
              worktreeContext: hasGitFolder
                ? { eligible: true, worktreeOriginFolder: folder }
                : undefined
            });
          }}
        />

        {#if visibility?.github}
          <ActionButton
            icon="worktree"
            label={isGitRepository ? 'Add issue in worktree' : 'Set project folder for worktree'}
            faded={!isGitRepository}
            onclick={() => {
              if (dashboard === undefined) { return; }
              if (!isGitRepository) {
                if (!hasFolder) {
                  openProjectFolderModal();
                  return;
                }
                new Notice('Project folder must be a Git repository to create worktrees.');
                return;
              }
              openWorktreeIssueCreationModal(plugin.app, plugin, dashboard, {
                worktreeOriginFolder: projectFolder
              });
            }}
            oncontextmenu={(event) => { event.preventDefault(); openProjectFolderModal(); }}
          />
        {/if}

        {#if !isToolbarCompact}
          <ActionButton
            icon="fileInput"
            label="Import Note"
            onclick={() => {
              if (dashboard === undefined) { return; }
              new NoteImportModal(plugin.app, plugin, dashboard).open();
            }}
          />
        {/if}
      </div>

      <!-- Group 2: View -->
      <div class="tdc-toolbar-group">
        <ActionButton
          icon="foldAll"
          label="Collapse All"
          onclick={() => toggleAllIssues(true)}
        />

        <ActionButton
          icon="unfoldAll"
          label="Expand All"
          onclick={() => toggleAllIssues(false)}
        />

        <div class="tdc-sort-wrapper">
          <ActionButton
            icon="sort"
            label="Sort"
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
      </div>

      <!-- Group 3: External -->
      {#if hasExternalButtons}
        <div class="tdc-toolbar-group">
          {#if visibility?.folder}
            <ActionButton
              icon="folder"
              label={hasFolder ? 'Open project folder' : 'Set project folder'}
              faded={!hasFolder}
              onclick={() => handleFolderDependentClick((f) => platformService.openInFileExplorer(f))}
              oncontextmenu={(e) => { e.preventDefault(); openProjectFolderModal(); }}
            />
          {/if}

          {#if visibility?.terminal}
            <ActionButton
              icon="terminal"
              label={hasFolder ? 'Open terminal' : 'Set project folder'}
              faded={!hasFolder}
              onclick={() => handleFolderDependentClick((f) => platformService.openTerminal(f))}
              oncontextmenu={(e) => { e.preventDefault(); openProjectFolderModal(); }}
            />
          {/if}

          {#if visibility?.vscode}
            <ActionButton
              icon="vscode"
              label={hasFolder ? 'Open in VS Code' : 'Set project folder'}
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
      {/if}

      <!-- Group 4: Sync -->
      <div class="tdc-toolbar-group">
        <ActionButton
          icon="sync"
          label={isSyncingAll ? 'Syncing all branches...' : hasUnsyncedBranches ? 'Sync all un-synced branches' : 'All branches are synced'}
          faded={!hasUnsyncedBranches || isSyncingAll}
          disabled={!hasUnsyncedBranches || isSyncingAll}
          onclick={() => {
            if (hasUnsyncedBranches && !isSyncingAll) {
              void handleSyncAllBranches();
            }
          }}
        />

        <ActionButton
          icon="scissors"
          label={isPruning ? 'Pruning worktrees...' : hasPrunableWorktrees ? `Prune ${prunableCount} closed worktree${prunableCount === 1 ? '' : 's'}` : 'No closed worktrees to prune'}
          faded={!hasPrunableWorktrees || isPruning}
          disabled={!hasPrunableWorktrees || isPruning}
          onclick={() => {
            if (hasPrunableWorktrees && !isPruning) {
              void handlePruneWorktrees();
            }
          }}
        />
      </div>

      <!-- Group 5: Maintain -->
      <div class="tdc-toolbar-group">
        <ActionButton
          icon="refresh"
          label="Refresh Dashboard"
          onclick={() => {
            if (dashboard !== undefined) {
              void refreshDashboard(plugin, dashboard);
            }
          }}
        />

        {#if !isToolbarCompact}
          <ActionButton
            icon="rebuild"
            label="Rebuild"
            onclick={() => {
              if (dashboard !== undefined) {
                void plugin.dashboardWriter.rebuildDashboardFromFiles(dashboard);
              }
            }}
          />
        {/if}
      </div>

      <!-- Group 6: Config -->
      <div class="tdc-toolbar-group tdc-toolbar-group-config">
        <ActionButton
          icon="settings"
          label="Open Dashboard Settings"
          onclick={() => {
            if (hasSettingsTabApi(plugin.app)) {
              plugin.app.setting?.openTabById(plugin.manifest.id);
            }
            openDashboardSettings();
          }}
        />
      </div>
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
  gap: 16px;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-left: auto;
  min-width: 0;
  padding-right: 35px;
}

.tdc-toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tdc-toolbar-group-config {
  margin-left: auto;
  order: 999;
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


</style>
