# Phase 3: Sync Action

**Status:** Not Started
**Dependencies:** Phase 1 (Badge Icons), Phase 2 (GitHub API Enhancements)

## Objective

Add a per-issue sync button and a "Sync All" toolbar button for branches that are behind their base branch. Includes the "behind base" badge state and merge conflict warning.

## Scope

- "Behind base" branch badge state with unique color and sync icon
- `behind_by` count in badge text/tooltip
- Merge conflict warning icon (alert triangle) when `mergeable === false`
- Per-issue sync button in `HeaderBadges.svelte`
- "Sync All Un-synced Branches" toolbar button (Group 4: Sync)
- Windows Terminal integration for `claude /mp-sync-base`

## Out of Scope

- Automatic sync (always manual trigger)
- Merge conflict resolution UI
- Non-Windows terminal support

---

## Tasks

### Badge Layer

- [ ] Add "behind base" branch badge state with unique color and sync icon
      Create a new visual state in the badge system for branches that are behind. Show a sync icon (e.g., Octicon `sync` or Lucide `refresh-cw`). Use a unique color not used by other branch states. Show the `behind_by` count in the badge text (e.g., "3 behind") and tooltip (e.g., "Branch is 3 commits behind main"). This state is shown alongside (not replacing) the existing branch status badge. Render as an additional badge element after the branch badge in `HeaderBadges.svelte`.

- [ ] Add merge conflict warning icon next to sync badge when `mergeable === false`
      When `IssueGitStatus.mergeConflict === true`, show an alert triangle icon (Lucide `alert-triangle` or similar) next to the sync/behind badge. Add a tooltip: "Merge conflicts detected". The warning appears only when the branch is also behind (both conditions met). The icon color should be warning-level (yellow/amber).

### Sync Button

- [ ] Add per-issue sync button inline in issue header
      Render the sync button in `HeaderBadges.svelte`, right after the branch badge. Only visible when `IssueGitStatus.behindBaseCount > 0`. Clicking it: (1) opens Windows Terminal at the worktree folder using `platformService.openTerminal()` or equivalent, (2) auto-executes `claude /mp-sync-base` in that terminal. Show a spinning sync icon on the button while syncing, until the next git status refresh cycle detects `behindBaseCount === 0` (branch is up-to-date). The worktree folder path comes from the issue's `worktree_expected_folder` param.

### Toolbar Button

- [ ] Add "Sync All Un-synced Branches" button in dashboard toolbar
      Place in Group 4 (Sync) in `SortControls.svelte`. Disabled/grayed when no branches need syncing (i.e., no issues have `behindBaseCount > 0`). Clicking it spawns terminals sequentially -- one per unsynced branch -- each auto-executing `claude /mp-sync-base` at the respective worktree folder. Sequential means: open terminal 1, wait briefly (or detect completion), then open terminal 2, etc. Use `platformService` to spawn terminals.

### Completion Criteria

- [ ] "Behind base" badge shows correct `behind_by` count with sync icon
- [ ] Merge conflict warning appears when `mergeable === false`
- [ ] Per-issue sync button opens terminal and runs sync command
- [ ] Sync button shows spinning icon until branch is detected as up-to-date
- [ ] "Sync All" button is disabled when no branches need syncing
- [ ] "Sync All" spawns terminals sequentially for all unsynced branches

---

Progress: 0/4 tasks complete

## Decisions

[Decisions made during execution, with reasoning]

## Blockers

None
