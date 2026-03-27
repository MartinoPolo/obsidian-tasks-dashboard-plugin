# Phase 12: Direct Git Sync (Single Branch)

**Status:** Complete
**Dependencies:** Phase 11 (Local Git Detection Infrastructure)

## Objective

Replace the terminal-based Claude Code sync with direct in-plugin git operations for clean branches. Dirty worktrees and conflict cases fall back to Claude Code via terminal. Show a progress modal with step-by-step status during sync.

## Scope

- Single-branch sync flow on sync badge click
- Dirty worktree detection and modal
- Clean merge + push via async git commands
- Progress modal with step feedback
- Claude Code terminal fallback for conflicts and dirty worktrees

## Out of Scope

- Sync All orchestration (Phase 13)
- Dead code removal (Phase 14)

---

## Tasks

### Dirty Check

- [x] Add `isWorktreeDirty(worktreeFolder)` helper
      Runs sync `runGitCommandOutput(worktreeFolder, ['status', '--porcelain'])`. Return `true` if output is non-empty (uncommitted changes exist), `false` if empty. Return `undefined` on command failure.

### Dirty Worktree Modal

- [x] Create dirty-worktree modal
      Obsidian `Modal` subclass shown when `isWorktreeDirty` returns `true`. Display message: "Worktree has uncommitted changes." Two buttons: "Handle yourself" (dismiss modal, no action) and "Let Claude Code handle it" (opens terminal with Claude instructed to commit/stash uncommitted changes, merge base branch, resolve conflicts if any, and push). Use `SYNC_COMMAND` / `SYNC_COMMAND_ARGS` from `sync-constants.ts` for the terminal invocation.

### Progress Modal

- [x] Create sync progress modal
      Obsidian `Modal` subclass showing sync step progression. Display steps as a vertical list, each with a status indicator: "Checking for conflicts..." -> "Merging origin/<baseBranch>..." -> "Pushing..." -> "Done" / "Failed: <error>". Each step transitions from pending to active to complete/failed. Modal has a close button (always available). On failure, show the error message from stderr. The modal updates reactively as each step completes.

### Sync Flow

- [x] Implement `syncSingleBranch(worktreeFolder, baseBranch, callbacks)` service function
      Orchestrates the full single-branch sync:
      1. Call `isWorktreeDirty(worktreeFolder)`. If dirty: open DirtyWorktreeModal, return early.
      2. Open progress modal. Run `detectMergeConflicts`. If conflicts: close modal, open Claude Code terminal.
      3. Run `runGitCommandAsync(worktreeFolder, ['merge', 'origin/<baseBranch>', '--no-edit'])`. On failure: show error in modal.
      4. Run `runGitCommandAsync(worktreeFolder, ['push'])`. On failure: show error in modal.
      5. On success: show notice, invoke onSuccess callback.

- [x] Wire sync badge click to new sync flow in `IssueHeader.svelte`
      Replaced `handleSyncBranch` terminal-based sync with `syncSingleBranch` call. On success: invalidate cache, increment badge refresh trigger, clear syncing state.

### Completion Criteria

- [x] Clicking sync badge on a clean, no-conflict branch runs merge + push in-plugin
- [x] Progress modal shows live step progression during sync
- [x] Dirty worktree shows modal with "Handle yourself" / "Let Claude Code handle it" options
- [x] Conflict detection before merge triggers Claude Code terminal fallback
- [x] Git status cache cleared and dashboard refreshed after successful sync

---

Progress: 5/5 tasks complete

## Decisions

- `syncSingleBranch` uses a params-object pattern instead of separate callbacks — cleaner API with `onSuccess` callback for cache invalidation.
- Progress modal uses remount-on-update pattern (unmount + mount) for simplicity since Obsidian modals don't natively support Svelte reactivity after initial mount.

## Blockers

None
