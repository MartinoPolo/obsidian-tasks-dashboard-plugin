# Phase 25: Issue Card Layout and Tooltip Polish - Checklist

**Status:** Planned
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
- [ ] Disable hover-only reveal behavior on narrow-width layouts.
- [ ] Route hidden header actions to 3-dots overflow on narrow widths.
- [ ] Reduce issue-header minimum title width so actions can claim space earlier.

### B. Tooltip Consistency
- [ ] Remove duplicate native/system tooltips from issue-card action buttons.
- [ ] Keep custom tooltip behavior as the single tooltip source.

### C. Layout Dropdown + Action Colors
- [ ] Allow layout-settings dropdown menus to overflow viewport with scrollbars instead of clipping.
- [ ] Style `Delete issue` action text as red in issue-card 3-dots dropdown.
- [ ] Style `Archive` action text as orange in issue-card 3-dots dropdown.

## Validation
- [ ] Verify narrow-width cards expose hidden actions only through overflow (no hover-only reveal dependency).
- [ ] Verify reduced title minimum width improves visible-action priority before overflow.
- [ ] Verify action buttons show only custom tooltips (no native duplicates).
- [ ] Verify layout dropdowns remain usable at viewport edges via overflow scrolling.
- [ ] Verify `Delete issue` and `Archive` text colors in overflow are applied correctly.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build`

## Completion Criteria
- [ ] Narrow-width behavior is discoverable and consistent.
- [ ] Tooltip system is singular and non-duplicative.
- [ ] Overflow and dropdown styling matches required semantics.

---
Progress: 0/19 tasks complete
