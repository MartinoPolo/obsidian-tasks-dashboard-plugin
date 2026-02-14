# Phase 12: Code Quality Refactoring - Checklist

**Status:** In Progress
**Dependencies:** None (all target files are stable)

## Objective
Eliminate ~800 lines of code duplication across 15 files. Extract shared utilities, unify duplicate patterns, split oversized files. No functional changes — pure refactoring.

## Decisions
- Execution order: Groups 1→2→5→6→3→4→7→8 (each builds on prior extractions)
- Each group ends with `pnpm build` passing
- New files use factory function pattern (not classes)
- Top-level functions use `function name() {}` syntax

## Group 1: Shared Utilities — GitHub URL Parsing + Dashboard Path (~30 lines saved)

Create foundation utilities consumed by all subsequent groups.

- [x] Create `src/utils/github-url.ts` — consolidate `parseGitHubUrl()`, `isGitHubRepoUrl()`, `parseGitHubRepoName()`, `parseGitHubRepoFullName()` from 3+ different regex patterns across 4 files
- [x] Create `src/utils/dashboard-path.ts` — move `getDashboardPath(dashboard)` from DashboardWriter
- [x] Update `src/utils/github.ts` — delegate to `github-url.ts` instead of local regex
- [x] Update `src/github/GitHubService.ts` — import `parseGitHubUrl` from shared utils, remove local `ParsedGitHubUrl` interface and `parseGitHubUrl` function; extract `mapLabels()` helper (duplicated in `mapIssueResponse` and `getPullRequest`); extract `parseRepoFromUrl()` helper (used 4 times for `repository_url.match()`)
- [x] Update `src/dashboard/DashboardWriter.ts` — import `getDashboardPath` from shared utils, remove local function
- [x] Update `src/dashboard/DashboardRenderer.ts` — import `isGitHubRepoUrl`, `parseGitHubRepoName` from shared utils, remove local `isGitHubRepoUrl` and `parseGitHubRepoUrl` functions
- [x] Update `src/issues/IssueManager.ts` — import shared utils instead of local `isGitHubRepoUrl`, `parseGitHubRepoName`; import `getDashboardPath` from `dashboard-path.ts` for `renameIssue` and `addGitHubLink`
- [x] Verify `pnpm build` passes

## Group 2: GitHubService — Unify Search + Extract API Types (~80 lines saved)

Deduplicate search functions and extract API response types.

- [x] Create `src/github/github-api-types.ts` — move 7 API response interfaces (~60 lines) from bottom of GitHubService.ts: `GitHubIssueApiResponse`, `GitHubPullRequestApiResponse`, `GitHubSearchApiResponse`, `GitHubRepoApiResponse`, `GitHubRepoDetailApiResponse`, `GitHubUserApiResponse`, `GitHubOrgApiResponse`
- [x] Create private `searchItems(query, repo, type: 'issue' | 'pr')` — shared implementation for 99% identical `searchIssues`/`searchPullRequests`
- [x] Make `searchIssues`/`searchPullRequests` one-liner wrappers calling `searchItems`
- [x] Verify `pnpm build` passes

## Group 5: GitHubCardRenderer — Deduplicate Render Modes (~120 lines saved)

Extract shared display helpers used by both GitHubCardRenderer and GitHubSearchModal.

- [x] Create `src/utils/github-helpers.ts` with `getStateClass(metadata)`, `getStateText(metadata)`, `truncateText(text, maxLength)`, `formatRelativeDate(dateString)`, `getContrastColor(hexColor)`
- [x] In `GitHubCardRenderer.ts`: extract `renderRefreshButton(parent, onRefresh)` (used 6 times)
- [x] In `GitHubCardRenderer.ts`: extract `renderLabels(container, labels, maxCount?)` (used 3 times)
- [x] In `GitHubCardRenderer.ts`: extract `renderIssueHeader(container, metadata, opts)` shared by minimal/compact/full
- [x] In `GitHubCardRenderer.ts`: extract `renderRepoHeader(container, metadata)` shared by repo variants
- [x] In `GitHubSearchModal.ts`: import `getStateClass`, `getStateText`, `truncateText` from shared helpers, delete local duplicates (`truncate()`, `getStateClass`, `getStateText`)
- [x] Verify `pnpm build` passes

## Group 6: IssueManager — Unify YAML Building + File Search (~80 lines saved)

Deduplicate YAML metadata building and file search patterns.

- [x] Extract `buildGitHubMetadataYaml(metadata: GitHubStoredMetadata)` helper — returns YAML string for single entry (used 4 times in `addGitHubLink` with identical `number:`, `state:`, `title:`, `labels:`, `lastFetched:` pattern)
- [x] Extract `findIssueFileByPath(app, basePath, issueId)` helper — shared file search pattern used by `findIssueFile`, `archiveIssue`, `unarchiveIssue`
- [x] Simplify `addGitHubLink` by using `buildGitHubMetadataYaml` for all 4 content-rebuild branches
- [x] Verify `pnpm build` passes

