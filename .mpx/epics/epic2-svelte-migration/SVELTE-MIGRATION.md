# Svelte 5 Big-Bang Migration Plan

## Context

16,264 lines across 73 TS files. All UI: vanilla DOM (`createElement`, `classList`, `appendChild`). Biggest files: `issue-creation-modal.ts` (1396), `DashboardRenderer.ts` (1144), `GitHubSearchModal.ts` (965). Migration to Svelte 5 Runes API: declarative templates, scoped CSS, reactive state, testable components. Compiles to vanilla JS with zero runtime overhead.

**Decisions**: Full scope (all UI), big-bang strategy, Svelte 5 Runes API, `{@attach}` over `use:action`.

## Conventions

All components use Svelte 5 Runes mode. See `SVELTE_MIGRATION_GUIDELINES.md` for detailed coding standards.

Key conventions:
- `$props()` with `interface Props` — all component inputs
- `$state()` — only for reactive variables that cause template updates
- `$state.raw()` — for large objects that are only reassigned (API responses, git status)
- `$derived()` / `$derived.by()` — computed values, never `$effect` for derivations
- `$effect()` — escape hatch only: async fetch, DOM measurement, external library sync
- `{@attach fn}` — for tooltip, resize observer, portal (replaces `use:action`)
- `onclick={handler}` — native event attributes, not `on:click`
- `{#snippet name(params)}` + `{@render name(args)}` — reusable template chunks, not slots
- `{#each items as item (item.id)}` — always keyed
- `class={['base', condition && 'active']}` — clsx-style, not `class:` directive
- `style:--custom-prop={value}` — CSS custom properties from JS
- Per-icon `.svelte` components in `src/components/icons/` — type-safe, tree-shakeable, no `{@html}` for icons

---

## Lessons Learned & Pitfalls

Mistakes and dead ends encountered during migration. Consult before implementing.

### Strict Boolean Expressions
ESLint enforces `@typescript-eslint/strict-boolean-expressions: error`. Never use truthy checks on strings/arrays — always use `=== undefined`, `.length > 0`, `!== ''`.

**Example**: `attach-portal.ts` initially used `if (className)` which failed lint. Fixed to `className !== undefined && className !== ''`.

### GitBadge a11y Warning
Svelte warns about `oncontextmenu` on non-interactive `<span>`. Suppressed with `<!-- svelte-ignore a11y_no_static_element_interactions -->` since context menu is secondary interaction (right-click).

### Svelte "state_referenced_locally" Warning
In `GitHubSearchContent.svelte`, config resolution was wrapped in a `resolveConfig()` function to avoid Svelte "state_referenced_locally" warnings when reading props inside `$effect`.

### Old Code Coexistence
`header-actions.ts` still exports `ICONS`, `createActionButton()`, `appendInlineSvgIcon()` used by non-migrated code (`DashboardRenderer.ts`, `dashboard-overflow-panel.ts`, `sort-controls.ts`, `git-status-indicator.ts`). Cannot delete until all callers are migrated in Phase 3.

### CSS Class Preservation
All `.tdc-*` CSS classes must be preserved exactly during migration — `styles.css` references them. CSS migrates into component `<style>` blocks per-phase as each component is created.

### Import Path Conventions
Components in `src/components/` import types from `../types`, plugin from `../../main`. Components in subdirs (e.g., `github/`) go one level deeper.

---

## Phase 0: Infrastructure

- [x] 0.1 Install dependencies
- [x] 0.2 Configure esbuild (`esbuild.config.mjs`)
- [x] 0.3 Configure TypeScript (`tsconfig.json`)
- [x] 0.4 Configure ESLint (`eslint.config.js`)
- [x] 0.5 Create `src/svelte.d.ts`
- [x] 0.6 Per-icon Svelte components (`src/components/icons/`)
- [x] 0.7 Create `src/lib/attach-tooltip.ts`
- [x] 0.8 Create `src/lib/attach-resize-observer.ts`
- [x] 0.9 Create `src/lib/attach-portal.ts`
- [x] 0.10 Verify build
- [x] 0.11 Smoke test Svelte compilation

### 0.1 Install dependencies
```
pnpm add -D svelte esbuild-svelte svelte-check
```

### 0.2 Configure esbuild (`esbuild.config.mjs`)
- Import `esbuildSvelte` from `esbuild-svelte`
- Add to `plugins` array before other plugins:
  ```js
  esbuildSvelte({ compilerOptions: { css: 'injected', runes: true } })
  ```
- `css: 'injected'` — embeds component `<style>` into JS bundle (no separate CSS per component)
- `runes: true` — enforces Svelte 5 Runes mode, disables legacy `$:` and `on:` syntax

### 0.3 Configure TypeScript (`tsconfig.json`)
- Add `"**/*.svelte"` to `include` array
- Verify `"moduleResolution"` supports `.svelte` imports

