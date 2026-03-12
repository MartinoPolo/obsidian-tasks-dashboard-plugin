# Svelte Migration — Phase 3: Dashboard Components

## Context & Conventions

See `SVELTE-MIGRATION.md` for full migration plan. See `SVELTE_MIGRATION_GUIDELINES.md` for coding standards.

Key reminders:
- Svelte 5 Runes API: `$props()`, `$state()`, `$state.raw()`, `$derived()`, `$effect()`
- `{@attach fn}` for tooltip, resize observer, portal
- `onclick={handler}` native event attributes
- `{#snippet}` + `{@render}` instead of slots
- `class={['base', condition && 'active']}` clsx-style
- Per-icon `.svelte` components, `<Icon name="x" />` dispatcher
- All `.tdc-*` CSS classes preserved — CSS migrates into `<style>` blocks per-component
- `$state.raw()` for API responses, git status, parsed data (read-only reassignment)

### Lessons Learned

- ESLint `strict-boolean-expressions`: never truthy-check strings/arrays — use `=== undefined`, `.length > 0`
- GitBadge a11y: suppress `oncontextmenu` warning with `<!-- svelte-ignore a11y_no_static_element_interactions -->`
- `state_referenced_locally` warning: wrap config reads in function when accessing props inside `$effect`
- `header-actions.ts` still exports `ICONS`, `createActionButton()`, `appendInlineSvgIcon()` — cannot delete until Phase 3 callers migrate
- Import paths: `src/components/` imports types from `../types`, plugin from `../../main`

---

## Phase Summary

| Phase | Status | Description |
|-------|--------|-------------|
| 0 | ✅ Done | Infrastructure: deps, esbuild, tsconfig, eslint, svelte.d.ts, attach utils |
| 1 | ✅ Done | Shared components: icons, Icon, ActionButton, GitBadge, StatePill, LoadingIndicator, ErrorDisplay |
| 2 | ✅ Done | GitHub: GitHubCard, GitHubRepoCard, GitHubCardContainer, GitHubSearchContent, thin modal shell |
| **3** | **🔄 Current** | **Dashboard: IssueCard, IssueHeader, OverflowPanel, SortControls, ProgressBar, etc.** |
| 4 | Pending | Modals: wizard, confirmation, color picker, priority selector, all modal content |
| 5 | Pending | Settings: SettingsTab, DashboardSettings, GitHubSettings |
| 6 | Pending | CSS audit: verify global vs scoped, remove dead CSS |
| 7 | Pending | Cleanup: delete replaced files, dead imports, final verification |
| 8 | Pending | Testing: vitest, component tests, CI |

---

## Phase 3 Checklist

- [ ] 3.1 Create `ProgressBar.svelte`
- [ ] 3.2 Create `IssueInfoPanel.svelte`
- [ ] 3.3 Create `OverflowPanel.svelte`
- [ ] 3.4 Create `SortDropdown.svelte`
- [ ] 3.5 Create `SortControls.svelte`
- [ ] 3.6 Create `IssueHeader.svelte`
- [ ] 3.7 Create `IssueCard.svelte`
- [ ] 3.8 Create `AssignedIssuesSection.svelte`
- [ ] 3.9 Modify `DashboardRenderer.ts`
- [ ] 3.10 Modify `dashboard-reactive-render-child.ts`
- [ ] 3.11 Keep `dashboard-issue-surface.ts` as utility
- [ ] 3.12 Delete files
- [ ] 3.13 Verify Phase 3

---

## 3.1 Create `src/components/dashboard/ProgressBar.svelte`

**Replaces**: `renderProgressBar()` from `DashboardRenderer.ts`. Smallest component — start here.

```
Props ($props):
  progress: ProgressData
  priority: string
  displayMode: ProgressDisplayMode

Derived:
  percentage = $derived(progress.total > 0 ? (progress.completed / progress.total) * 100 : 0)
  progressText = $derived.by(() => { /* format per displayMode */ })

Template:
  <div class="tdc-progress">
    <div class="tdc-progress-bar">
      <div class="tdc-progress-fill" style:width="{percentage}%"></div>
    </div>
    {#if progressText}
      <span class="tdc-progress-text">{progressText}</span>
    {/if}
  </div>
```

