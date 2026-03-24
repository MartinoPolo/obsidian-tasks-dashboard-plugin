# Phase 7: Dashboard Toolbar Reorder + Grouping

**Status:** Not Started
**Dependencies:** None

## Objective

Reorder dashboard toolbar buttons into logical visual groups with gaps between them, and handle responsive behavior for space-constrained views.

## Scope

- 6 visual button groups with fixed default order
- Visual gaps between groups
- Responsive hiding of rarely-used buttons (Import Note, Rebuild)
- Multi-line wrapping (not overflow menu)
- Settings button always rightmost

## Out of Scope

- Adding new toolbar buttons (Sync All and Prune go in Phase 03 and 08)
- User-configurable button order
- Three-dots overflow menu

---

## Tasks

### Layout

- [ ] Reorder toolbar buttons into 6 visual groups
      In `SortControls.svelte`, reorder the `ActionButton` elements to match:
      - Group 1 (Create): Add Issue, Add Worktree Issue, Import Note
      - Group 2 (View): Collapse All, Expand All, Sort
      - Group 3 (External): Open Folder, Open Terminal, Open VS Code, GitHub
      - Group 4 (Sync): _(empty for now; Sync All + Prune added in Phases 03/08)_
      - Group 5 (Maintain): Refresh, Rebuild
      - Group 6 (Config): Settings (always rightmost)
      Currently the order in `SortControls.svelte` is: Add Issue, Add Worktree Issue, Import Note, Sort, Collapse All, Expand All, Refresh, Rebuild, Settings, Open Folder, Open Terminal, Open VS Code, GitHub. Reorder and wrap each group in a container `<div>` with a shared class for gap styling.

- [ ] Add visual gaps between toolbar groups
      Apply CSS `gap` or `margin` between group containers. Use a larger gap between groups (e.g., 16px) than within groups (existing 8px). Each group `<div>` should have `display: flex; align-items: center; gap: 8px;`. The parent `.tdc-sort-container` should use `gap: 16px;` between groups.

### Responsive Behavior

- [ ] Hide Import Note and Rebuild first when space is limited
      These are rarely used. When the toolbar wraps to multiple lines, hide Import Note and Rebuild before other buttons. Use CSS `order` and/or flex `flex-shrink` to control which buttons disappear first. Alternatively, use a resize observer on the toolbar container to toggle visibility classes. Use multi-line wrapping (`flex-wrap: wrap`) instead of a three-dots overflow menu. Settings must always remain visible and rightmost -- use `margin-left: auto` or `order: 999` to pin it.

### Completion Criteria

- [ ] Toolbar buttons appear in the specified 6-group order
- [ ] Visual gaps separate each group
- [ ] Import Note and Rebuild hide first when space is limited
- [ ] Toolbar wraps to multiple lines (no overflow menu)
- [ ] Settings button is always visible and rightmost

---

Progress: 0/3 tasks complete

## Decisions

[Decisions made during execution, with reasoning]

## Blockers

None