### 0.4 Configure ESLint (`eslint.config.js`)
- Add `"**/*.svelte"` to `ignores` array
- Svelte-specific ESLint rules deferred to Phase 8

### 0.5 Create `src/svelte.d.ts`
Type declarations for `.svelte` file imports:
```ts
declare module '*.svelte' {
  import type { Component } from 'svelte';
  const component: Component;
  export default component;
}
```

### 0.6 Per-icon Svelte components (`src/components/icons/`)

**Goal**: Each icon = independent `.svelte` component. Type-safe, tree-shakeable, no `{@html}`.

**Architecture**: Per-icon components with shared `IconBase.svelte` wrapper.

```
src/components/icons/
  IconBase.svelte              <- shared SVG wrapper (viewBox, size, class, stroke/fill defaults)
  TrashIcon.svelte             <- 43 individual icon components
  ArchiveIcon.svelte
  ChevronIcon.svelte
  GitPrOpenIcon.svelte
  ... (43 total)
  index.ts                     <- re-exports all, ICON_COMPONENTS map, IconName type
```

**IconBase.svelte**: Shared SVG wrapper — each icon imports it and passes SVG paths as `children` snippet. Props: `viewBox`, `fill`, `stroke`, `strokeWidth`, `size`, `class`, `children`.

**Per-icon pattern (stroke icon)**:
```svelte
<script lang="ts">
  import IconBase from './IconBase.svelte';
  interface Props { size?: number; class?: string; }
  let { size, class: className }: Props = $props();
</script>

<IconBase {size} class={className}>
  <path d="M3 6h18"/>
  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
</IconBase>
```

**Per-icon pattern (fill icon, different viewBox)**:
```svelte
<IconBase viewBox="0 0 16 16" fill="currentColor" stroke="none" strokeWidth="0" {size} class={className}>
  <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251..."/>
</IconBase>
```

**index.ts**: Re-exports all icons + dispatcher map:
```ts
export const ICON_COMPONENTS = {
  trash: TrashIcon,
  archive: ArchiveIcon,
  // ... all 43
} as const;

export type IconName = keyof typeof ICON_COMPONENTS;
```

**Icon inventory (43 entries)**: 35 stroke (24x24), 1 fill (24x24: vscode), 7 fill (16x16: git octicons).

### 0.7 Create `src/lib/attach-tooltip.ts`
`{@attach}` function wrapping Obsidian's `setTooltip`:
```ts
import { setTooltip } from 'obsidian';

export function attachTooltip(text: string, delay = 500) {
  return (node: HTMLElement) => {
    setTooltip(node, text, { delay });
  };
}
```
Usage: `<button {@attach attachTooltip('Click to expand')}>`

### 0.8 Create `src/lib/attach-resize-observer.ts`
`{@attach}` function wrapping ResizeObserver with auto-disconnect:
```ts
export function attachResizeObserver(callback: ResizeObserverCallback) {
  return (node: HTMLElement) => {
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(callback);
    observer.observe(node);
    return () => observer.disconnect();
  };
}
```

### 0.9 Create `src/lib/attach-portal.ts`
`{@attach}` function for portal pattern (overlay elements appended to `document.body`):
```ts
export function attachPortal(className?: string) {
  return (node: HTMLElement) => {
    if (className !== undefined && className !== '') node.classList.add(className);
    document.body.appendChild(node);
    return () => node.remove();
  };
}
```

### 0.10 Verify build
- `pnpm build` succeeds with no errors
- `pnpm typecheck` succeeds
- `pnpm lint` succeeds
- Plugin loads in Obsidian, no regressions

### 0.11 Smoke test Svelte compilation
- Create `src/components/Test.svelte` — trivial component with `$state` counter + `{@attach}`
- Import and mount from a TS file temporarily
- `pnpm build` — verify Svelte compiles and bundles correctly
- Confirm `{@attach}` syntax compiles (if not, fall back to `use:action` and rename attach files)
- Delete `Test.svelte` and undo the import

---

## Phase 1: Shared Components (leaf nodes)

- [x] 1.1 Create `Icon.svelte` as dispatcher
- [x] 1.2 Create `ActionButton.svelte`
- [x] 1.3 Create `GitBadge.svelte`
- [x] 1.4 Create shared wrapper components (`StatePill`, `LoadingIndicator`, `ErrorDisplay`)
- [ ] 1.5 Update `header-actions.ts` — **deferred**: still has `ICONS`, `createActionButton()`, `appendInlineSvgIcon()` used by non-migrated callers. Clean up when callers migrate in Phase 3
- [ ] 1.6 Verify Phase 1

### 1.1 Rewrite `src/components/Icon.svelte` as dispatcher

**Replaces**: Direct `{@html}` rendering with component delegation.

