# Phase 7: Dashboard Toolbar Reorder + Grouping

**Status:** Complete
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

- [x] Reorder toolbar buttons into 6 visual groups
      In `SortControls.svelte`, reorder the `ActionButton` elements to match:
      - Group 1 (Create): Add Issue, Add Worktree Issue, Import Note
      - Group 2 (View): Collapse All, Expand All, Sort
      - Group 3 (External): Open Folder, Open Terminal, Open VS Code, GitHub
      - Group 4 (Sync): Sync All (Prune added in Phase 08)
      - Group 5 (Maintain): Refresh, Rebuild
      - Group 6 (Config): Settings (always rightmost)

- [x] Add visual gaps between toolbar groups
      Parent `.tdc-sort-container` uses `gap: 16px` between groups. Each `.tdc-toolbar-group` div uses `display: flex; align-items: center; gap: 8px`.

### Responsive Behavior

- [x] Hide Import Note and Rebuild first when space is limited
      ResizeObserver on toolbar container toggles `isToolbarCompact` state when width < 500px. Import Note and Rebuild conditionally rendered via `{#if !isToolbarCompact}`. Toolbar uses `flex-wrap: wrap` for multi-line wrapping. Settings pinned rightmost via `margin-left: auto` + `order: 999`.

### Completion Criteria

- [x] Toolbar buttons appear in the specified 6-group order
- [x] Visual gaps separate each group
- [x] Import Note and Rebuild hide first when space is limited
- [x] Toolbar wraps to multiple lines (no overflow menu)
- [x] Settings button is always visible and rightmost

---

Progress: 3/3 tasks complete

## Decisions

- Used ResizeObserver (with synchronous initial measurement) instead of CSS-only approach — provides reliable detection regardless of container context.
- Group 3 (External) conditionally rendered via `hasExternalButtons` derived to avoid empty group gap.
- Settings group uses both `margin-left: auto` and `order: 999` for robust rightmost positioning across flex-wrap lines.

## Blockers

None
