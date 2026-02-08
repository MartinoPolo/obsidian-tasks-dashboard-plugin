# Phase 5: Polish & Customization - Specification

**Status:** Not Started
**Dependencies:** Phase 3, Phase 4

## Objective
Final polish — customizable colors, dashboard deletion from settings, and ensuring rebuild covers all data.

## Scope
- Delete dashboard from settings with confirmation and optional data cleanup (Req 13)
- Customizable dashboard colors for priority borders and backgrounds (Req 14)

## Out of Scope
- Plugin renaming (research/decision, not implementation)
- OAuth (future consideration)

## Deliverables
- Delete dashboard button in settings with confirmation dialog
- Option to remove associated files when deleting dashboard
- Color picker or preset system for priority colors
- Background color customization for dashboard sections
- Immediate re-render on color changes

## Notes
- Dashboard deletion must clean up registered commands
- Color storage: CSS custom properties per dashboard or global settings
- Consider using Obsidian's built-in color picker if available