```svelte
<script lang="ts">
  import { ICON_COMPONENTS, type IconName } from './icons/index';

  interface Props {
    name: IconName;
    size?: number;
    class?: string;
  }

  let { name, size = 16, class: className }: Props = $props();
  let IconComponent = $derived(ICON_COMPONENTS[name]);
</script>

<IconComponent {size} class={className} />
```

Consumers use same API as before: `<Icon name="trash" size={16} />`. No breaking change.

### 1.2 Create `src/components/ActionButton.svelte`
**Replaces**: `createActionButton()` from `header-actions.ts` (~50 call sites).

```
Props ($props):
  icon: IconName
  label: string               — tooltip text + aria-label
  class?: string
  labelText?: string           — visible text label beside icon
  faded?: boolean              — applies 'tdc-btn-fade'
  onclick: (e: MouseEvent) => void
  oncontextmenu?: (e: MouseEvent) => void

Template:
  <button
    class={['tdc-btn', className, faded && 'tdc-btn-fade']}
    aria-label={label}
    {onclick}
    {oncontextmenu}
    {@attach attachTooltip(label)}
  >
    <Icon name={icon} size={16} />
    {#if labelText}<span class="tdc-btn-label">{labelText}</span>{/if}
  </button>
```

### 1.3 Create `src/components/GitBadge.svelte`
**Replaces**: `renderBranchBadge()`, `renderPrBadge()`, `renderIssueBadge()` from `git-status-indicator.ts` (201 lines).

```
Props ($props):
  type: 'branch' | 'pr' | 'issue'
  icon: IconName
  text: string
  tooltip: string
  class?: string               — state CSS class (e.g., 'tdc-pr-accent-merged')
  href?: string                — if set, renders <a> instead of <span>
  oncontextmenu?: (e: MouseEvent) => void

Template:
  {#if href}
    <a class={['tdc-git-badge', `tdc-git-badge-${type}`, className]}
       {href} target="_blank" rel="noopener"
       {@attach attachTooltip(tooltip, 300)}>
      <Icon name={icon} size={14} /> {text}
    </a>
  {:else}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span class={['tdc-git-badge', `tdc-git-badge-${type}`, className]}
          {oncontextmenu}
          {@attach attachTooltip(tooltip, 300)}>
      <Icon name={icon} size={14} /> {text}
    </span>
  {/if}
```

### 1.4 Create shared wrapper components

**Extracted patterns** — reusable styled wrappers for repeated UI patterns:

| Component | Replaces | Used by |
|---|---|---|
| `StatePill.svelte` | `<span class="tdc-gh-state tdc-gh-state-${stateClass}">` | GitHubCard, GitHubRepoCard, GitHubSearchContent |
| `LoadingIndicator.svelte` | `<div class="tdc-gh-loading">` pattern | GitHubCardContainer, GitHubSearchContent, AssignedIssuesSection |
| `ErrorDisplay.svelte` | `<div class="tdc-gh-error">` pattern | GitHubCardContainer, GitHubSearchContent |

Each owns its scoped `<style>` block. Props: `class`, `children` (Snippet), plus component-specific props.

### 1.5 Update `header-actions.ts`
- Remove `ICONS` object (now in `src/components/icons/`)
- Remove `parseInlineSvg()`, `appendInlineSvgIcon()`, `createActionButton()`
- Keep `renderGlobalActionButtons()` temporarily — update to use imperative Svelte `mount()` or keep DOM approach until Phase 3
- Update all importers: `DashboardRenderer.ts`, `dashboard-overflow-panel.ts`, `sort-controls.ts`, `git-status-indicator.ts`, `GitHubSearchModal.ts`

### 1.6 Verify Phase 1
- `pnpm build` + `pnpm typecheck`
- Plugin loads, all icons render correctly (compare against pre-migration screenshots)
- Action buttons show tooltips on hover (delay 500ms)
- Git badges display with correct icons, colors, and state classes
- Test both light and dark themes

---

## Phase 2: GitHub Components

- [x] 2.1 Create `GitHubCard.svelte`
- [x] 2.2 Create `GitHubRepoCard.svelte`
- [x] 2.3 Create `GitHubCardContainer.svelte`
- [x] 2.4 Create `GitHubSearchContent.svelte`
- [x] 2.5 Modify `GitHubSearchModal.ts` → thin shell
- [x] 2.6 Modify `dashboard-renderer-github-cards.ts`
- [x] 2.7 Delete `src/github/GitHubCardRenderer.ts`
- [ ] 2.8 Verify Phase 2

### 2.1 Create `src/components/github/GitHubCard.svelte`
**Replaces**: `GitHubCardRenderer.ts` (472 lines). Pure presentational.

