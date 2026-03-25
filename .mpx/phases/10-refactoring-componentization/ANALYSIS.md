# Phase 10: Refactoring / Componentization -- Analysis Report

## 1. Large File Audit Table

### Files Exceeding ~300 Lines

| File | Lines | Responsibilities | Extraction Candidates |
|------|-------|------------------|-----------------------|
| `components/dashboard/SortControls.svelte` | 846 | Dashboard toolbar UI (6 button groups), sync-all logic, prune-closed-worktrees logic, collapse/expand-all logic, dashboard content reading, prunable issue computation | Split into 3-4 focused files (see below) |
| `components/dashboard/IssueHeader.svelte` | 807 | Header rendering (~140 lines template, ~250 lines CSS), git status fetching, badge compaction, info panel content building, row1 priority layout, worktree retry/refresh, sync branch, branch badge computation | Extract badge logic, info content builder, CSS (see below) |
| `issues/IssueManager.ts` | 659 | Issue CRUD (create, import, archive, unarchive, delete), rename, priority update, GitHub link add/remove, dashboard block editing, worktree operations delegation | Already partially split (worktree ops delegated). Could extract block-editing helpers, rename logic |
| `components/github/GitHubSearchContent.svelte` | 656 | Search input UI, scope selection, result list, URL preview, keyboard navigation, search engine orchestration, data loader coordination, button bar | Mostly well-structured with extracted helpers (engine, config, data-loaders). CSS is ~100 lines. Borderline -- acceptable at current size |
| `issues/issue-manager-worktree.ts` | 621 | Worktree CRUD, setup polling, retry, assign existing, refresh state, remove worktree | Cohesive single-responsibility (worktree ops). Acceptable -- already extracted from IssueManager |
| `modals/issue-creation-modal.ts` | 549 | IssueCreationModal class, PrioritySelectionModal, ManualGitHubLinkFirstModal, openFileAndFocusEnd helper, prefilled name logic, multiple public entry points | Extract file-focus helper, split modal classes into separate files |
| `components/dashboard/AssignedIssuesSection.svelte` | 533 | Assigned issues fetching, partitioning, worktree creation, repo-folder mismatch detection, deleted-issue URL tracking, load-more pagination | Heavy but single-purpose. CSS is ~120 lines. Borderline |
| `github/GitHubService.ts` | 498 | All GitHub API methods (issue, PR, search, compare, user, repos, orgs) via factory function, cache orchestration | Already well-decomposed with extracted cache/request/mappers. Methods are thin wrappers. Acceptable |
| `dashboard/dashboard-issue-actions.ts` | 485 | 14 action descriptors (folder, terminal, vscode, github, worktree, move-up/down/top/bottom, rename, color, change-priority, archive, delete), button visibility | Single factory function. Could split archive/delete (complex confirmation flows) into separate file |
| `components/dashboard/OverflowPanel.svelte` | 452 | Overflow action list, layout settings mode (drag up/down, visibility toggle, reset defaults), draft layout management | Two distinct modes (overflow actions vs layout settings). Could extract settings mode into sub-component |
| `dashboard/dashboard-writer-helpers.ts` | 393 | ~15 helper functions for dashboard writing (build blocks, parse YAML, extract sections, sort) | Already a helper grab-bag. Could group by concern: parsing vs building vs sorting |
| `components/settings/DashboardSettings.svelte` | 366 | Dashboard settings form (root path, filename, GitHub, project folder, visibility toggles, rebuild, delete) | Uses imperative Obsidian Setting API. Not easily componentized further |
| `git-status/git-status-service.ts` | 358 | Git status resolution, PR discovery, issue discovery, cache, branch status | Cohesive. Already well-structured with internal helpers |
| `dashboard/DashboardWriter.ts` | 331 | Dashboard file CRUD (add, move, remove, reorder issues), rebuild from files | Delegates to sort ops and active-section helpers. Just above threshold |

