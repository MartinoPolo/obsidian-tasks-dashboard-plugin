# Phase 25: Issue Card Layout and Tooltip Polish - Checklist

**Status:** In Progress
**Dependencies:** Phase 14 (layout/overflow), Phase 19 (action visibility behavior), current tooltip utilities

## Objective
Improve issue-card action discoverability on narrow widths, tighten header layout behavior, and resolve tooltip/overflow styling details.

## Scope
- Disable hover-only hidden-header reveal on narrow widths
- Reduce minimum title width in issue header
- Remove duplicate native/system tooltips and keep custom tooltip only
- Fix layout-settings dropdown clipping with viewport overflow scrolling
- Apply destructive/warning text styles in overflow menu

## Tasks

### A. Header Action Discoverability + Title Width
- [x] Disable hover-only reveal behavior on narrow-width layouts.
- [x] Route hidden header actions to 3-dots overflow on narrow widths.
- [x] Reduce issue-header minimum title width so actions can claim space earlier.

### B. Tooltip Consistency
- [x] Remove duplicate native/system tooltips from issue-card action buttons.
- [x] Keep custom tooltip behavior as the single tooltip source.

### C. Layout Dropdown + Action Colors
- [x] Allow layout-settings dropdown menus to overflow viewport with scrollbars instead of clipping.
- [x] Style `Delete issue` action text as red in issue-card 3-dots dropdown.
- [x] Style `Archive` action text as orange in issue-card 3-dots dropdown.

## Validation
- [ ] Verify narrow-width cards expose hidden actions only through overflow (no hover-only reveal dependency). _(Blocked: browser verification skipped per request.)_
- [ ] Verify reduced title minimum width improves visible-action priority before overflow. _(Blocked: browser verification skipped per request.)_
- [ ] Verify action buttons show only custom tooltips (no native duplicates). _(Blocked: browser verification skipped per request.)_
- [ ] Verify layout dropdowns remain usable at viewport edges via overflow scrolling. _(Blocked: browser verification skipped per request.)_
- [ ] Verify `Delete issue` and `Archive` text colors in overflow are applied correctly. _(Blocked: browser verification skipped per request.)_
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm build`

## Completion Criteria
- [ ] Narrow-width behavior is discoverable and consistent. _(Blocked: requires in-app/browser verification.)_
- [ ] Tooltip system is singular and non-duplicative. _(Blocked: requires in-app/browser verification.)_
- [ ] Overflow and dropdown styling matches required semantics. _(Blocked: requires in-app/browser verification.)_

---
Progress: 11/19 tasks complete
