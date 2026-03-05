# Phase 22: Worktree State Metadata and Recovery - Checklist

**Status:** In Progress
**Dependencies:** Phase 16 (worktree integration), issue frontmatter persistence, folder assignment service

## Objective
Harden worktree lifecycle state by persisting metadata, adding setup verification/retry, and exposing reliable worktree status and issue info affordances.

## Scope
- Auto-assign folder after successful setup
- Derive child-worktree context from persisted metadata instead of in-folder `.git`
- Persist branch/worktree metadata and expose status/info UI
- Add setup verification state machine and retry action
- Prioritize base-repository scope for worktree-origin GitHub linking
- Add dashboard-level worktree visual indication within existing Active/Archive model

## Tasks

### A. Setup Assignment + Source Context
- [x] Auto-assign expected worktree folder on successful setup with same behavior as manual assignment.
- [x] Persist/refresh worktree origin metadata needed for future child creation.
- [x] Derive child worktree creation context from stored metadata (not `.git` presence).
- [x] Keep child worktree creation functional when `.git` directory is absent in worktree folder.

### B. Metadata + Info Surfaces
- [x] Persist explicit worktree branch metadata in issue state and issue file properties.
- [x] Add issue info affordance that surfaces dashboard issue id/context, folder, GitHub links, and worktree details.
- [x] Add dashboard-level worktree visual indication (section/sort marker or per-issue marker) without changing Active/Archive model.

### C. Status Icon + Verification State Machine
- [x] Add header worktree status icon between collapse chevron and issue title.
- [x] Show green status when worktree is active.
- [x] Show red status when tracked branch is merged/deleted (safe-to-delete signal).
- [x] Implement setup verification state machine: pending (orange) with 1s polling for up to 10s.
- [x] Transition to success only after expected folder exists and assignment is active.
- [x] Transition to failure (red) after timeout.

### D. Recovery + Search Scope Priority
- [x] Add retry-capable `Add worktree later` header action.
- [x] Place `Add worktree later` as first header action.
- [x] Keep action hidden by default and auto-show only in setup-failed state.
- [x] Default/prioritize GitHub issue/PR search scope to source base repository for worktree issues.

## Validation
- [ ] Verify successful setup automatically assigns expected worktree folder. _(Blocked: requires manual Obsidian UI/runtime verification.)_
- [ ] Verify child creation succeeds from metadata even when worktree `.git` directory is absent. _(Blocked: requires manual Obsidian UI/runtime verification.)_
- [ ] Verify worktree branch metadata persists in issue file properties and survives reload/rebuild. _(Blocked: requires manual Obsidian UI/runtime verification.)_
- [ ] Verify status icon states: pending (orange), active (green), failure/safe-delete (red) with correct transitions. _(Blocked: requires manual Obsidian UI/runtime verification.)_
- [ ] Verify `Add worktree later` appears only on failed setup and retries setup flow. _(Blocked: requires manual Obsidian UI/runtime verification.)_
- [ ] Verify worktree issue GitHub link search defaults to source base repository. _(Blocked: requires manual Obsidian UI/runtime verification.)_
- [ ] Verify dashboard-level worktree indication is visible without breaking Active/Archive sections. _(Blocked: requires manual Obsidian UI/runtime verification.)_
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm build`

## Completion Criteria
- [ ] Worktree creation state is explicit, persisted, and recoverable.
- [ ] Worktree issue metadata and status are visible from issue header/info affordance.
- [ ] Worktree-linked GitHub search reliably prioritizes base repository context.

---
Progress: 17/31 tasks complete