```
Props ($props):
  metadata: GitHubMetadata      — $state.raw (read-only API response)
  displayMode: 'minimal' | 'compact' | 'full'
  onrefresh: () => void
  onunlink?: () => void

Template:
  <div class={['tdc-gh-card', `tdc-gh-card-${displayMode}`]}>
    {#if displayMode === 'minimal'}
      <!-- title + type icon only -->
    {:else if displayMode === 'compact'}
      <!-- title + stats row (state, comments, date) -->
    {:else}
      <!-- full: description, labels, stats, assignees -->
    {/if}
    <div class="tdc-gh-card-actions">
      <ActionButton icon="refreshCard" label="Refresh" onclick={onrefresh} />
      {#if onunlink}
        <ActionButton icon="unlink" label="Unlink" onclick={onunlink} />
      {/if}
    </div>
  </div>

Style:
  Move .tdc-gh-card* CSS from styles.css into <style> block
```

### 2.2 Create `src/components/github/GitHubRepoCard.svelte`
**Replaces**: Repo-specific rendering from `GitHubCardRenderer.ts`.

```
Props ($props):
  repo: GitHubRepoMetadata     — $state.raw

Template:
  Repo name, description, language, stars (<Icon name="star"/>),
  forks (<Icon name="fork"/>), open issues count
```

### 2.3 Create `src/components/github/GitHubCardContainer.svelte`
**Replaces**: `dashboard-renderer-github-cards.ts` (126 lines). Async data loader.

```
Props ($props):
  plugin: TasksDashboardPlugin
  source: string                — raw code block content

State:
  metadata = $state.raw<GitHubMetadata | undefined>(undefined)
  error = $state<string | undefined>(undefined)
  isLoading = $state(true)

Effects:
  $effect — parse source, fetch metadata from plugin.githubService, update state

Template:
  {#if isLoading}
    <div class="tdc-gh-card-loading">Loading...</div>
  {:else if error}
    <div class="tdc-gh-card-error">{error}</div>
  {:else if metadata}
    <GitHubCard {metadata} displayMode={computedMode}
                onrefresh={handleRefresh} onunlink={handleUnlink} />
  {/if}
```

### 2.4 Create `src/components/github/GitHubSearchContent.svelte`
**Replaces**: Inner DOM of `GitHubSearchModal.ts` (965 lines). Modal shell class stays.

```
Props ($props):
  plugin: TasksDashboardPlugin
  dashboard: DashboardData
  scopeOptions: ScopeOption[]
  onselect: (result: GitHubSearchResult) => void
  oncancel: () => void

State:
  searchQuery = $state('')
  scope = $state<ScopeOption>(scopeOptions[0])
  results = $state.raw<GitHubSearchResult[]>([])
  selectedIndex = $state(0)
  isLoading = $state(false)
  error = $state<string | undefined>(undefined)

Derived:
  hasResults = $derived(results.length > 0)

Effects:
  $effect — debounced search (300ms) when searchQuery or scope changes
    Uses plugin.githubService.search(...)
    Resets selectedIndex to 0

Template:
  <div class="tdc-gh-search">
    <input bind:value={searchQuery} placeholder="Search GitHub..." />
    <select bind:value={scope}>{#each scopeOptions as opt (opt.value)}...{/each}</select>
    {#if isLoading}...loading...
    {:else if error}...error...
    {:else}
      {#each results as result, i (result.id)}
        <div class={['tdc-gh-search-result', i === selectedIndex && 'is-selected']}
             onclick={() => onselect(result)}>...</div>
      {/each}
    {/if}
  </div>

Keyboard:
  <svelte:window onkeydown={handleKeydown} />
  ArrowUp/Down → navigate selectedIndex
  Enter → select current
  Escape → oncancel()
```

### 2.5 Modify `GitHubSearchModal.ts` → thin shell
- Keep `class GitHubSearchModal extends Modal`
- `onOpen()`: mount `GitHubSearchContent.svelte` into `this.contentEl`
- `onClose()`: unmount component
- Shrinks from 965 → ~40 lines

### 2.6 Modify `dashboard-renderer-github-cards.ts`
- Replace `renderGitHubCardWithRefresh()` with mounting `GitHubCardContainer.svelte`
- Keep function signature for `DashboardRenderer.ts` compatibility

### 2.7 Delete `src/github/GitHubCardRenderer.ts`

### 2.8 Verify Phase 2
- `pnpm build` + `pnpm typecheck`
- GitHub cards render in all 3 display modes (minimal/compact/full)
- GitHub search: query, keyboard nav, select, cancel
- Card refresh fetches new data
- Unlink removes GitHub association
- Test with repos, PRs, and issues

---

## Phase 3: Dashboard Components

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

### 3.1 Create `src/components/dashboard/ProgressBar.svelte`
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

### 3.2 Create `src/components/dashboard/IssueInfoPanel.svelte`
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

### 3.3 Create `src/components/dashboard/OverflowPanel.svelte`
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

