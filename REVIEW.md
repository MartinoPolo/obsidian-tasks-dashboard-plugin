# PR Review: Svelte 5 Migration

**PR:** #1 `svelte-migration` → `master`
**Scope:** 140 files, ~24K lines
**Coverage:** Full (6 reviewers)
**Focus:** Deduplication

---

## Actionable Checklist

### Critical

- [x] **C1: Anchored panel pattern duplicated across 3 components**
  - `OverflowPanel.svelte:92-168`, `IssueInfoPanel.svelte:15-92`, `SortDropdown.svelte` (simpler variant)
  - `positionPanel` (viewport math), `handleOutsideClick`, `handleEscape`, scroll/resize/blur/click/keydown lifecycle — all identical
  - **Fix:** Extract `useAnchoredPanel(anchor, panel, { onclose })` attach directive or `AnchoredPanel.svelte` wrapper

- [x] **C2: `formatStarCount` duplicated + dead code in GitHubCard**
  - `GitHubCard.svelte:40-45` (dead — never called), `GitHubRepoCard.svelte:32-37`
  - **Fix:** Move to `src/utils/github-helpers.ts`. Remove dead copy from GitHubCard entirely

- [x] **C3: Full CSS block duplicated between GitHubCard and GitHubRepoCard**
  - `GitHubCard.svelte:131-305`, `GitHubRepoCard.svelte:124-282`
  - ~160 lines of near-identical scoped styles emitted twice in bundle
  - **Fix:** Move shared card styles to `styles.css` under common selectors

- [x] **C4: `cardActions` snippet + handlers duplicated identically**
  - `GitHubCard.svelte:48-57`, `GitHubRepoCard.svelte:40-49`
  - Refresh/unlink buttons, tooltip text, handlers — all identical
  - **Fix:** Extract `GitHubCardActions.svelte` component with `onrefresh`/`onunlink` props

### Important

- [x] **I1: `tdc-gh-state-*` color rules duplicated across 4 files**
  - `GitHubCard.svelte:193-211`, `GitHubRepoCard.svelte:173-181`, `GitHubSearchContent.svelte:961-980`, `StatePill.svelte:24-43`
  - `StatePill` was created to centralize this, but other components don't use it
  - **Fix:** Use `StatePill` in GitHubCard/GitHubRepoCard/GitHubSearchContent, or move rules to `styles.css` globally

- [x] **I2: `saveSettings`/`saveSettingsAndRefreshDashboard` duplicated in 3 settings components**
  - `DashboardSettings.svelte:47-53`, `GitHubSettings.svelte:30-37`, `SettingsTab.svelte:31-37`
  - **Fix:** Export `createSettingsHelpers(plugin)` from shared module

- [x] **I3: `getWrappedIndex` duplicated across 3 modal components**
  - `ColorPicker.svelte:80`, `PrioritySelector.svelte:30`, `WorktreeDecisionStep.svelte:18`
  - **Fix:** Extract to `src/utils/array-utils.ts`

- [x] **I4: AssignedIssuesSection duplicates full issue-row template for single/multi-repo**
  - Lines 243-302 (multi-repo) vs 309-368 (single-repo) — identical markup
  - Also: `getLinkedIssues`/`getUnlinkedIssues` called as inline functions in template (re-filter on every render)
  - **Fix:** Extract `{#snippet repoIssueList(...)}` or normalize single-repo into array and use one `{#each}`

- [x] **I5: `formatRelativeTime` duplicates `formatRelativeDate` intent**
  - `IssueHeader.svelte:172-183` (accepts timestamp) vs `github-helpers.ts:78` (accepts ISO string)
  - **Fix:** Add `formatRelativeTimestamp(ts: number)` to `github-helpers.ts`, remove local function

- [x] **I6: `@keyframes tdc-spin` duplicated in 2 scoped style blocks**
  - `IssueHeader.svelte:839-841`, `AssignedIssuesSection.svelte:412-414`
  - **Fix:** Move to `styles.css` as global rule