## 3.2 Create `src/components/dashboard/IssueInfoPanel.svelte`

**Replaces**: `createIssueInfoPanel()` closure in `DashboardRenderer.ts` (~160 lines). Portal.

```
Props ($props):
  issue: IssueData
  plugin: TasksDashboardPlugin
  anchorElement: HTMLElement
  onclose: () => void

State:
  position = $state({ top: 0, left: 0 })

Effects:
  $effect — calculate position from anchorElement.getBoundingClientRect()
  $effect — close on outside click (document listener)

Template:
  <div class="tdc-info-panel" {@attach attachPortal()}
       style:top="{position.top}px" style:left="{position.left}px">
    Issue folder, worktree path, GitHub links, timestamps
  </div>
```

## 3.3 Create `src/components/dashboard/OverflowPanel.svelte`

**Replaces**: `dashboard-overflow-panel.ts` (493 lines). Portal.

```
Props ($props):
  actions: OverflowAction[]
  anchorElement: HTMLElement
  onclose: () => void
  onaction: (key: IssueActionKey) => void

State:
  position = $state({ top: 0, left: 0 })

Effects:
  $effect — position from anchor.getBoundingClientRect()
  $effect — close on outside click + Escape key

Template:
  <div class="tdc-overflow-panel" {@attach attachPortal()}>
    {#each actions as action (action.key)}
      <button class="tdc-overflow-row" onclick={() => onaction(action.key)}>
        <Icon name={action.icon} /> <span>{action.label}</span>
      </button>
    {/each}
  </div>

Style:
  Move .tdc-overflow-* from styles.css to <style>
```

## 3.4 Create `src/components/dashboard/SortDropdown.svelte`

Portal dropdown for sort options:

```
Props ($props):
  sortField: SortField
  sortDirection: SortDirection
  anchor: HTMLElement
  onselect: (field: SortField, direction: SortDirection) => void
  onclose: () => void

Template:
  <div class="tdc-sort-dropdown" {@attach attachPortal()}>
    {#each sortOptions as option (option.field)}
      <button class={['tdc-sort-option', option.field === sortField && 'is-active']}
              onclick={() => onselect(option.field, nextDirection)}>...</button>
    {/each}
  </div>
```

## 3.5 Create `src/components/dashboard/SortControls.svelte`

**Replaces**: `sort-controls.ts` (434 lines).

```
Props ($props):
  plugin: TasksDashboardPlugin
  dashboard: DashboardData

State:
  isOpen = $state(false)
  buttonElement: HTMLButtonElement

Template:
  <ActionButton icon="sort" label="Sort" onclick={() => isOpen = !isOpen}
                bind:this={buttonElement} />
  {#if isOpen}
    <SortDropdown sortField={dashboard.sortField} sortDirection={dashboard.sortDirection}
                  anchor={buttonElement}
                  onselect={handleSort} onclose={() => isOpen = false} />
  {/if}

Style:
  Move .tdc-sort-* from styles.css to <style>
```

## 3.6 Create `src/components/dashboard/IssueHeader.svelte`

**Replaces**: `renderHeader()` from `DashboardRenderer.ts` (~500 lines). Biggest dashboard component.