### Files in 250-300 Line Range (Watch List)

| File | Lines | Notes |
|------|-------|-------|
| `utils/platform/git-operations.ts` | 278 | Git operations: branch checks, worktree detection, remote URL |
| `components/modals/GitHubLinksContent.svelte` | 278 | GitHub links management modal content |
| `dashboard/dashboard-writer-sort.ts` | 272 | Sort operations (7 sort methods) |
| `components/dashboard/IssueCard.svelte` | 254 | Issue card orchestrator. Delegates to IssueHeader, ProgressBar |
| `components/modals/ColorPicker.svelte` | 253 | Color picker UI |
| `issues/issue-manager-github.ts` | 246 | GitHub link management for issues |

### Small Files (Under 200 Lines) -- No Action Needed

All remaining files are under 200 lines and have focused responsibilities.

---

## 2. Componentization Analysis

### Current Patterns

#### Plugin Instance Passing
The plugin instance (`TasksDashboardPlugin`) is passed via **direct prop drilling** through every component:
- `DashboardRenderer.ts` mounts Svelte components with `props: { plugin, ... }`
- Every component declares `plugin: TasksDashboardPlugin` in its Props interface
- Components access services through the plugin: `plugin.githubService`, `plugin.gitStatusService`, `plugin.issueManager`, `plugin.dashboardWriter`, `plugin.settings`, `plugin.progressTracker`
- Some components create their own `PlatformService` via `createPlatformService()` (stateless factory -- no sharing concern)

**Observation:** Prop drilling is 1-2 levels deep in most cases (Renderer -> IssueCard -> IssueHeader). The deepest chain is Renderer -> IssueCard -> IssueHeader -> OverflowPanel (3 levels). This is manageable.

#### Service Access Pattern
All services use the **factory function with closures** pattern (per CLAUDE.md):
- `createGitHubService()` -> `GitHubServiceInstance`
- `createGitStatusService()` -> `GitStatusServiceInstance`
- `createIssueManager()` -> `IssueManagerInstance`
- `createDashboardWriter()` -> `DashboardWriterInstance`
- `createDashboardRenderer()` -> `DashboardRendererInstance`
- `createPlatformService()` -> `PlatformService`

Services are instantiated once in `main.ts` `onload()` and stored as plugin instance fields.

#### Modal Pattern
Three modal patterns exist:
1. **Direct Modal class** -- extends `Modal`, manually `mount()`/`unmount()` Svelte in `onOpen()`/`onClose()` (e.g., `IssueCreationModal`, `PruneConfirmationModal`)
2. **SvelteModal base class** -- abstract class providing `getComponent()`/`getProps()` template method (e.g., `PrioritySelectionModal`, `ManualGitHubLinkFirstModal`)
3. **Obsidian-native modals** -- `FuzzySuggestModal`, `SuggestModal` subclasses (e.g., `DashboardSelectorModal`, `FolderPathModal`)

All modals receive `plugin` via constructor, not Svelte context.

### Svelte Context Analysis

**Current state:** Zero usage of `setContext`/`getContext` in the codebase.

**Should we introduce Svelte context?**

| Factor | Assessment |
|--------|------------|
| Prop drilling depth | Max 3 levels (Renderer -> Card -> Header -> Overflow). Shallow enough that context is optional |
| Number of components needing plugin | ~12 Svelte components. Each explicitly declares it in Props |
| Type safety | Props give full TypeScript checking. Context requires manual typing |
| Testability | Props are easier to mock in tests than context |
| Refactoring safety | Props create visible dependency chains; context hides them |
| Obsidian plugin lifecycle | Plugin instance is mutable (settings change). Props track this naturally through Svelte reactivity |

**Recommendation: Keep prop drilling. Do NOT introduce Svelte context.**

