# Phase 8: Prune Worktrees

**Status:** Not Started
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

- [ ] Implement prunable-issue detection logic
      Reuse the "fully closed" detection from Phase 05 (or implement if Phase 05 is not yet complete): an issue is prunable when (1) `aggregatePrState` is `merged` or `closed`, (2) `branchStatus` is `remote-gone` or `deleted`, (3) at least one linked GitHub issue has `state === 'closed'`, and (4) the issue is a worktree issue (`worktree === true`). Collect all prunable issues from the dashboard's git status data. Return an array of `{ issueId, issueName, branchName, worktreeFolder }` for each prunable issue.

### UI

- [ ] Add "Prune Closed Worktrees" button in dashboard toolbar Group 4
      Place in `SortControls.svelte` in Group 4 (Sync), next to where "Sync All" will be. Use a distinct icon (e.g., Lucide `scissors` or `trash-2` -- pick one that conveys cleanup). Disabled/grayed when no issues are prunable. Show count in tooltip (e.g., "Prune 3 closed worktrees").

- [ ] Create confirmation modal listing worktrees to be pruned
      When the button is clicked: (1) run the prunable-issue detection, (2) if no issues are prunable, show a notice "No closed worktrees to prune", (3) otherwise show a modal listing each worktree name and its associated issue name. The modal has Confirm and Cancel buttons. Use the existing modal patterns (extend `Modal` from Obsidian).

### Execution

- [ ] On confirm, call `remove-worktree.sh --skip-confirmation` with all branch names
      Invoke `remove-worktree.sh --skip-confirmation name1 name2 ...` as a single command using `platformService.runCommand()` or equivalent. Pass all branch names as space-separated arguments. The script already handles multiple names and loops internally. Handle script failure gracefully (show error notice).

- [ ] Archive dashboard issues after successful worktree removal
      After `remove-worktree.sh` completes successfully, call `plugin.dashboardWriter.archiveIssue(dashboard, issueId)` for each pruned issue. Show a success notice: "Pruned N worktrees and archived N issues."

### Script Verification

- [ ] Verify `remove-worktree.sh` robust behavior with `--skip-confirmation` and multiple arguments
      The script at `scripts/remove-worktree.sh` already supports `--skip-confirmation` flag and multiple branch names. Verify: (a) it skips the confirmation prompt, (b) it processes all names even if one fails, (c) it runs `git worktree prune` at the end. Currently the script uses `exit 1` on validation failure -- verify this doesn't abort remaining worktrees. Consider whether partial failure should be handled (e.g., first worktree removal fails but others succeed).

### Completion Criteria

- [ ] "Prune Closed Worktrees" button appears in toolbar Group 4
- [ ] Button is disabled when no worktrees are prunable
- [ ] Confirmation modal lists all worktrees and issues to be removed
- [ ] Worktree removal invokes `remove-worktree.sh` with all branch names at once
- [ ] Dashboard issues are archived after successful removal
- [ ] Partial failure (some worktrees fail) does not prevent archiving successful ones

---

Progress: 0/6 tasks complete

## Decisions

[Decisions made during execution, with reasoning]

## Blockers

None