```
Props ($props):
  plugin: TasksDashboardPlugin
  params: ControlParams
  dashboard: DashboardData
  actions: ActionConfig[]
  layout: LayoutConfig
  ctx: MarkdownPostProcessorContext

State:
  isCollapsed = $state(plugin.settings.collapsedIssues[params.issueId] ?? false)
  gitStatus = $state.raw<GitStatusResult | undefined>(undefined)
  isInfoPanelOpen = $state(false)
  isOverflowOpen = $state(false)
  shouldCompact = $state(false)

Derived:
  visibleRow1Actions = $derived.by(() => { /* filter by layout width */ })
  overflowActions = $derived.by(() => { /* actions that don't fit in row1 */ })
  badgeData = $derived.by(() => { /* branch/PR/issue badge props from gitStatus */ })

Effects:
  $effect — async fetch git status: void plugin.gitStatusService.getIssueGitStatus(...)
  $effect — cleanup destroyed flag

Attach:
  {@attach attachResizeObserver(handleResize)} — on header div
  {@attach attachTooltip(...)} — on collapse toggle

Template:
  <div class={['tdc-issue-header', isCollapsed && 'tdc-collapsed']}
       style:--tdc-issue-main-color={issueColor}
       {@attach attachResizeObserver(handleResize)}>

    <div class="tdc-header-row1">
      <button class="tdc-collapse-toggle" onclick={toggleCollapse}
              {@attach attachTooltip(isCollapsed ? 'Expand' : 'Collapse')}>
        <Icon name="chevron" class={isCollapsed ? 'tdc-chevron-collapsed' : ''} />
      </button>

      <a class="tdc-issue-title-link" href={internalLink}>{params.displayTitle}</a>

      {#if gitStatus}
        <div class={['tdc-badges', shouldCompact && 'tdc-badges-compact']}>
          {#if badgeData.branch}
            <GitBadge type="branch" {...badgeData.branch} />
          {/if}
          {#if badgeData.pr}
            <GitBadge type="pr" {...badgeData.pr} />
          {/if}
          {#if badgeData.issue}
            <GitBadge type="issue" {...badgeData.issue} />
          {/if}
        </div>
      {/if}

      {#each visibleRow1Actions as action (action.key)}
        <ActionButton icon={action.icon} label={action.label} onclick={action.handler} />
      {/each}

      {#if overflowActions.length > 0}
        <ActionButton icon="more" label="More actions"
                      onclick={() => isOverflowOpen = true} />
      {/if}
    </div>

    {#if isOverflowOpen}
      <OverflowPanel actions={overflowActions} anchorElement={...}
                     onclose={() => isOverflowOpen = false} onaction={handleAction} />
    {/if}

    {#if isInfoPanelOpen}
      <IssueInfoPanel issue={...} {plugin} anchorElement={...}
                      onclose={() => isInfoPanelOpen = false} />
    {/if}
  </div>
```

## 3.7 Create `src/components/dashboard/IssueCard.svelte`

**Replaces**: `render()` in `DashboardRenderer.ts`. Top-level per-issue component.

```
Props ($props):
  plugin: TasksDashboardPlugin
  source: string
  ctx: MarkdownPostProcessorContext

State:
  params = $state.raw<ControlParams | undefined>(undefined)
  dashboard = $state.raw<DashboardData | undefined>(undefined)
  progress = $state.raw<ProgressData | undefined>(undefined)

Effects:
  $effect — parse source → params, find dashboard
  $effect — async fetch progress
  $effect — sibling DOM manipulation via dashboard-issue-surface.ts (bind:this)

Template:
  {#if params && dashboard}
    <div class={['tdc-issue-container', `priority-${params.priority}`]}
         style:--tdc-issue-main-color={issueColor}>
      <IssueHeader {plugin} {params} {dashboard} {actions} {layout} {ctx} />
      {#if progress}
        <ProgressBar {progress} priority={params.priority}
                     displayMode={settings.progressDisplayMode} />
      {/if}
    </div>
  {/if}
```

## 3.8 Create `src/components/dashboard/AssignedIssuesSection.svelte`

**Replaces**: `renderAssignedIssuesSection()` from `DashboardRenderer.ts` (~200 lines).

