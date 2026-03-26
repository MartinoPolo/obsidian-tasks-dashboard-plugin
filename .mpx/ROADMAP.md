# Implementation Roadmap

Project: Tasks Dashboard Plugin
Updated: 2026-03-26

## Completed Epics

- **epic1** -- Core plugin: dashboard structure, issue lifecycle, GitHub integration, worktree integration, color system, project folders, settings, git status badges, priority toggle, code quality. 29 phases. See [epics/epic1/](epics/epic1/).
- **epic2** -- Badge icons, base branch sync detection, sync action, badge contrast, color picker, closed issue appearance, info panel, toolbar reorder, prune worktrees, issue creation safety, refactoring. 10 phases.
- **epic3** -- Local git branch sync: replaced GitHub API-based behind-count/conflict detection with local git operations, direct in-plugin merge+push sync with progress modals, parallel Sync All, dead code cleanup. 4 phases.

### Epic 2 Phase Overview

| Phase | Name | Status | Dependencies |
|-------|------|--------|-------------|
| 01 | Badge Icons + Branch/PR State Verification | Complete | -- |
| 02 | GitHub API Enhancements | Complete | -- |
| 03 | Sync Action | Complete | 01, 02 |
| 04 | Badge Contrast Adaptation | Complete | 01 |
| 05 | Color Picker + Closed Issue Appearance | Complete | 01 |
| 06 | Issue Info Panel Restructure | Complete | -- |
| 07 | Dashboard Toolbar Reorder | Complete | -- |
| 08 | Prune Worktrees | Complete | 01, 07 |
| 09 | Issue Creation + Worktree Safety | Complete | -- |
| 10 | Refactoring / Componentization | Complete | 01-09 |

<details>
<summary>Epic 2 Phase Details</summary>

**Phase 01: Badge Icons + Branch/PR State Verification** -- Complete. Added 5 branch + 1 PR review icon, verified detection logic, fixed remote-gone color.

**Phase 02: GitHub API Enhancements** -- Complete. Added `compareBranches()` and `getPullRequestMergeable()` to GitHubService, extended `IssueGitStatus` with `behindBaseCount`/`mergeConflict`, integrated into git status flow with parallel API calls.

**Phase 03: Sync Action** -- Complete. Added behind-base badge (blue, sync icon, count), merge conflict warning badge (amber, alert-triangle), per-issue sync button (opens terminal with `claude /mp-sync-base`), and Sync All toolbar button with reactive disabled state.

**Phase 04: Badge Contrast Adaptation** -- Complete. Badge borders adapt to issue text color via `--tdc-issue-header-link-color`, all badge backgrounds use semi-transparent `color-mix()` for contrast on colored headers.

**Phase 05: Color Picker + Closed Issue Appearance** -- Complete. Renamed label to "Custom color", added "A" preview letter, implemented grayscale overlay for fully-closed issues (merged/closed PR + remote-gone/deleted branch + closed GitHub issue).

**Phase 06: Issue Info Panel Restructure** -- Complete. Removed IDs, restructured into 4 sections with styled headers, branch info deduplicated.

**Phase 07: Dashboard Toolbar Reorder** -- Complete. Restructured toolbar into 6 groups (Create, View, External, Sync, Maintain, Config) with 16px inter-group gaps, ResizeObserver-based responsive hiding of Import Note/Rebuild, Settings pinned rightmost.

**Phase 08: Prune Worktrees** -- Complete. Scissors button in toolbar Group 4 detects fully-closed worktree issues, shows confirmation modal, bulk-removes via `remove-worktree.sh --skip-confirmation`, sequentially archives. Shared `isFullyClosed()` helper, path traversal validation, partial-failure tracking.

**Phase 09: Issue Creation + Worktree Safety** -- Complete. Standalone creation notice on empty search, repo-folder mismatch disables worktree buttons, orange re-assign buttons for previously-deleted issues.

**Phase 10: Refactoring / Componentization** -- Complete. 6 extractions (SortControls toolbar logic, IssueHeader info content, issue-creation-modal helpers, action confirmations, IssueManager block-edit, OverflowPanel settings mode). 11 new focused modules, ~1100 lines moved.

</details>

### Epic 3 Phase Overview

| Phase | Name | Status | Dependencies |
|-------|------|--------|-------------|
| 11 | Local Git Detection Infrastructure | Complete | -- |
| 12 | Direct Git Sync (Single Branch) | Complete | 11 |
| 13 | Sync All Branches | Complete | 11, 12 |
| 14 | Cleanup | Complete | 11, 12, 13 |

<details>
<summary>Epic 3 Phase Details</summary>

**Phase 11: Local Git Detection Infrastructure** -- Complete. Added `runGitCommandAsync` async spawn wrapper, `createFetchCoordinator` for fetch deduplication per repo root, `getBehindCount` via `git rev-list`, `detectMergeConflicts` via `git merge-tree --write-tree`. Replaced GitHub API calls in git-status-service with local git operations that work without GitHub auth.

**Phase 12: Direct Git Sync (Single Branch)** -- Complete. On sync badge click: `isWorktreeDirty` check with DirtyWorktreeModal fallback, `detectMergeConflicts` with Claude Code terminal fallback, then `git merge + git push` (async) with SyncProgressModal showing step-by-step feedback. Replaces terminal-only sync in IssueHeader.svelte.

**Phase 13: Sync All Branches** -- Complete. Toolbar "Sync All" rewired: single `git fetch origin` per unique repo root via FetchCoordinator, parallel per-branch sync (dirty check -> merge-tree -> merge + push), unified SyncAllProgressModal with per-branch status lines. Post-sync summary lists dirty/conflict branches with "Let Claude Code handle" buttons.

**Phase 14: Cleanup** -- Complete. Removed `compareBranches`, `getPullRequestMergeable`, `BranchCompareResult`, `GitHubCompareApiResponse`, `OPEN_PR_STATES` dead code. Updated `sync-constants.ts` with fallback-only clarification. Lint + build pass.

</details>

## Decisions

### Epic 2

- "Running dev environments" feature intentionally skipped for Epic 2.
- Phase 05 groups color picker and closed-issue appearance since both touch the color/visual system and are small.
- Phase 09 groups issue creation fix and worktree safety since both are small independent fixes.

### Epic 3

- Phases 11-14 numbered sequentially after Epic 2's phases 01-10. Epic 2 phase directories preserved as-is.
- Detection infrastructure (async wrapper + fetch dedup + behind-count + conflict detection) grouped into one phase since they are tightly coupled and form the foundation for sync flows.
- Single-branch sync and Sync All are separate phases because they have different UI patterns (progress modal vs. unified multi-branch modal) despite sharing the same detection layer.
- Cleanup is a separate final phase to avoid mixing dead code removal with feature work.
- Local git detection moved outside `if (githubService.isAuthenticated())` block — behind-count and conflict detection work without GitHub token.

## Blockers

None

## Unphased Backlog

- OAuth authentication for GitHub (alternative to PAT)