### 3.4 Create `src/components/dashboard/SortDropdown.svelte`
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

### 3.5 Create `src/components/dashboard/SortControls.svelte`
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

### 3.6 Create `src/components/dashboard/IssueHeader.svelte`
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

### 3.7 Create `src/components/dashboard/IssueCard.svelte`
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

### 3.8 Create `src/components/dashboard/AssignedIssuesSection.svelte`
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

### 3.9 Modify `DashboardRenderer.ts`
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

### 3.10 Modify `dashboard-reactive-render-child.ts`
Update for Svelte lifecycle:
- On `'tasks-dashboard:refresh'` event: `unmount(component)` then `mount(Component, ...)` with fresh props
- Alternative: pass reactive `$state` prop that triggers component re-derivation

### 3.11 Keep `dashboard-issue-surface.ts` as utility
- `observeContentBlockSiblings()` and `setIssueCollapsed()` remain as pure TS
- Called from `IssueCard.svelte` via `$effect` with `bind:this` on container div
- Operates on sibling DOM outside component boundary — no Svelte migration

### 3.12 Delete files
- `src/dashboard/sort-controls.ts` (434 lines)
- `src/dashboard/dashboard-overflow-panel.ts` (493 lines)
- `src/dashboard/git-status-indicator.ts` (201 lines)
- `src/dashboard/dashboard-renderer-github-cards.ts` (126 lines)

### 3.13 Verify Phase 3
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

## Phase 4: Modal Components

- [ ] 4.1 Create `ModalLayout.svelte`
- [ ] 4.2 Create `ConfirmationDialog.svelte`
- [ ] 4.3 Create `ColorPicker.svelte`
- [ ] 4.4 Create `PrioritySelector.svelte`
- [ ] 4.5 Create `IssueCreationWizard.svelte`
- [ ] 4.6 Create wizard sub-step components
- [ ] 4.7 Create `WorktreeRetryContent.svelte`
- [ ] 4.8 Create remaining modal content components
- [ ] 4.9 Convert modal shell files to thin wrappers
- [ ] 4.10 Delete files
- [ ] 4.11 Verify Phase 4

### Pattern
Every modal keeps `extends Modal` (Obsidian API requirement). `onOpen()` mounts Svelte. `onClose()` unmounts.

```ts
import { mount, unmount } from 'svelte';
import Content from '../components/modals/Content.svelte';

class SomeModal extends Modal {
  private component: ReturnType<typeof mount> | undefined;

  onOpen() {
    this.component = mount(Content, {
      target: this.contentEl,
      props: { plugin: this.plugin, onclose: () => this.close() }
    });
  }

  onClose() {
    if (this.component) unmount(this.component);
    this.contentEl.empty();
  }
}
```

### 4.1 Create `src/components/modals/ModalLayout.svelte`
**Replaces**: `modal-helpers.ts` shared functions.

```
Props ($props):
  title: string
  children: Snippet
  actions?: Snippet
  onsubmit?: () => void
  class?: string

Template:
  <div class={['tdc-modal-content', className]}>
    <h2 class="tdc-modal-title">{title}</h2>
    <div class="tdc-modal-body">{@render children()}</div>
    {#if actions}
      <div class="tdc-modal-actions">{@render actions()}</div>
    {/if}
  </div>
  <svelte:window onkeydown={handleKeydown} />
```

### 4.2 Create `src/components/modals/ConfirmationDialog.svelte`
**Replaces**: `DeleteConfirmationModal`, `ArchiveConfirmationModal`, `DashboardDeleteConfirmationModal` DOM (~375 lines).

```
Props ($props):
  title: string
  message: string
  confirmLabel?: string       — default: 'Confirm'
  confirmClass?: string       — default: 'mod-warning'
  onconfirm: () => void
  oncancel: () => void
```

### 4.3 Create `src/components/modals/ColorPicker.svelte`
**Replaces**: `ColorPromptModal` from `issue-creation-modal.ts`.

```
Props: currentColor, colorOptions, onselect, oncancel
State: selectedColor = $state(currentColor), customColor = $state('')
Template: color grid + custom input + confirm/cancel
```

### 4.4 Create `src/components/modals/PrioritySelector.svelte`
**Replaces**: `PriorityPromptModal` + `PrioritySelectionModal`.

```
Props: currentPriority, priorities, onselect, oncancel
State: selectedIndex = $state(...)
Keyboard: <svelte:window onkeydown={...} /> — ArrowUp/Down, Enter, Escape
```

### 4.5 Create `src/components/modals/IssueCreationWizard.svelte`
**Replaces**: 5 chained modal classes from `issue-creation-modal.ts` (1396 lines). Single multi-step wizard.

