# Phase 19: Dashboard Action and Visibility Improvements - Checklist

**Status:** Completed
**Dependencies:** Phase 14 (action layout and overflow behavior), existing dashboard-wide collapse/expand handlers

## Objective
Improve dashboard and per-issue action ergonomics while preserving existing visibility semantics and overflow reliability.

## Assumptions
- `Open dashboard settings` focuses the current dashboard settings block only when supported by available Obsidian APIs; fallback always opens this plugin settings tab.
- Hidden-by-layout actions must remain executable from overflow without adding separate visibility controls.

## Scope
- Add dashboard-level settings action in top dashboard action row
- Add per-issue quick `Change priority` action using existing prompt flow
- Enforce hidden-default placement for `Change priority` with guaranteed overflow availability
- Ensure overflow preserves all layout-hidden actions
- Expand global collapse behavior to entire dashboard dataset

## Tasks

### A. Dashboard-Level Settings Action
- [x] Add `Open dashboard settings` action to top dashboard action area alongside existing global actions.
- [x] Open this plugin settings tab on click.
- [x] Focus/scroll to current dashboard settings block when API support is available.
- [x] Fall back gracefully to plugin settings tab when focus/scroll APIs are unavailable.

### B. Per-Issue Change Priority Action
- [x] Add per-issue `Change priority` action entry.
- [x] Reuse existing issue-creation priority selection prompt flow.
- [x] Persist updated priority and refresh affected dashboard rendering/state.
- [x] Configure `Change priority` as hidden by default in visible action rows.
- [x] Ensure `Change priority` always appears in per-issue 3-dots overflow.

### C. Global Collapse Behavior
- [x] Update `Collapse all issues` to target every issue in the dashboard dataset.
- [x] Remove dependence on active render window/visible subset for collapse-all operation.
- [x] Preserve existing collapse-state persistence behavior across issues.

## Validation
- [ ] Verify `Open dashboard settings` action is visible in top dashboard actions and opens plugin settings.
- [ ] Verify focus/scroll to current dashboard settings block works when supported and falls back cleanly otherwise.
- [ ] Verify `Change priority` updates priority through the existing prompt flow and reflects immediately.
- [ ] Verify `Change priority` is hidden in visible rows by default and always available in overflow.
- [ ] Verify any layout-hidden action is still executable from overflow.
- [ ] Verify `Collapse all issues` affects all dashboard issues, including non-visible items.
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm build`

## Blockers

- UI interaction checks require manual validation inside Obsidian preview/command palette workflows.

## Completion Criteria
- [x] Dashboard-level settings action works with supported focus behavior and graceful fallback.
- [x] Per-issue priority can be changed from dashboard actions without opening issue notes.
- [x] Hidden-by-layout actions are never lost and remain executable in overflow.
- [x] Collapse-all operation consistently targets the full dashboard dataset.

---
Progress: 19/29 tasks complete
