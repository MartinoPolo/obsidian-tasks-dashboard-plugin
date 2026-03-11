# Phase 14: Dashboard Action Layout & Access - Checklist

**Status:** Complete
**Dependencies:** Phase 7 (issue UX), Phase 8 (project folder actions), Phase 12 (header/sort control refactor), Phase 13 (hardening baseline)

## Objective
Standardize dashboard and per-issue action access so all actions remain discoverable in collapsed state, configurable by row at dashboard scope, and consistent with documented behavior, including header-first text priority and hover reveal behavior.

## Decisions / Conflicts Notes
- 3-dots menu is always visible on every issue card, including collapsed cards.
- Overflow menu contains actions hidden from both visible action rows (never duplicates currently visible actions).
- Action layout settings are dashboard-wide (single configuration per dashboard, not per issue).
- Default action layout: row1 = folder, terminal, vscode, github, move-up, move-down; row2 = all remaining actions.
- Right-click on move-up/down keeps current behavior and adds move-to-top/move-to-bottom options in context menu.
- Header truncation priority applies to row1 only: non-3-dots header actions hide before header title text truncates in normal state.
- On issue-header hover, row1 actions are fully revealed, title is allowed to truncate, and title render width must remain at least 200px.
- If width is still insufficient in hover state, horizontal overflow is allowed to preserve 3-dots visibility and 200px title minimum.

## Tasks

### A. Dashboard-Level Access
- [x] Add a global in-dashboard rebuild button in header actions.
- [x] Ensure rebuild button triggers existing rebuild flow without changing rebuild semantics.
- [x] Ensure rebuild button visibility remains independent from per-issue action visibility rules.

### B. Per-Issue Collapsed Access
- [x] Render an always-visible 3-dots overflow trigger on each issue (expanded and collapsed states).
- [x] Remove visual spacing between collapsed active issues while preserving spacing for expanded issues.
- [x] Ensure overflow trigger remains keyboard-focusable and clickable in collapsed state.

### C. Header Row Width Priority Rules
- [x] Apply truncation priority only to header row actions (row1), excluding row2 controls from this width algorithm.
- [x] In non-hover state, hide row1 actions except 3-dots as needed before truncating header title text.
- [x] Keep 3-dots visible at all times in both expanded and collapsed cards regardless of width.

### D. Overflow Menu Content Rules
- [x] Build overflow menu population from actions hidden in row1 and row2 combined.
- [x] Exclude actions currently visible in either row from overflow menu.
- [x] Preserve existing action execution handlers when invoked from overflow menu.

### E. Header Hover Reveal Rules
- [x] On issue-header hover, reveal all actions that belong to row1 in the header area.
- [x] In hover-reveal state, apply title truncation with a minimum width of 200px.
- [x] If required width still exceeds available space in hover-reveal state, allow horizontal overflow instead of hiding 3-dots.

### F. Dropdown Settings View
- [x] Add an overflow settings view within dropdown with three sections: row1, row2, save.
- [x] For each action, add show/hide control in its current row section.
- [x] For each action, add move-row controls to move between row1 and row2 where applicable.
- [x] Persist saved layout settings at dashboard scope and re-render all issues.
- [x] Apply saved layout settings consistently to both expanded and collapsed issue rendering.

### G. Move Action Context Menu
- [x] Add right-click context menu on move-up action with move-to-top option.
- [x] Add right-click context menu on move-down action with move-to-bottom option.
- [x] Ensure right-click options call existing move-to-top/move-to-bottom logic paths.

### H. Documentation Updates
- [x] Update How to Use section text to reflect action rows, overflow behavior, and dashboard-wide settings.
- [x] Update How to Use content to note the section is removable and align archive icon wording.
- [x] Mention delete/rename/recolor/folder-link actions and clarify terminal/vscode actions depend on folder assignment.

## Completion Criteria
- [x] Default layouts match: row1 = folder/terminal/vscode/github/move-up/move-down; row2 = all others.
- [x] Collapsed issue cards show 3-dots access with no extra inter-card spacing.
- [x] Overflow menu correctly surfaces only hidden actions from both rows.
- [x] Non-hover header state preserves title priority by hiding non-3-dots row1 actions before title truncation.
- [x] Hover header state reveals all row1 actions while preserving title min-width at 200px and allowing overflow if needed.
- [x] `pnpm build` passes and manual dashboard interaction checks succeed.

---
Progress: 31/31 tasks complete