```
Props ($props):
  plugin: TasksDashboardPlugin
  dashboard: DashboardData
  onclose: () => void
  oncreate: (issueData: NewIssueData) => void

State:
  step = $state<'name' | 'github' | 'worktree' | 'color' | 'priority'>('name')
  issueData = $state<Partial<NewIssueData>>({})

Template:
  {#if step === 'name'}
    <NameStep bind:name={issueData.name} onnext={() => step = 'github'} />
  {:else if step === 'github'}
    <GitHubStep {plugin} {dashboard} bind:githubLink={issueData.githubLink}
                onnext={() => step = 'worktree'} onback={() => step = 'name'} />
  {:else if step === 'worktree'}
    <WorktreeStep {plugin} bind:worktree={issueData.worktree}
                  onnext={() => step = 'color'} onback={() => step = 'github'} />
  {:else if step === 'color'}
    <ColorPicker ... onselect={(c) => { issueData.color = c; step = 'priority'; }} />
  {:else if step === 'priority'}
    <PrioritySelector ... onselect={(p) => { issueData.priority = p; oncreate(...); }} />
  {/if}

Keyboard:
  <svelte:window onkeydown={handleKeydown} />
  Escape → go back one step or close
  Backspace (when input not focused) → go back
```

### 4.6 Create wizard sub-step components
| Component | Purpose |
|---|---|
| `NameStep.svelte` | Issue name input + validation |
| `GitHubStep.svelte` | GitHub linking: search, manual URL, or skip |
| `WorktreeStep.svelte` | Worktree creation toggle + path selection |

### 4.7 Create `src/components/modals/WorktreeRetryContent.svelte`
**Replaces**: `worktree-retry-modal.ts` DOM (257 lines).

### 4.8 Create remaining modal content components
| Component | Replaces | Lines |
|---|---|---|
| `GitHubLinksContent.svelte` | `github-links-modal.ts` | 455 |
| `FolderPathContent.svelte` | `FolderPathModal.ts` | 188 |
| `NoteImportContent.svelte` | `note-import-modal.ts` | 192 |
| `RepositoryLinkerContent.svelte` | `RepositoryLinkerModal.ts` | 243 |
| `RenameIssueContent.svelte` | `rename-issue-modal.ts` | 84 |

### 4.9 Convert modal shell files to thin wrappers
All modal files in `src/modals/` become thin shells:

| File | Before | After |
|---|---|---|
| `issue-creation-modal.ts` | 1,396 | ~80 |
| `github-links-modal.ts` | 455 | ~50 |
| `worktree-retry-modal.ts` | 257 | ~30 |
| `FolderPathModal.ts` | 188 | ~30 |
| `note-import-modal.ts` | 192 | ~30 |
| `RepositoryLinkerModal.ts` | 243 | ~30 |
| `rename-issue-modal.ts` | 84 | ~25 |
| `delete-confirmation-modal.ts` | 135 | ~25 |
| `archive-confirmation-modal.ts` | 128 | ~25 |
| `dashboard-delete-modal.ts` | 112 | ~25 |

### 4.10 Delete files
- `src/modals/modal-helpers.ts` (196 lines)
- `src/modals/modal-keyboard-helpers.ts` (75 lines)

### 4.11 Verify Phase 4
- `pnpm build` + `pnpm typecheck`
- Issue creation wizard: all 5 steps, back navigation, keyboard nav
- Color picker: grid selection, custom color input
- Priority selector: keyboard navigation, visual selection
- All confirmation dialogs: confirm/cancel, keyboard Escape
- All other modals: open/close without memory leaks, keyboard accessible

---

## Phase 5: Settings Tab

- [ ] 5.1 Create `SettingsTab.svelte`
- [ ] 5.2 Create `DashboardSettings.svelte`
- [ ] 5.3 Create `GitHubSettings.svelte`
- [ ] 5.4 Modify `settings.ts`
- [ ] 5.5 Delete `settings/github-settings-renderer.ts`
- [ ] 5.6 Verify Phase 5

### Hybrid approach
Svelte manages section structure/layout. Individual settings use `new Setting(containerEl)` via `$effect` + `bind:this` — preserves Obsidian's native Setting component styling.

### 5.1 Create `src/components/settings/SettingsTab.svelte`
**Replaces**: `settings.ts` DOM logic (442 lines).

```
Props ($props):
  plugin: TasksDashboardPlugin

State:
  settings = $state(structuredClone(plugin.settings))

Derived:
  dashboards = $derived(Object.entries(settings.dashboards))

Template:
  <div class="tdc-settings">
    <div bind:this={globalSettingsEl}></div>
    {#each dashboards as [id, dashboard] (id)}
      <DashboardSettings {plugin} {dashboard} dashboardId={id} />
    {/each}
    <GitHubSettings {plugin} />
  </div>

Effects:
  $effect — populate globalSettingsEl with new Setting() calls
```

