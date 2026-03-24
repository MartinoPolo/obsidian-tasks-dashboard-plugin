# Phase 1: Badge Icons + Branch/PR State Verification

**Status:** Not Started
**Dependencies:** None

## Objective

Add distinct SVG icons for every branch, PR, and issue badge state. Verify that branch lifecycle detection and merged PR detection work correctly end-to-end (logic + display).

## Scope

- SVG icons for all branch states: `active`, `local`, `remote-gone`, `deleted`, `unknown`
- SVG icons for all PR states: `open`, `draft`, `merged`, `closed`, `review-requested`
- SVG icons for all issue states: `open`, `closed`, `not-planned`
- Branch lifecycle detection verification (`resolveBranchStatus()`)
- Merged PR detection verification (`computeAggregatePrState()`)
- Badge text, tooltip, and color corrections

## Out of Scope

- Badge contrast adaptation to issue colors (Phase 04)
- Sync-related badges (Phase 03)
- "Behind base" badge state (Phase 02/03)

---

## Tasks

### Icons

- [ ] Add distinct SVG icons for each branch state (`active`, `local`, `remote-gone`, `deleted`, `unknown`)
      Use GitHub Octicons where possible, Lucide as fallback. Each state must be visually distinguishable at 14px without reading the tooltip. Add to `src/components/icons/`, register in `icons/index.ts`, and add `BRANCH_STATUS_ICON` map in `git-badge-maps.ts`. Currently `git-badge-maps.ts` has no icon map for branch states -- only CSS class and tooltip prefix maps exist.

- [ ] Verify existing PR/issue state icons are correct; add any missing ones
      PR states: `open`, `draft`, `merged`, `closed`, `review-requested`. Issue states: `open`, `closed`, `not-planned`. Icons already exist in `icons/index.ts` (GitPrOpen, GitPrMerged, GitPrClosed, GitPrDraft, GitIssueOpen, GitIssueClosed, GitIssueNotPlanned). Verify each SVG matches the expected GitHub visual. `review-requested` currently reuses `gitPrOpen` -- consider adding a distinct icon (e.g., Octicon `eye` or review icon). Add missing icons if any state lacks a unique visual.

### Branch Lifecycle Detection

- [ ] Verify `resolveBranchStatus()` returns `remote-gone` when remote branch was deleted after full PR lifecycle
      In `git-status-service.ts`, `resolveBranchStatus()` checks `checkBranchExists()` then `hasBranchUpstreamConfig()`. When result is `local` and upstream config exists, it returns `remote-gone`. Verify this path works for the scenario: PR merged -> remote branch deleted -> local branch still exists with upstream config. If detection is already correct, this task is verification-only. If wrong, fix the logic.

- [ ] Ensure badge text/tooltip for `remote-gone` says "Remote branch deleted" not "not pushed yet"
      `BRANCH_STATUS_TOOLTIP_PREFIX` in `git-badge-maps.ts` already maps `remote-gone` to `"Remote branch deleted"` and `local` to `"Branch local only (not pushed)"`. Verify `IssueHeader.svelte` uses these maps correctly in `branchBadge` construction. The branch badge text in `HeaderBadges.svelte` should show the correct label. Use a distinct color for `remote-gone` -- orange or another unused color (currently has CSS class `tdc-git-badge-branch-remote-gone` with CSS variable `--tdc-git-branch-remote-gone`). Verify the CSS variable is defined and visually distinct.

### Merged PR Detection

- [ ] Verify `computeAggregatePrState()` returns `merged` for merged PRs
      In `git-status-service.ts`, `computeAggregatePrState()` picks the PR state with highest priority (lowest number). Priority order: `review-requested(0)`, `open(1)`, `draft(2)`, `merged(3)`, `closed(4)`, `none(5)`. For a single merged PR, it should return `merged`. For mixed states (e.g., one merged + one open), it returns the highest-priority state. Verify this is correct behavior. Test with: (a) single merged PR, (b) multiple PRs where one is merged.

- [ ] Verify merged PR badge shows purple color + merged icon + "Merged" text
      `PR_STATE_CSS_CLASS['merged']` maps to `tdc-git-badge-merged`. `PR_STATE_ICON['merged']` maps to `gitPrMerged`. `PR_STATE_LABEL['merged']` maps to `"Merged"`. Verify the CSS class applies purple color matching GitHub's purple (`#8957e5` or similar). Check `GitBadge.svelte` CSS variable `--tdc-git-pr-merged` is defined correctly in the stylesheet.

### Completion Criteria

- [ ] Every branch state has a unique, visually distinguishable icon at 14px
- [ ] Every PR state has a unique icon (including `review-requested`)
- [ ] `remote-gone` badge tooltip says "Remote branch deleted" and uses a distinct color
- [ ] Merged PR badge renders purple with merged icon and "Merged" text
- [ ] All existing badge tests pass (`GitBadge.test.ts`)

---

Progress: 0/6 tasks complete

## Decisions

[Decisions made during execution, with reasoning]

## Blockers

None
