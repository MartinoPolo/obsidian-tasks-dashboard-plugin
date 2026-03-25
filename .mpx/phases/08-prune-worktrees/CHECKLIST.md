# Phase 8: Prune Worktrees

**Status:** Complete
**Dependencies:** Phase 1 (closed-issue detection), Phase 7 (toolbar Group 4 placement)

## Objective

Add a "Prune Closed Worktrees" toolbar button that detects fully-closed issues, shows a confirmation modal, bulk-removes their worktrees, and archives the dashboard issues.

## Scope

- "Prune Closed Worktrees" toolbar button in Group 4 (Sync)
- Auto-detection of prunable issues (closed PR + deleted remote + closed GitHub issue)
- Confirmation modal listing worktrees and associated issues
- Bulk invocation of `remove-worktree.sh --skip-confirmation name1 name2 ...`
- Archive dashboard issues after successful worktree removal
- Verify `remove-worktree.sh` handles multiple branch arguments with `--skip-confirmation`

## Out of Scope

- Manual worktree removal (existing feature)
- Selective pruning (user can only confirm/cancel the full list)
- Non-worktree issues

---

## Tasks

### Detection

- [x] Implement prunable-issue detection logic
      Reuses shared `isFullyClosed()` helper from `git-status-types.ts`. Checks: worktree === true, has branch name, aggregatePrState merged/closed, branchStatus remote-gone/deleted, linked GitHub issue closed/not_planned. Returns `PrunableIssueInfo[]`. Cached for reuse by handler.

### UI

- [x] Add "Prune Closed Worktrees" button in dashboard toolbar Group 4
      Scissors icon in Group 4 (Sync), next to Sync All. Disabled/faded when no issues prunable. Tooltip shows count (e.g., "Prune 3 closed worktrees"). Prunable count reactively updated with debounce guard.

- [x] Create confirmation modal listing worktrees to be pruned
      `PruneConfirmationModal` extends `Modal`, mounts `PruneConfirmationDialog.svelte` showing issue names and branch names. Confirm/Cancel with Enter/Esc support.

### Execution

- [x] On confirm, call `remove-worktree.sh --skip-confirmation` with all branch names
      `runBulkWorktreeRemovalScript` in `script-execution.ts` validates each name with `isUnsafeScriptArgument` (blocks path traversal, spaces, shell metacharacters), then spawns single terminal with `--skip-confirmation name1 name2 ...`.

- [x] Archive dashboard issues after successful worktree removal
      Sequential archiving via `archiveIssuesSequentially()` to avoid concurrent file write races. Tracks success/failure count. Shows partial-failure-aware Notice.

### Script Verification

- [x] Verify `remove-worktree.sh` robust behavior with `--skip-confirmation` and multiple arguments
      Script modified: (a) skips missing worktrees in bulk mode instead of aborting, (b) validates names against path traversal (`/`, `\`, `..`), (c) `set -e`-safe with `|| true` guards on fallback paths, (d) runs `git worktree prune` at end.

### Completion Criteria

- [x] "Prune Closed Worktrees" button appears in toolbar Group 4
- [x] Button is disabled when no worktrees are prunable
- [x] Confirmation modal lists all worktrees and issues to be removed
- [x] Worktree removal invokes `remove-worktree.sh` with all branch names at once
- [x] Dashboard issues are archived after successful removal
- [x] Partial failure (some worktrees fail) does not prevent archiving successful ones

---

Progress: 6/6 tasks complete

## Decisions

- Used scissors icon (Lucide) for prune button — conveys cleanup/pruning better than trash
- Extracted `isFullyClosed()` to `git-status-types.ts` as shared helper (used by IssueHeader and SortControls)
- Archive sequentially (not parallel) to avoid read-modify-write races on dashboard file
- Script validates branch names against path traversal before constructing filesystem paths
- Archiving is optimistic (starts after terminal launch, not after script completion) — inherent to fire-and-forget terminal design

## Blockers

None