### 5.2 Create `src/components/settings/DashboardSettings.svelte`

### 5.3 Create `src/components/settings/GitHubSettings.svelte`
**Replaces**: `github-settings-renderer.ts` (229 lines).

### 5.4 Modify `settings.ts`
`display()` mounts `SettingsTab.svelte`. Shrinks from 442 → ~30 lines.

### 5.5 Delete `settings/github-settings-renderer.ts`

### 5.6 Verify Phase 5
- Settings tab opens, all settings render
- Changing settings persists correctly
- Dashboard-specific settings work
- GitHub settings: token input, repo management

---

## Phase 6: CSS Audit

- [ ] 6.1 Audit `styles.css`
- [ ] 6.2 Remove dead CSS
- [ ] 6.3 Verify

### Strategy
CSS migration is handled per-component during each phase — every component gets its `<style>` block when created. Phase 6 verifies completeness.

### 6.1 Audit `styles.css`
Verify that only global CSS remains:
- `:root` custom properties (`--tdc-*`)
- `.cm-line:not(.cm-active) .cm-comment` CodeMirror override
- `.tdc-hidden` utility
- `.priority-*` / `.tdc-priority-*` color classes (applied externally from TS)
- `.tdc-issue-content-collapsed`, `.tdc-issue-content-block` (sibling DOM)
- `.cm-embed-block:has(...)` collapsed state selectors
- `.theme-dark` / `.theme-light` overrides
- `.block-language-tasks-dashboard-*` code block wrappers

### 6.2 Remove dead CSS
Search `styles.css` for selectors that are no longer referenced by any component or TS file.

### 6.3 Verify
- `pnpm build` — no errors
- Visual regression check: compare all UI before/after
- Light and dark themes
- No CSS specificity conflicts between scoped and global

---

## Phase 7: Cleanup

- [ ] 7.1 Delete replaced files
- [ ] 7.2 Remove dead imports
- [ ] 7.3 Remove dead CSS
- [ ] 7.4 Final build verification
- [ ] 7.5 Full smoke test

### 7.1 Delete replaced files
| File | Lines |
|---|---|
| `src/dashboard/header-actions.ts` | 336 |
| `src/dashboard/sort-controls.ts` | 434 |
| `src/dashboard/dashboard-overflow-panel.ts` | 493 |
| `src/dashboard/git-status-indicator.ts` | 201 |
| `src/dashboard/dashboard-renderer-github-cards.ts` | 126 |
| `src/dashboard/dashboard-github-link-actions.ts` | 34 |
| `src/github/GitHubCardRenderer.ts` | 472 |
| `src/modals/modal-helpers.ts` | 196 |
| `src/modals/modal-keyboard-helpers.ts` | 75 |
| `src/settings/github-settings-renderer.ts` | 229 |
| **Total** | **~2,596** |

### 7.2 Remove dead imports
Search all TS files for unused imports after deletions.

### 7.3 Remove dead CSS
Search `styles.css` for selectors no longer referenced.

### 7.4 Final build verification
- `pnpm build` — no errors
- `pnpm typecheck` — no errors
- `pnpm lint` — no errors

### 7.5 Full smoke test
See Verification section.

---

## Phase 8: Testing

- [ ] 8.1 Install test dependencies
- [ ] 8.2 Create `vitest.config.ts`
- [ ] 8.3 Create `src/test/setup.ts`
- [ ] 8.4 Create `src/test/mocks/obsidian.ts`
- [ ] 8.5 Add `package.json` scripts
- [ ] 8.6 Write component tests
- [ ] 8.7 Verify
- [ ] 8.8 CI integration

### 8.1 Install test dependencies
```
pnpm add -D vitest @testing-library/svelte jsdom @sveltejs/vite-plugin-svelte
```

