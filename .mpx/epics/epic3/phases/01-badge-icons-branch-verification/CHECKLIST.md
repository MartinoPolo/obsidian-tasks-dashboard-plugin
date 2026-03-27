# Phase 1: Badge Icons + Branch/PR State Verification

**Status:** Complete
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

- [x] Add distinct SVG icons for each branch state (`active`, `local`, `remote-gone`, `deleted`, `unknown`)
- [x] Verify existing PR/issue state icons are correct; add any missing ones

### Branch Lifecycle Detection

- [x] Verify `resolveBranchStatus()` returns `remote-gone` when remote branch was deleted after full PR lifecycle
- [x] Ensure badge text/tooltip for `remote-gone` says "Remote branch deleted" not "not pushed yet"

### Merged PR Detection

- [x] Verify `computeAggregatePrState()` returns `merged` for merged PRs
- [x] Verify merged PR badge shows purple color + merged icon + "Merged" text

### Completion Criteria

- [x] Every branch state has a unique, visually distinguishable icon at 14px
- [x] Every PR state has a unique icon (including `review-requested`)
- [x] `remote-gone` badge tooltip says "Remote branch deleted" and uses a distinct color
- [x] Merged PR badge renders purple with merged icon and "Merged" text
- [x] All existing badge tests pass (`GitBadge.test.ts`)

---

Progress: 6/6 tasks complete

## Decisions

- Used Octicon `eye` for `review-requested` PR state (distinct from PR open icon)
- Changed `remote-gone` color from `#d29922` (amber, same as PR review) to `#e3872d` (orange) for visual distinction
- `PR_STATE_ICON['none']` and `ISSUE_STATE_ICON['unknown']` confirmed as type-safety fallbacks never rendered as badges
- Removed dead `GitBranchIcon.svelte` replaced by state-specific icons

## Blockers

None
