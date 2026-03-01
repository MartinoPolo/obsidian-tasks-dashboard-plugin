# Phase 17: Optional Overflow UX Improvements - Checklist

**Status:** Planned (Optional / Non-blocking)
**Dependencies:** Phase 14 (dashboard action layout and overflow behavior)

## Objective
Deliver optional quality-of-life improvements for overflow action usability and dashboard action layout configuration feedback.

## Scope
- Icon-only overflow action tooltips
- Dashboard-scope one-click layout reset
- Lightweight toast confirmation on layout save

## Tasks

### A. Overflow Tooltips (Optional)
- [ ] Add optional tooltip hints for icon-only overflow actions.
- [ ] Ensure tooltip rendering is unobtrusive and does not alter action execution behavior.

### B. Layout Reset (Optional)
- [ ] Add optional one-click reset to default action layout at dashboard scope.
- [ ] Reapply the documented default row layout immediately after reset.

### C. Save Confirmation Toast (Optional)
- [ ] Add optional lightweight confirmation toast after saving action layout settings.
- [ ] Ensure toast is non-blocking and does not interrupt keyboard/mouse flow.

## Validation
- [ ] `pnpm build`

## Completion Criteria
- [ ] Optional tooltip hints are available for icon-only overflow actions.
- [ ] Dashboard-scope one-click reset reliably restores default action layout.
- [ ] Save action can show lightweight confirmation toast without regressions in layout persistence.

---
Progress: 0/10 tasks complete