### 8.2 Create `vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
});
```

### 8.3 Create `src/test/setup.ts`
Global test setup: import mock obsidian module.

### 8.4 Create `src/test/mocks/obsidian.ts`
Stubs: `Modal`, `Notice`, `setTooltip`, `Setting`, `MarkdownRenderChild`

### 8.5 Add package.json scripts
```json
"test": "vitest run",
"test:watch": "vitest"
```

### 8.6 Write component tests (priority order)
1. `Icon.test.ts` — SVG rendering: correct viewBox, size, content; stroke vs fill styles
2. `ActionButton.test.ts` — renders icon + label, fires onclick, faded class
3. `GitBadge.test.ts` — span vs anchor, CSS classes per badge type
4. `ProgressBar.test.ts` — width percentage, text per display mode
5. `GitHubCard.test.ts` — 3 display modes, refresh/unlink buttons
6. `ConfirmationDialog.test.ts` — confirm/cancel callbacks, Escape key
7. `ColorPicker.test.ts` — swatch selection, custom color
8. `PrioritySelector.test.ts` — keyboard nav, selection
9. `IssueCard.test.ts` — integration with mock plugin

### 8.7 Verify
- `pnpm test` — all pass, no console errors

### 8.8 CI integration
Add `pnpm test` to CI pipeline.

---

## Final File Structure

```
src/
  lib/
    attach-tooltip.ts                 — {@attach} wrapper for setTooltip
    attach-resize-observer.ts         — {@attach} wrapper for ResizeObserver
    attach-portal.ts                  — {@attach} wrapper for document.body portal
  components/
    icons/
      IconBase.svelte                 — Shared SVG wrapper
      TrashIcon.svelte                — 43 per-icon components
      ...
      index.ts                        — Re-exports, ICON_COMPONENTS map, IconName type
    Icon.svelte                       — Dispatcher: delegates to per-icon component
    ActionButton.svelte               — Icon button with tooltip
    GitBadge.svelte                   — Branch/PR/Issue badge
    StatePill.svelte                  — State indicator pill (open/closed/merged/draft)
    LoadingIndicator.svelte           — Loading state display
    ErrorDisplay.svelte               — Error state display
    github/
      GitHubCard.svelte               — GitHub metadata card (3 modes)
      GitHubRepoCard.svelte           — GitHub repo stats card
      GitHubCardContainer.svelte      — Async loader + card
      GitHubSearchContent.svelte      — Search modal content
    dashboard/
      IssueCard.svelte                — Top-level issue container
      IssueHeader.svelte              — Header with badges/actions
      IssueInfoPanel.svelte           — Floating info panel (portal)
      OverflowPanel.svelte            — Overflow action menu (portal)
      SortControls.svelte             — Sort button
      SortDropdown.svelte             — Sort options dropdown (portal)
      ProgressBar.svelte              — Task completion bar
      AssignedIssuesSection.svelte    — GitHub assigned issues tree
    modals/
      ModalLayout.svelte              — Shared modal layout
      ConfirmationDialog.svelte       — Generic confirm/cancel
      ColorPicker.svelte              — Color selection grid
      PrioritySelector.svelte         — Priority selection list
      IssueCreationWizard.svelte      — Multi-step wizard
      NameStep.svelte                 — Wizard: name input
      GitHubStep.svelte               — Wizard: GitHub linking
      WorktreeStep.svelte             — Wizard: worktree decision
      WorktreeRetryContent.svelte     — Worktree error retry
      GitHubLinksContent.svelte       — Link/unlink GitHub items
      FolderPathContent.svelte        — Folder path browser
      NoteImportContent.svelte        — Note import dialog
      RepositoryLinkerContent.svelte  — Repository linking
      RenameIssueContent.svelte       — Issue rename input
    settings/
      SettingsTab.svelte              — Settings tab layout
      DashboardSettings.svelte        — Per-dashboard settings
      GitHubSettings.svelte           — GitHub configuration
  dashboard/                          — Simplified orchestration + pure TS utilities
    DashboardRenderer.ts              — ~100 lines, mounts Svelte
    dashboard-issue-surface.ts        — Sibling DOM utilities (unchanged)
    dashboard-reactive-render-child.ts — Refresh lifecycle (updated)
    dashboard-renderer-params.ts      — Param parsing (unchanged)
    dashboard-renderer-layout.ts      — Layout calculation (unchanged)
    dashboard-renderer-constants.ts   — Constants (unchanged)
    dashboard-renderer-types.ts       — Types (unchanged)
  modals/                             — Thin Modal class shells (~25-80 lines each)
  settings.ts                         — Thin PluginSettingTab shell (~30 lines)
  github/                             — Service layer (unchanged)
  git-status/                         — Service layer (unchanged)
  issues/                             — Data layer (unchanged)
  utils/                              — Utilities (unchanged)
  test/
    setup.ts
    mocks/obsidian.ts
  svelte.d.ts
```

## Verification (end-to-end)

After each phase and after full migration:
1. `pnpm build` — no errors
2. `pnpm typecheck` — no errors
3. `pnpm lint` — no errors
4. Load plugin in Obsidian
5. Smoke test:
   - Create new dashboard
   - Add issues (name, color, priority, GitHub link, worktree)
   - Collapse/expand issues
   - Sort issues (field, direction)
   - View overflow menu actions
   - View issue info panel
   - Search and link GitHub items
   - Create issue via wizard (all steps + back navigation)
   - Rename issue
   - Change issue color, priority
   - Delete/archive issues with confirmation
   - View assigned issues section
   - View GitHub note cards
   - Change settings (global, per-dashboard, GitHub)
6. Test both light and dark themes
7. Test portal positioning at various scroll positions + window resize
8. Test keyboard navigation in all modals
9. Test narrow widths — badge compaction, row1 priority layout
10. `pnpm test` — all component tests pass (Phase 8+)