Reasons:
1. The prop depth is shallow (max 3). Context solves deep drilling (5+ levels), not this.
2. Existing pattern is consistent and type-safe.
3. Context would add complexity without measurable benefit at current codebase size.
4. Every component explicitly documents its dependencies via Props interface -- this is a feature, not a bug.
5. The codebase style guide prefers explicit over implicit.

### Component Hierarchy

```
DashboardRenderer (mounts per code block)
  |-- IssueCard (per issue)
  |     |-- IssueHeader
  |     |     |-- HeaderBadges
  |     |     |-- WorktreeIndicator
  |     |     |-- IssueInfoPanel
  |     |     |-- OverflowPanel
  |     |     |-- ContextMenu
  |     |     |-- ActionButton (multiple)
  |     |-- ProgressBar
  |     |-- ActionButton (row2, multiple)
  |
  |-- SortControls (per dashboard toolbar)
  |     |-- SortDropdown
  |     |-- ActionButton (multiple)
  |
  |-- AssignedIssuesSection (per assigned block)
  |     |-- ActionButton (per issue row)
  |     |-- LoadingIndicator
  |
  |-- GitHubCardContainer (per github note)
        |-- GitHubCard / GitHubRepoCard
```

### Modal-Component Interaction

Modals are instantiated imperatively from:
1. **Action descriptors** in `dashboard-issue-actions.ts` (e.g., archive, delete, rename)
2. **Toolbar handlers** in `SortControls.svelte` (e.g., prune, folder path, import)
3. **Other modals** (chained creation: GitHub search -> issue creation -> priority)

Modals do NOT share Svelte component trees with the dashboard. They create isolated Svelte mount points. This is correct and should be preserved.

---

## 3. Extraction Plan

### Priority Order (highest impact first)

#### Extraction 1: SortControls.svelte (846 lines -> 4 files)

**Problem:** Single component handles toolbar rendering, sync-all orchestration, prune orchestration, collapse/expand all, and dashboard content reading.

**Before:**
```
components/dashboard/SortControls.svelte (846 lines)
```

**After:**
```
components/dashboard/SortControls.svelte           (~250 lines) -- toolbar template + button groups only
dashboard/toolbar-sync-all.ts                      (~100 lines) -- getUnsyncedBranches(), handleSyncAllBranches()
dashboard/toolbar-prune.ts                         (~120 lines) -- getPrunableIssues(), handlePruneWorktrees(), archiveIssuesSequentially()
dashboard/toolbar-collapse.ts                      (~60 lines)  -- toggleAllIssues(), applyCollapseToControlBlocks()
```

**Strategy:**
- Extract the three heavy async workflows (sync, prune, collapse) into plain TS modules
- Each module exports a factory or function that takes `{ plugin, dashboard, platformService, ... }` params
- SortControls calls these functions and manages only UI state (isSyncingAll, isPruning, prunableCount)
- `readDashboardContent()` and `getDashboardIssueIds()` move to a shared `dashboard/dashboard-content-reader.ts`

---

#### Extraction 2: IssueHeader.svelte (807 lines -> 3 files)

**Problem:** 807 lines with ~420 lines of script (badge logic, info content, sync, worktree retry), ~140 lines of template, ~250 lines of CSS.

**Before:**
```
components/dashboard/IssueHeader.svelte (807 lines)
```

**After:**
```
components/dashboard/IssueHeader.svelte             (~350 lines) -- template, element refs, UI state, event handlers
dashboard/issue-header-info-content.ts              (~70 lines)  -- buildInfoContent() pure function
components/dashboard/IssueHeader.css                -- OR keep CSS inline but extract PR accent rules
```

**Strategy:**
- Extract `infoContent` builder into a pure function `buildInfoContent(params, gitStatusDisplay, isWorktreeIssue)` in `dashboard/issue-header-info-content.ts`
- The `branchBadge` derived block, sync handler, worktree retry handler are already small and cohesive -- keep in component
- CSS is heavy (250 lines) but Svelte-scoped CSS must stay in the component file. The PR accent CSS block (~60 lines of repetitive rules) could be extracted to a global stylesheet if desired, but this is cosmetic
- Consider moving badge-related derived state (`branchBadge`, `gitStatusDisplay` computation) into HeaderBadges if it reduces coupling

