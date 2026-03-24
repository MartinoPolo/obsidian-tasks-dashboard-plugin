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
| 02 | GitHub API Enhancements | Not Started | -- |
| 03 | Sync Action | Not Started | 01, 02 |
| 04 | Badge Contrast Adaptation | Not Started | 01 |
| 05 | Color Picker + Closed Issue Appearance | Not Started | 01 |
| 06 | Issue Info Panel Restructure | Not Started | -- |
| 07 | Dashboard Toolbar Reorder | Not Started | -- |
| 08 | Prune Worktrees | Not Started | 01, 07 |
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

**Phase 02: GitHub API Enhancements**
Add GitHub compare API integration (`behind_by` count) and PR `mergeable` field support. These feed the sync action in Phase 03 and the "behind base" badge state.

**Phase 03: Sync Action**
Add per-issue sync button (visible when branch is behind base) and "Sync All" toolbar button. Depends on Phase 01 (badge infrastructure) and Phase 02 (behind detection + mergeable field).

**Phase 04: Badge Contrast Adaptation**
Adapt badge colors to issue header background. Use semi-transparent semantic colors with issue text color as border. Depends on Phase 01 badge system being complete.

**Phase 05: Color Picker + Closed Issue Appearance**
Rename "Text color" to "Custom color", add letter "A" preview, and implement grayscale overlay for fully-closed issues. Depends on Phase 01 for closed-issue state detection.

**Phase 06: Issue Info Panel Restructure**
Remove Dashboard/Issue IDs from panel, restructure into section hierarchy (Issue, GitHub, Branch, Worktree). Independent of other phases.

**Phase 07: Dashboard Toolbar Reorder**
Reorder buttons into 6 visual groups with gaps. Handle responsive hiding. Independent, but Phase 08 adds buttons to Group 4.

**Phase 08: Prune Worktrees**
Add "Prune Closed Worktrees" button. Detect closed issues, show confirmation, bulk-remove worktrees, archive dashboard issues. Depends on Phase 01 (closed-issue detection) and Phase 07 (toolbar Group 4 placement).

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
