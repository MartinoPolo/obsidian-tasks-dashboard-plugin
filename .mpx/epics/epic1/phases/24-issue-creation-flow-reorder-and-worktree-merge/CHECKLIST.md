# Phase 24: Issue Creation Flow Reorder and Worktree Merge - Checklist

**Status:** In Progress
**Dependencies:** Phase 07 (issue creation UX), Phase 16 (worktree integration), current GitHub link step implementation

## Objective
Restructure issue creation flow to start with GitHub linking, merge worktree creation into the primary Add Issue flow, and improve keyboard/suggestion behavior.

## Scope
- Reorder steps: GitHub link (conditional) → name → remaining steps
- Add conditional worktree yes/no step
- Remove global `Add WorkTree Issue` entry point and merge into `Add Issue`
- Rename per-issue worktree action to `Add Issue`
- Improve suggestion navigation, selection-lock, prefill, and branch-name normalization
- Set default priority to Medium

## Tasks

### A. Step Order + Conditionality
- [x] Redefine flow order so GitHub link selection is step 1 when integration is available.
- [x] Skip GitHub-link step entirely when integration is unavailable for current dashboard/context.
- [x] Move name entry to step 2 (or step 1 when GitHub step is skipped).

### B. GitHub Link Step Behavior
- [x] Support live repository-scoped search while typing.
- [x] Support number-aware lookup for issue identifiers.
- [x] Show latest issues as default suggestions when input is empty.
- [x] Support arrow-key navigation in suggestion list.
- [x] Support Enter to select highlighted suggestion.
- [x] Prefill name as `#{number} {title}` after selecting GitHub issue.
- [x] Allow manual edits to prefilled name before confirmation.
- [x] Enforce selection-lock: keep selected issue stable until field is fully cleared.
- [x] In name/link inputs, map ArrowUp/ArrowDown to suggestions when field is empty or numeric-only.

### C. Worktree Merge into Add Issue
- [x] Add conditional worktree yes/no step after name when worktree creation is eligible.
- [x] Render explicit yes/no choices with visual semantics (Yes green tree, No red style).
- [x] Remove dashboard-level `Add WorkTree Issue` button.
- [x] Merge worktree capability into dashboard-level `Add Issue` flow.
- [x] Rename per-issue `Add WorkTree Issue` action to `Add Issue` with plus icon.
- [x] Preserve existing per-issue enable/disable gating semantics tied to worktree feasibility.

### D. Defaults + Naming
- [x] Normalize derived worktree/branch names from final issue name (lowercase, dash spaces, git-safe chars).
- [x] Include issue-number prefix in derived names when available.
- [x] Preselect `Medium` as default priority.

## Validation
- [ ] Verify step order follows GitHub-first flow where available and skips cleanly where unavailable.
- [ ] Verify selected GitHub issue prefill and manual-name editing behavior.
- [ ] Verify selection-lock prevents unintended auto-search restart until input is cleared.
- [ ] Verify conditional worktree yes/no step appears only when eligible.
- [ ] Verify dashboard no longer exposes standalone `Add WorkTree Issue` button.
- [ ] Verify per-issue action label/icon changed to `Add Issue` and gating remains unchanged.
- [ ] Verify ArrowUp/ArrowDown suggestion navigation behavior for empty/numeric inputs.
- [ ] Verify derived worktree/branch naming rules and number-prefix behavior.
- [ ] Verify priority default is `Medium`.
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm build`

Blocked manual/browser verification items above were intentionally skipped per request: "skip browser verification entirely".

## Completion Criteria
- [x] Unified Add Issue flow covers standard + worktree paths with clear conditional steps.
- [ ] GitHub-first linking behavior is fast, predictable, and keyboard-driven.
- [x] Worktree naming/default priority behavior matches new requirements.

---
Progress: 26/36 tasks complete