- [x] **I7: `handleBadgesContextMenu` hand-rolls dropdown duplicating SortDropdown**
  - `IssueHeader.svelte:339-394` — manual DOM dropdown creation with position/click/keydown logic
  - Potential listener leak if component destroyed while dropdown open
  - **Fix:** Use `SortDropdown.svelte` or extract reusable `ContextMenu` component

- [x] **I8: 3 parallel if-chains on `searchMode` in GitHubSearchContent**
  - `GitHubSearchContent.svelte:190-218` — `getModalTitle`/`getSearchPlaceholder`/`getSelectedResultsTitle`
  - **Fix:** Collapse into `SEARCH_MODE_LABELS` config map

- [x] **I9: Command injection via `shell: true` on Windows**
  - `platform.ts:365` — `spawn('code', [folderPath], { shell: process.platform === 'win32' })`
  - User-supplied `folderPath` parsed by OS shell when `shell: true`
  - **Fix:** Use `shell: false` unconditionally. `code` resolves from PATH without shell

- [x] **I10: Unvalidated GitHub label color injected into CSS style**
  - `GitHubCard.svelte:66` — `style:background-color={#${label.color}}`
  - Raw API string, no format validation
  - **Fix:** Validate `/^[0-9A-Fa-f]{6}$/` in `github-service-mappers.ts`, fallback to default

- [x] **I11: Hardcoded absolute developer paths in production code**
  - `platform.ts:71-72` — `C:\\_MP_projects\\mpx-claude-code\\scripts\\setup-worktree.sh`
  - Must be resolved before release (marked with `// TODO MP: Before deployment`)

- [x] **I12: `loadRecentIssues`/`performSearch` swallow errors silently**
  - `GitHubSearchContent.svelte:406-465` — called with `void`, no `.catch()`
  - Component stays in loading state permanently on API failure
  - **Fix:** Wrap in try/catch, show error message on failure

- [x] **I13: `loadAuthenticatedUsername`/`loadUserRepositories` swallow errors**
  - `GitHubSearchContent.svelte:280-319`
  - Failure leaves permanent loading state for repo dropdown
  - **Fix:** Add try/catch, set fallback values on failure

- [x] **I14: AssignedIssuesSection $effect races with component unmount**
  - `AssignedIssuesSection.svelte:138-144` — no destroyed flag, concurrent fetch guard
  - **Fix:** Add cancel flag in `$effect` cleanup, `isFetching` guard

- [x] **I15: `GitHubCardContainer` mounted without cleanup registration**
  - `DashboardRenderer.ts:53-77` — `mount()` with no `ctx.addChild` / `unmount`
  - Component leaks, in-flight fetch writes to orphaned state
  - **Fix:** Register `MarkdownRenderChild` with `ctx.addChild`, `unmount` in cleanup

- [x] **I16: `issueActions` $derived rebuilds on every reactive update**
  - `IssueCard.svelte:52-64` — depends on `params` (re-parsed from string each time)
  - N cards × every settings write = N full map rebuilds
  - **Fix:** Memoize `parseParams` by source string identity

- [x] **I17: Double `applyIssueSurfaceStyles` via setTimeout**
  - `IssueCard.svelte:99-108` — unconditional 60ms setTimeout for every re-render
  - **Fix:** Guard with mounted-once flag or remove redundant call

- [x] **I18: `handleResize` undebounced — two async layout passes per resize event**
  - `IssueHeader.svelte:310-313` + `attach-resize-observer.ts:1`
  - **Fix:** Add 16ms debounce in `attachResizeObserver` or at call site

- [x] **I19: Global "Add issue in worktree" button missing from dashboard header**
  - Spec line 145: separate worktree button with tree icon, faded unless Git repo
  - `SortControls.svelte` only has generic "Add Issue" button
  - **Fix:** Add dedicated `ActionButton` with `icon="worktree"` and faded state

