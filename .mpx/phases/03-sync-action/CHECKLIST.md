# Phase 3: Sync Action

**Status:** Complete
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

- [x]Add "behind base" branch badge state with unique color and sync icon
      Create a new visual state in the badge system for branches that are behind. Show a sync icon (e.g., Octicon `sync` or Lucide `refresh-cw`). Use a unique color not used by other branch states. Show the `behind_by` count in the badge text (e.g., "3 behind") and tooltip (e.g., "Branch is 3 commits behind main"). This state is shown alongside (not replacing) the existing branch status badge. Render as an additional badge element after the branch badge in `HeaderBadges.svelte`.

- [x]Add merge conflict warning icon next to sync badge when `mergeable === false`
      When `IssueGitStatus.mergeConflict === true`, show an alert triangle icon (Lucide `alert-triangle` or similar) next to the sync/behind badge. Add a tooltip: "Merge conflicts detected". The warning appears only when the branch is also behind (both conditions met). The icon color should be warning-level (yellow/amber).

### Sync Button

- [x]Add per-issue sync button inline in issue header
      Render the sync button in `HeaderBadges.svelte`, right after the branch badge. Only visible when `IssueGitStatus.behindBaseCount > 0`. Clicking it: (1) opens Windows Terminal at the worktree folder using `platformService.openTerminal()` or equivalent, (2) auto-executes `claude /mp-sync-base` in that terminal. Show a spinning sync icon on the button while syncing, until the next git status refresh cycle detects `behindBaseCount === 0` (branch is up-to-date). The worktree folder path comes from the issue's `worktree_expected_folder` param.

### Toolbar Button

- [x]Add "Sync All Un-synced Branches" button in dashboard toolbar
      Place in Group 4 (Sync) in `SortControls.svelte`. Disabled/grayed when no branches need syncing (i.e., no issues have `behindBaseCount > 0`). Clicking it spawns terminals sequentially -- one per unsynced branch -- each auto-executing `claude /mp-sync-base` at the respective worktree folder. Sequential means: open terminal 1, wait briefly (or detect completion), then open terminal 2, etc. Use `platformService` to spawn terminals.

### Completion Criteria

- [x]"Behind base" badge shows correct `behind_by` count with sync icon
- [x]Merge conflict warning appears when `mergeable === false`
- [x]Per-issue sync button opens terminal and runs sync command
- [x]Sync button shows spinning icon until branch is detected as up-to-date
- [x]"Sync All" button is disabled when no branches need syncing
- [x]"Sync All" spawns terminals sequentially for all unsynced branches

---

Progress: 4/4 tasks complete

## Decisions

- **Sync icon**: Octicon `sync` (16px filled) — semantically matches "branch needs syncing" better than Lucide refresh-cw
- **Behind color**: `#58a6ff` (GitHub blue) — unique among all existing badge colors
- **Conflict color**: `#d29922` (amber/gold) — matches warning convention
- **Merge conflict as full badge**: Rendered as a pill badge (not bare icon) for visual consistency with other badges
- **Sync command constants**: Extracted `SYNC_COMMAND`/`SYNC_COMMAND_ARGS` to `src/constants/sync-constants.ts` to avoid duplication across IssueHeader and SortControls
- **Sequential terminal spawn**: 2-second delay between terminals for Sync All to avoid overwhelming the system
- **`hasUnsyncedBranches()` on GitStatusService**: Added method that iterates cached statuses to determine button state without re-fetching. Note: not fully reactive (plain Map cache not tracked by Svelte's signal system) — button state updates on re-render, not on cache write. Full reactivity deferred to Phase 10 refactoring.
- **`getUnsyncedBranches` re-parses dashboard file**: Reads vault file + regex to extract worktree folders on each Sync All click. Ideally would use cached data. Deferred to Phase 10 refactoring.
- **Sync All Group 4 placement**: Button appended to toolbar without visual group separation. Group layout is Phase 07's scope.

## Blockers

None