```
Props ($props):
  plugin: TasksDashboardPlugin
  source: string
  ctx: MarkdownPostProcessorContext

State:
  repos = $state.raw<AssignedRepo[]>([])
  isLoading = $state(true)
  expandedRepos = $state<Set<string>>(new Set())
  loadingMore = $state<Set<string>>(new Set())

Effects:
  $effect — fetch assigned issues from GitHub (per-repo pagination)

Template:
  {#if isLoading}
    loading indicator
  {:else}
    {#each repos as repo (repo.fullName)}
      <details open={expandedRepos.has(repo.fullName)}>
        <summary onclick={() => toggleRepo(repo.fullName)}>
          <Icon name="github" /> {repo.fullName} ({repo.issues.length})
        </summary>
        {#each repo.issues as issue (issue.number)}
          issue row with link, add, worktree buttons
        {/each}
        {#if repo.hasMore}
          <button onclick={() => loadMore(repo)}>Load more...</button>
        {/if}
      </details>
    {/each}
  {/if}
```

## 3.9 Modify `DashboardRenderer.ts`

Shrinks from 1,144 → ~100 lines. Becomes thin mount orchestrator:
- `render(source, el, ctx)` → mounts `IssueCard.svelte`
- `renderSortButton(source, el, ctx)` → mounts `SortControls.svelte`
- `renderGitHubNoteCard(source, el, ctx)` → mounts `GitHubCardContainer.svelte`
- `renderAssignedIssuesSection(source, el, ctx)` → mounts `AssignedIssuesSection.svelte`

Each method pattern:
```ts
const component = mount(Component, { target: el, props: { plugin, source, ctx } });
const child = new MarkdownRenderChild(el);
child.register(() => unmount(component));
ctx.addChild(child);
```

Remove all helper closures: `createIssueInfoPanel`, `formatRelativeTime`, `getCachedDefaultBranch`, `buildWorktreeLocationTooltip`, `stopEventAndRun`, `renderProgressText` — moved into Svelte components or standalone utility functions.

## 3.10 Modify `dashboard-reactive-render-child.ts`

Update for Svelte lifecycle:
- On `'tasks-dashboard:refresh'` event: `unmount(component)` then `mount(Component, ...)` with fresh props
- Alternative: pass reactive `$state` prop that triggers component re-derivation

## 3.11 Keep `dashboard-issue-surface.ts` as utility

- `observeContentBlockSiblings()` and `setIssueCollapsed()` remain as pure TS
- Called from `IssueCard.svelte` via `$effect` with `bind:this` on container div
- Operates on sibling DOM outside component boundary — no Svelte migration

## 3.12 Delete files

- `src/dashboard/sort-controls.ts` (434 lines)
- `src/dashboard/dashboard-overflow-panel.ts` (493 lines)
- `src/dashboard/git-status-indicator.ts` (201 lines)
- `src/dashboard/dashboard-renderer-github-cards.ts` (126 lines)

## 3.13 Verify Phase 3

- `pnpm build` + `pnpm typecheck`
- Issue cards: correct colors, priority strips, progress bars
- Collapse/expand: state persists across refreshes
- Git badges: appear after async fetch, compact on narrow width
- Overflow panel: opens/closes, all actions work
- Info panel: positions correctly relative to trigger
- Sort controls: dropdown opens, sort applies, dashboard refreshes
- Assigned issues: repos load, pagination works, add/worktree buttons work
- Portal positioning: test at various scroll positions + window resize
- Both light and dark themes

---

## Files Created/Modified in Phase 3

```
src/components/dashboard/
  ProgressBar.svelte              — Task completion bar
  IssueInfoPanel.svelte           — Floating info panel (portal)
  OverflowPanel.svelte            — Overflow action menu (portal)
  SortDropdown.svelte             — Sort options dropdown (portal)
  SortControls.svelte             — Sort button + dropdown
  IssueHeader.svelte              — Header with badges/actions
  IssueCard.svelte                — Top-level issue container
  AssignedIssuesSection.svelte    — GitHub assigned issues tree

src/dashboard/
  DashboardRenderer.ts            — Shrinks to ~100 lines (mount orchestrator)
  dashboard-reactive-render-child.ts — Updated for Svelte lifecycle
  dashboard-issue-surface.ts      — Kept as pure TS utility

Deleted:
  src/dashboard/sort-controls.ts
  src/dashboard/dashboard-overflow-panel.ts
  src/dashboard/git-status-indicator.ts
  src/dashboard/dashboard-renderer-github-cards.ts
```