**Net result:** IssueHeader drops to ~350 lines (template + state + handlers).

---

#### Extraction 3: issue-creation-modal.ts (549 lines -> 3 files)

**Problem:** Contains 3 modal classes, 2 public entry point functions, and a file-focus helper -- all in one file.

**Before:**
```
modals/issue-creation-modal.ts (549 lines)
```

**After:**
```
modals/issue-creation-modal.ts                      (~250 lines) -- IssueCreationModal class + openIssueCreationModal + openWorktreeIssueCreationModal
modals/issue-creation-helpers.ts                    (~80 lines)  -- createIssueWithNotice, createIssueWithGitHub, createIssueWithRepoLink, getPrefilledIssueName
modals/open-file-and-focus.ts                       (~70 lines)  -- openFileAndFocusEnd, findTasksHeadingLine, getTasksSectionTargetLine
```

**Strategy:**
- `PrioritySelectionModal` and `ManualGitHubLinkFirstModal` are small (each ~35 lines) -- keep in main file or move to own files
- `openFileAndFocusEnd` + related helpers are completely independent of issue creation -- extract
- `createIssueWithNotice`, `createIssueWithGitHub`, `createIssueWithRepoLink` are issue-creation orchestration -- extract to helpers

---

#### Extraction 4: dashboard-issue-actions.ts (485 lines -> 2 files)

**Problem:** Single function builds 14 action descriptors. The archive and delete descriptors each contain ~40 lines of complex confirmation flow logic.

**Before:**
```
dashboard/dashboard-issue-actions.ts (485 lines)
```

**After:**
```
dashboard/dashboard-issue-actions.ts                (~300 lines) -- buildIssueActionDescriptors (14 descriptors, simpler)
dashboard/dashboard-issue-action-confirmations.ts   (~120 lines) -- handleArchiveWithConfirmation(), handleDeleteWithConfirmation()
```

**Strategy:**
- Extract the archive and delete confirmation flows (each involves Promise.all, worktree checks, modal chaining) into standalone handler functions
- The descriptor map builder calls these handlers by reference
- `getButtonVisibility`, `openMoveContextMenu`, `openGitHubLinkChooser` stay in the main file (small helpers)

---

#### Extraction 5: IssueManager.ts (659 lines -> already partially split)

**Assessment:** IssueManager is already partially decomposed:
- Worktree ops delegated to `issue-manager-worktree.ts` (621 lines)
- GitHub helpers in `issue-manager-github.ts` (246 lines)
- Shared helpers in `issue-manager-shared.ts`
- Settings helpers in `issue-manager-settings.ts`
- Frontmatter helpers in `issue-manager-frontmatter.ts`
- Types in `issue-manager-types.ts`

**Remaining in IssueManager.ts (659 lines):**
- Lock management (~40 lines) -- keep
- File/path helpers (~50 lines) -- keep (used by multiple operations)
- `editDashboardIssueBlock` + `upsertDashboardIssueBlockField` (~60 lines) -- could extract to `issue-manager-block-edit.ts`
- `createIssue` (~110 lines) -- keep (core operation)
- `importNoteAsIssue` (~60 lines) -- keep
- `archiveIssue` / `unarchiveIssue` / `deleteIssue` (~50 lines) -- keep
- `updateIssuePriority` (~25 lines) -- keep
- `renameIssue` (~55 lines) -- could extract
- `addGitHubLink` / `removeGitHubLink` (~40 lines each) -- keep
- `updateDashboardWithGitHubLink` (~25 lines) -- keep

