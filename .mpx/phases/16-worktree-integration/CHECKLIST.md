# Phase 16: Worktree Integration - Checklist

**Status:** In Progress
**Dependencies:** Phase 03 (GitHub core), Phase 07 (issue UX prompts/actions), Phase 08 (project folder + process launch), Phase 14 (action visibility/layout)

## Objective
Add a worktree-enabled issue creation flow and lifecycle cleanup hooks while preserving existing keyboard-driven UX patterns and process-launch safety invariants.

## Assumptions
- `Add issue in worktree` appears in the same surfaces where the current GitHub action is shown (global and per-issue where applicable).
- Visibility and enablement exactly follow existing GitHub action logic.
- Selected color is passed to worktree scripts as a normalized hex argument through safe spawn args.

## Scope
- New worktree action entry point and icon treatment
- Shared add-issue flow extension with color selection
- Worktree setup/removal process integration
- Archive/delete confirmation prompt for worktree removal

## Tasks

### A. Action Entry & Visibility
- [x] Add `Add issue in worktree` action in dashboard/per-issue action surfaces aligned to existing GitHub action placement.
- [x] Apply GitHub-like icon with additional square-accent treatment for worktree action.
- [x] Reuse existing GitHub action visibility logic without introducing separate visibility settings.

### B. Keyboard-Driven Prompt Flow
- [x] Add worktree creation prompt flow with ordered steps: worktree name, worktree color, priority, GitHub association.
- [x] Implement worktree color selection with preset palette and custom color picker.
- [x] Preserve current keyboard-first modal semantics (Enter confirm, navigation consistency, cancel behavior).

### C. Shared Add-Issue Flow Reuse
- [x] Refactor/extend shared issue creation flow so both standard and worktree flows include color selection.
- [x] Keep standard issue creation behavior unchanged apart from new shared color step.
- [x] Ensure worktree flow diverges only by executing worktree setup after inputs are collected.

### D. Worktree Setup Execution
- [x] Execute `C:\_MP_projects\mxp-claude-code\scripts\setup-worktree.sh` after collecting worktree-flow inputs.
- [x] Pass selected name and color to setup script through safe process args.
- [x] Maintain injection-safe process launch (`spawn(..., { shell: false })`) and Windows Terminal compatibility.

### E. Archive/Delete Cleanup Prompt
- [x] Add confirmation prompt on issue archive asking whether to remove associated worktree.
- [x] Add confirmation prompt on issue delete asking whether to remove associated worktree.
- [x] On confirm, execute `C:\_MP_projects\mxp-claude-code\scripts\remove-worktree.sh` via same safe process-launch path.

## Validation
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm build`

## Blockers

- Manual Obsidian UX verification is still required for prompt navigation and action placement confirmation.
- External script runtime behavior (`setup-worktree.sh`, `remove-worktree.sh`) was wired but not executed in this environment.

## Completion Criteria
- [ ] Worktree action is discoverable wherever GitHub action is available and respects the same visibility constraints.
- [ ] Worktree flow completes with keyboard-only operation and captures name/color/priority/GitHub link.
- [ ] Shared add-issue flow supports color step without regressions in standard issue creation.
- [ ] Setup and removal scripts execute through safe spawn path with expected arguments.
- [ ] Archive/delete cleanup prompts appear and execute removal only on confirmation.

---
Progress: 18/23 tasks complete
