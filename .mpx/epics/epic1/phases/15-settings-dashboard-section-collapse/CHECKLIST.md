# Phase 15: Settings Dashboard Section Collapse - Checklist

**Status:** Complete
**Dependencies:** Phase 10 (dashboard settings lifecycle), Phase 12 (settings refactor baseline)

## Objective
Allow each dashboard block in plugin settings to collapse into a single-line summary row and expand on demand, without changing dashboard note behavior.

## Scope
- Settings UI only (dashboard configuration sections)
- Per-dashboard collapsed/expanded interaction in settings
- Single-line summary row for collapsed state

## Tasks

### A. Settings Collapse Behavior
- [x] Add per-dashboard collapse/expand control in settings list.
- [x] Ensure collapsed state renders one-line summary per dashboard.
- [x] Ensure expanded state restores full dashboard settings controls.

## Validation
- [x] `pnpm build`

## Completion Criteria
- [x] Each dashboard section in settings can be collapsed to one line and expanded individually.
- [x] Collapsed state persists and remains per-dashboard.
- [x] Existing dashboard configuration values remain unchanged by collapse/expand actions.
- [x] Dashboard note output and marker invariants remain unchanged.

---
Progress: 13/13 tasks complete