- [x] **I20: Mouse back-button not consumed in wizard steps 2-5**
  - Spec line 27: consume mouse back-button in multi-step modals
  - Only handled in `GitHubSearchContent.svelte:669-701`, not in other wizard steps
  - **Fix:** Add `onauxclick` handler in `IssueCreationWizard.svelte` or `ModalLayout.svelte`

---

## Nice-to-Have

- [x] **M1:** `formatGitHubLinkLabel` near-duplicate between `dashboard-issue-actions.ts:43-56` and `GitHubLinksContent.svelte:55-68` — consolidate to `github-helpers.ts`
- [x] **M2:** `applyTooltip` in `WorktreeRetryContent.svelte:113-116` reimplements `attachTooltip` from `lib/attach-tooltip.ts` — replace with `{@attach attachTooltip(...)}`
- [x] **M3:** `attachTooltip` returns no cleanup function (unlike `attachResizeObserver`) — add cleanup or verify Obsidian self-cleans
- [x] **M4:** `QuickCreateDefaults` type defined in both `IssueCreationWizard.svelte:23` and imported from `issue-creation-modal.ts` — single source of truth
- [x] **M5:** `handleRefresh` in `GitHubCardContainer.svelte:86-93` has dead `.then()` callback — remove
- [x] **M6:** `createIssueWithNotice` calls `setupWorktree` without explicit `void` — add `void` for clarity
- [x] **M7:** `OverflowPanel` scroll/resize listeners call `positionPanel` (forced reflow) unthrottled — add RAF guard
- [x] **M8:** `rankResults` allocates `new Date()` per comparison — pre-map timestamps before sort
- [x] **M9:** `getNumericRepositoryMatches` fetches 100 items unconditionally — reuse cached smaller fetch
- [x] **M10:** `isGitHubWebUrl` too permissive — tighten to require `github.com/owner/repo` format
- [x] **M11:** WorktreeDecisionStep "Yes" button missing green tree icon per spec
- [x] **M12:** `issueId` passed as script arg without null-byte/newline validation — add guard

---

## Post-Fix Review

**Status:** Clean

11 fixes applied, build + lint verified. Post-fix review found:
- Minor: unused `index` loop variable in `ColorPicker.svelte:201` (`{#each colorPresets as entry, index}` — `index` not used). Pre-existing, not introduced by fix.
- Pre-existing: `QuickCreateDefaults` duplicate type (already tracked as M4 above)

No regressions introduced by the fixes.

### Fixed Items (checked off)
- [x] C2 (partial): Dead `formatStarCount` removed from GitHubCard
- [x] I2: Settings helpers extracted to `src/utils/settings-helpers.ts`
- [x] I3: `getWrappedIndex` extracted to `src/utils/array-utils.ts`
- [x] I6: `@keyframes tdc-spin` moved to global `styles.css`
- [x] I9: `shell: false` in `openVSCode`
- [x] I10: GitHub label hex color validation added
- [x] I15: `GitHubCardContainer` cleanup registration with `ctx.addChild`
- [x] I20: Mouse back-button consumption in `IssueCreationWizard`
- [x] M2: `applyTooltip` → `attachTooltip` in WorktreeRetryContent
- [x] M5: Dead `.then()` removed from GitHubCardContainer
- [x] M6: Explicit `void` on `setupWorktree` call
- [x] C3: Shared card CSS moved to global `styles.css`
- [x] C4: `GitHubCardActions.svelte` extracted, deduplicating snippet + handlers
- [x] I1: `tdc-gh-state-*` color rules moved to global `styles.css`, removed from 4 scoped blocks

### All Items Complete

All checklist items (C1-C4, I1-I20, M1-M12) have been resolved.

Gate review fixes applied:
- parseParamsCache max-size eviction (512 entries)
- isGitRepositoryFolder moved from $derived to $effect
- handleLoadMore cancel signal tracking
- RAF cleanup in IssueHeader
- Branch name validation in git helper functions
- encodeURIComponent in GitHub API URL construction
- Dedicated tdc-context-menu CSS classes
- Time constant naming consistency
