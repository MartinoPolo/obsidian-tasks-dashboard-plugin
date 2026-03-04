# Phase 21: Modal Event Propagation Guards - Checklist

**Status:** Planned
**Dependencies:** Existing multi-step creation modals, keyboard/mouse navigation handlers

## Objective
Ensure modal back-navigation and text editing events are fully consumed so they never trigger dashboard/app-level page navigation.

## Scope
- Consume mouse back-button events used for modal step-back actions
- Consume Backspace in GitHub search inputs while typing

## Tasks

### A. Mouse Back-Button Containment
- [ ] Add modal-level handling for mouse back-button events used for in-flow step-back.
- [ ] Stop propagation/default navigation when back-button is handled by modal flow.
- [ ] Preserve normal back-step behavior inside multi-step modal navigation.

### B. Backspace Containment in Search Inputs
- [ ] Ensure GitHub search text inputs consume Backspace for text editing.
- [ ] Stop propagation/default navigation for Backspace in focused search inputs.
- [ ] Verify behavior in issue-creation link step and other GitHub-search modal surfaces.

## Validation
- [ ] Verify mouse back-button moves step 2 → step 1 without triggering dashboard/Obsidian navigation.
- [ ] Verify Backspace edits text in GitHub search fields without parent-level back navigation.
- [ ] Verify no regressions in Escape/Enter/Arrow modal keyboard behavior.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build`

## Completion Criteria
- [ ] Modal-handled navigation gestures never leak to dashboard/app navigation.
- [ ] Search-input Backspace behavior is text-edit-only while focused.

---
Progress: 0/14 tasks complete
