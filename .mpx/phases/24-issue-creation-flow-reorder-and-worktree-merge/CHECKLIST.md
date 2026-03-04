# Phase 24: Issue Creation Flow Reorder and Worktree Merge - Checklist

**Status:** Planned
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
- [ ] Redefine flow order so GitHub link selection is step 1 when integration is available.
- [ ] Skip GitHub-link step entirely when integration is unavailable for current dashboard/context.
- [ ] Move name entry to step 2 (or step 1 when GitHub step is skipped).

### B. GitHub Link Step Behavior
- [ ] Support live repository-scoped search while typing.
- [ ] Support number-aware lookup for issue identifiers.
- [ ] Show latest issues as default suggestions when input is empty.
- [ ] Support arrow-key navigation in suggestion list.
- [ ] Support Enter to select highlighted suggestion.
- [ ] Prefill name as `#{number} {title}` after selecting GitHub issue.
- [ ] Allow manual edits to prefilled name before confirmation.
- [ ] Enforce selection-lock: keep selected issue stable until field is fully cleared.
- [ ] In name/link inputs, map ArrowUp/ArrowDown to suggestions when field is empty or numeric-only.

### C. Worktree Merge into Add Issue
- [ ] Add conditional worktree yes/no step after name when worktree creation is eligible.
- [ ] Render explicit yes/no choices with visual semantics (Yes green tree, No red style).
- [ ] Remove dashboard-level `Add WorkTree Issue` button.
- [ ] Merge worktree capability into dashboard-level `Add Issue` flow.
- [ ] Rename per-issue `Add WorkTree Issue` action to `Add Issue` with plus icon.
- [ ] Preserve existing per-issue enable/disable gating semantics tied to worktree feasibility.

### D. Defaults + Naming
- [ ] Normalize derived worktree/branch names from final issue name (lowercase, dash spaces, git-safe chars).
- [ ] Include issue-number prefix in derived names when available.
- [ ] Preselect `Medium` as default priority.

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
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build`

## Completion Criteria
- [ ] Unified Add Issue flow covers standard + worktree paths with clear conditional steps.
- [ ] GitHub-first linking behavior is fast, predictable, and keyboard-driven.
- [ ] Worktree naming/default priority behavior matches new requirements.

---
Progress: 0/36 tasks complete
