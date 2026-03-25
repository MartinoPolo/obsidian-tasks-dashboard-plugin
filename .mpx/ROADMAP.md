# Implementation Roadmap

Project: Tasks Dashboard Plugin
Updated: 2026-03-24

## Completed Epics

- **epic1** -- Core plugin: dashboard structure, issue lifecycle, GitHub integration, worktree integration, color system, project folders, settings, git status badges, priority toggle, code quality. 29 phases. See [epics/epic1/](epics/epic1/).

## Current Epic: Epic 2

### Phase Overview

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
| 09 | Issue Creation + Worktree Safety | Not Started | -- |
| 10 | Refactoring / Componentization | Not Started | 01-09 |

### Dependency Graph

```
01 (Badge Icons) -----> 03 (Sync Action) <----- 02 (GitHub API)
     |
     +---> 04 (Badge Contrast)
     |
     +---> 05 (Color Picker + Closed Appearance)
     |
     +---> 08 (Prune Worktrees) <----- 07 (Dashboard Toolbar)

06 (Info Panel) -------> independent
07 (Toolbar Reorder) --> independent (but 08 places button in Group 4)
09 (Creation + Safety) -> independent

10 (Refactoring) ------> after all feature phases
```

### Phase Details

**Phase 01: Badge Icons + Branch/PR State Verification** — Complete. Added 5 branch + 1 PR review icon, verified detection logic, fixed remote-gone color.

**Phase 02: GitHub API Enhancements** — Complete. Added `compareBranches()` and `getPullRequestMergeable()` to GitHubService, extended `IssueGitStatus` with `behindBaseCount`/`mergeConflict`, integrated into git status flow with parallel API calls.

**Phase 03: Sync Action** — Complete. Added behind-base badge (blue, sync icon, count), merge conflict warning badge (amber, alert-triangle), per-issue sync button (opens terminal with `claude /mp-sync-base`), and Sync All toolbar button with reactive disabled state.

**Phase 04: Badge Contrast Adaptation** — Complete. Badge borders adapt to issue text color via `--tdc-issue-header-link-color`, all badge backgrounds use semi-transparent `color-mix()` for contrast on colored headers.

**Phase 05: Color Picker + Closed Issue Appearance** — Complete. Renamed label to "Custom color", added "A" preview letter, implemented grayscale overlay for fully-closed issues (merged/closed PR + remote-gone/deleted branch + closed GitHub issue).

**Phase 06: Issue Info Panel Restructure** — Complete. Removed IDs, restructured into 4 sections with styled headers, branch info deduplicated.

**Phase 07: Dashboard Toolbar Reorder** — Complete. Restructured toolbar into 6 groups (Create, View, External, Sync, Maintain, Config) with 16px inter-group gaps, ResizeObserver-based responsive hiding of Import Note/Rebuild, Settings pinned rightmost.

**Phase 08: Prune Worktrees** — Complete. Scissors button in toolbar Group 4 detects fully-closed worktree issues, shows confirmation modal, bulk-removes via `remove-worktree.sh --skip-confirmation`, sequentially archives. Shared `isFullyClosed()` helper, path traversal validation, partial-failure tracking.

**Phase 09: Issue Creation + Worktree Safety**
Fix GitHub search empty-result flow and add repo-folder mismatch safety check. Independent small fixes.

**Phase 10: Refactoring / Componentization**
Large file refactoring and isolated component extraction. Runs after all feature work to avoid merge conflicts.

## Decisions

- "Running dev environments" feature intentionally skipped for Epic 2.
- Phase 05 groups color picker and closed-issue appearance since both touch the color/visual system and are small.
- Phase 09 groups issue creation fix and worktree safety since both are small independent fixes.
- Worktree safety "assigned issue deletion" behavior remains decision-pending (SPEC notes user input needed).

## Blockers

- Worktree safety: "Decide behavior for assigned issues whose dashboard issue was deleted" -- needs user decision (SPEC item).

## Unphased Backlog

- OAuth authentication for GitHub (alternative to PAT)
