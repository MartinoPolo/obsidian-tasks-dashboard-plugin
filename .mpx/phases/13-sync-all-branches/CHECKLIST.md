# Phase 13: Sync All Branches

**Status:** Complete
**Dependencies:** Phase 11 (Local Git Detection Infrastructure), Phase 12 (Direct Git Sync)

## Objective

Replace the sequential terminal-spawning "Sync All" with a unified in-plugin flow. Single `git fetch origin` per unique repo, parallel per-branch sync, unified progress modal with per-branch status lines, and a summary for branches needing Claude Code.

## Scope

- Sync All toolbar button flow rewrite
- Unified progress modal with per-branch status
- Parallel per-branch sync (dirty check -> merge-tree -> merge + push)
- Post-sync summary for conflict/dirty branches (Claude Code fallback)

## Out of Scope

- Single-branch sync flow (Phase 12)
- Dead code removal (Phase 14)

---

## Tasks

### Unified Progress Modal

- [x] Create Sync All progress modal
      Obsidian `Modal` subclass displaying all branches being synced. Each branch shows a status line: branch name + status indicator progressing through "Checking..." -> "Merging..." -> "Pushing..." -> "Done" / "Conflicts" / "Dirty". The modal updates reactively as each branch progresses. Show a summary section at the bottom once all branches complete. Close button always available.

### Sync All Orchestration

- [x] Rewrite `handleSyncAllBranches` in `toolbar-sync-all.ts`
      New flow: collect behind branches, deduplicate repo roots, fetch once per repo via FetchCoordinator, parallel per-branch sync (dirty check -> merge-tree -> merge + push), update progress modal, collect Claude Code fallback branches.

- [x] Extend `getUnsyncedBranches` to return richer branch info
      Now returns `branchName`, `baseBranch`, `issueId`, `dashboardId` alongside `worktreeFolder`.

### Post-Sync Summary

- [x] Show summary for branches needing Claude Code
      After all automated syncs complete, dirty/conflict branches listed in progress modal summary section with "Let Claude Code handle" buttons that spawn terminal.

### Toolbar Integration

- [x] Wire rewritten Sync All into toolbar button
      Existing SortControls.svelte integration unchanged — same `handleSyncAllBranches` signature and `SyncAllDependencies` type.

### Completion Criteria

- [x] Sync All runs `git fetch origin` once per unique repo, not once per branch
- [x] Per-branch sync runs in parallel (dirty check -> merge-tree -> merge + push)
- [x] Unified progress modal shows live per-branch status lines
- [x] Dirty/conflict branches listed in summary with Claude Code fallback option
- [x] Dashboard refreshed and cache cleared after all syncs complete

---

Progress: 5/5 tasks complete

## Decisions

- Removed `SEQUENTIAL_SPAWN_DELAY_MS` constant — no longer needed since branches sync in parallel via git instead of sequential terminal spawning.
- FetchCoordinator created per-invocation (not shared with git-status-service instance) since Sync All does its own fetch cycle.

## Blockers

None