## Group 3: DashboardWriter — Unify Move Operations + Builders (~150 lines saved)

Deduplicate block extraction, move operations, and issue block builders.

- [x] Extract `extractAndRemoveIssueBlock(content, issueId)` → `{ block, cleanedContent } | undefined` — shared extract-block + cleanup-separator pattern used by `moveIssueToArchive`, `moveIssueToActive`, `removeIssueFromDashboard`
- [x] Rewrite `moveIssueToArchive`, `moveIssueToActive`, `removeIssueFromDashboard` using `extractAndRemoveIssueBlock`
- [x] Unify `buildIssueEntry` + `buildIssueBlock` → single `buildIssueMarkdownBlock(params)` with common interface accepting both `Issue` and `ParsedIssueFile` data
- [x] Make `sortByPriority` delegate to `rebuildActiveSectionWithSortedBlocks` instead of duplicating rebuild logic
- [x] Verify `pnpm build` passes

## Group 4: DashboardRenderer — Extract Header Actions + Sort Controls (~220 lines saved)

Split largest file (989 lines) into focused modules.

- [x] Create `src/dashboard/header-actions.ts` — `getButtonVisibility(dashboard)` returning `{ folder, terminal, vscode, github }` booleans (eliminates 9 duplicate checks); `createActionButton(config)` factory; `renderActionButtons(container, params, dashboard, plugin)` for folder/terminal/vscode/github buttons used by BOTH renderHeader and renderSortButton; move `ICONS` constant here
- [x] Create `src/dashboard/sort-controls.ts` — move `renderSortButton` (283 lines); move `getActiveIssueIds`; unify collapse/expand all into `toggleAllIssues(collapsed, ...)`; extract `findDashboardContainer(el)` (duplicated twice)
- [x] In `DashboardRenderer.ts`: merge `renderGitHubRepoCard` + `renderGitHubCard` into single `renderGitHubCardWithRefresh`
- [x] In `DashboardRenderer.ts`: fix naming inconsistency — standardize to `folderButton`, `terminalButton`, `vscodeButton` (no `Btn` suffix)
- [x] In `DashboardRenderer.ts`: remove unused `showFolderButtons` variable (line 257) and stale `dropdownMounted` variable (line 688) — derive from DOM state
- [x] Import from new modules, reduce DashboardRenderer.ts to ~500 lines
- [x] Verify `pnpm build` passes

## Group 7: IssueModal — Split File + Extract Helpers (~60 lines saved)

Split 570-line modal file and extract shared setup patterns.

- [x] Create `src/modals/modal-helpers.ts` — `setupPromptModal(modal, titleText)` for addClass/empty/title; `createConfirmCancelButtons(contentEl, onConfirm, onCancel)` (repeated 5 times); `createInputWithEnterHandler(contentEl, placeholder, onEnter)` (repeated 5 times)
- [x] Move creation flow modals to `src/modals/issue-creation-modal.ts` — `NamePromptModal`, `PriorityPromptModal`, `GithubPromptModal`, `GitHubLinkTypeModal` + `createIssueWithGitHub`, `createIssueWithRepoLink` helpers
- [x] Move `DeleteConfirmationModal` to `src/modals/delete-confirmation-modal.ts`
- [x] Move `RenameIssueModal` to `src/modals/rename-issue-modal.ts`
- [x] Update all imports across codebase (DashboardRenderer.ts imports NamePromptModal, DeleteConfirmationModal, RenameIssueModal)
- [x] Verify `pnpm build` passes

## Group 8: Settings + Minor Cleanup (~40 lines saved)

Final deduplication pass.

- [x] In `src/settings.ts`: extract `createVisibilityToggle(container, dashboard, key, name, desc)` helper for 4 identical show*Buttons toggle patterns (showGitHubButtons, showFolderButtons, showTerminalButtons, showVSCodeButtons)
- [x] In `src/settings.ts`: cache `createPlatformService()` result instead of creating new instance per Browse click
- [x] Verify `pnpm build` passes

## New Files Created
- `src/utils/github-url.ts` — consolidated GitHub URL parsing
- `src/utils/dashboard-path.ts` — shared dashboard path construction
- `src/utils/github-helpers.ts` — shared GitHub display helpers
- `src/github/github-api-types.ts` — API response interfaces
- `src/dashboard/header-actions.ts` — button factory + visibility + action buttons
- `src/dashboard/sort-controls.ts` — sort dropdown + collapse/expand
- `src/modals/modal-helpers.ts` — shared modal setup helpers
- `src/modals/issue-creation-modal.ts` — creation flow modals
- `src/modals/delete-confirmation-modal.ts` — delete confirmation
- `src/modals/rename-issue-modal.ts` — rename modal

## Completion Criteria
- [x] All 8 groups implemented with `pnpm build` passing after each
- [ ] `pnpm lint` passes with no new warnings
- [ ] Manual test: dashboards render, buttons work, GitHub cards load
- [ ] No functional changes — behavior identical to pre-refactoring

---
Progress: 44/48 tasks complete