**Recommendation:** Lower priority. Extract `editDashboardIssueBlock` + `upsertDashboardIssueBlockField` into `issue-manager-block-edit.ts` (~80 lines). This brings IssueManager to ~580 lines. Further splitting would fragment cohesive CRUD logic.

---

#### Extraction 6: OverflowPanel.svelte (452 lines -> 2 files)

**Before:**
```
components/dashboard/OverflowPanel.svelte (452 lines)
```

**After:**
```
components/dashboard/OverflowPanel.svelte           (~200 lines) -- overflow action list + settings toggle
components/dashboard/OverflowLayoutSettings.svelte  (~200 lines) -- layout settings mode (move up/down, visibility, reset)
```

**Strategy:**
- The two modes (action list vs settings editor) are clearly separate UI states
- Extract the settings mode into a child component that receives draft layout state
- OverflowPanel acts as container, switching between the two views

---

### Summary of Extractions

| Priority | Source File | Lines Before | Files After | Lines After (main) |
|----------|-----------|-------------|-------------|-------------------|
| 1 | SortControls.svelte | 846 | 4 (+ shared reader) | ~250 |
| 2 | IssueHeader.svelte | 807 | 2 | ~350 |
| 3 | issue-creation-modal.ts | 549 | 3 | ~250 |
| 4 | dashboard-issue-actions.ts | 485 | 2 | ~300 |
| 5 | IssueManager.ts | 659 | +1 | ~580 |
| 6 | OverflowPanel.svelte | 452 | 2 | ~200 |

### Files That Should NOT Be Split

| File | Lines | Reason |
|------|-------|--------|
| `issue-manager-worktree.ts` | 621 | Already extracted. Single cohesive responsibility (worktree lifecycle). Functions are interdependent |
| `GitHubSearchContent.svelte` | 656 | Already well-decomposed with extracted engine/config/data-loaders. Script logic is search orchestration -- hard to split without losing coherence |
| `GitHubService.ts` | 498 | Thin API wrapper methods. Cache/request/mappers already extracted. Splitting API methods would scatter related endpoints |
| `AssignedIssuesSection.svelte` | 533 | Single-purpose component. Logic is tightly coupled to its template. CSS is 120 lines |
| `git-status-service.ts` | 358 | Cohesive service. Internal helpers serve the main getIssueGitStatus function |
| `DashboardSettings.svelte` | 366 | Uses imperative Obsidian Setting API (not Svelte patterns). Each setting is a self-contained `new Setting()` call |
| `DashboardWriter.ts` | 331 | Just above threshold. Already delegates to sort ops and active-section helpers |

---

## 4. Key Decisions

### Decision 1: No Svelte Context
Keep direct prop passing. Depth is shallow (max 3), type safety is preserved, testability is better. Re-evaluate only if component tree deepens significantly.

### Decision 2: Extract Logic to TS Modules, Not More Components
For SortControls and IssueHeader, the primary extraction target is TS logic modules (toolbar-sync, toolbar-prune, info-content-builder), not additional Svelte components. The UI template structure is already correct.

### Decision 3: Preserve Factory Function Pattern
All extracted modules should follow the existing `create*()` factory pattern or export pure functions. No classes outside Obsidian-required base classes.

### Decision 4: CSS Stays in Svelte Files
Svelte scoped CSS cannot be meaningfully extracted. The large CSS blocks in IssueHeader (250 lines) are a known trade-off of component-scoped styles. Global CSS extraction would lose scoping benefits.

### Decision 5: OverflowPanel Split Uses Child Component
The settings mode in OverflowPanel is a genuine second UI surface that justifies a Svelte sub-component rather than a TS module extraction.

### Decision 6: Accept Some Files Above 300 Lines
Files like `issue-manager-worktree.ts` (621), `GitHubSearchContent.svelte` (656), and `GitHubService.ts` (498) have documented justification: they are cohesive single-responsibility modules where splitting would reduce clarity.
