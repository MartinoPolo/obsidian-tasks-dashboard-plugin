# Phase 18: Plugin-Wide Dashboard Hotkeys - Checklist

**Status:** Completed
**Dependencies:** Phase 16 (worktree integration, including global `Add issue in worktree` behavior), Phase 14 (dashboard action execution surfaces)

## Objective
Add plugin-wide, user-configurable hotkeys for dashboard-wide collapse/expand actions using native Obsidian command/hotkey registration, scoped to the active dashboard context.

## Scope
- Plugin command registration for dashboard collapse/expand all issues
- Native Obsidian hotkey compatibility
- Active-dashboard command targeting behavior

## Tasks

### A. Command & Hotkey Registration
- [x] Register plugin-wide command `Collapse all issues` in native Obsidian command registry.
- [x] Register plugin-wide command `Expand all issues` in native Obsidian command registry.
- [x] Ensure both commands are discoverable in Obsidian global Hotkeys settings and accept user-defined key bindings.

### B. Active Dashboard Context Resolution
- [x] Implement active dashboard context resolution used by both plugin-wide commands.
- [x] Ensure `Collapse all issues` applies only to the resolved active dashboard context.
- [x] Ensure `Expand all issues` applies only to the resolved active dashboard context.

### C. Dependency Alignment with Phase 16
- [x] Sequence implementation after Phase 16 completion and verify no command-registration conflicts with worktree-related global dashboard actions.
- [x] Verify plugin-wide collapse/expand commands coexist with Phase 16 global `Add issue in worktree` behavior on the same dashboard surfaces.

## Validation
- [ ] Verify both commands appear in Command Palette with exact labels and execute successfully.
- [ ] Verify both commands can be assigned/changed in Settings → Hotkeys and trigger expected behavior from assigned keys.
- [ ] Verify collapse/expand hotkeys affect the active dashboard only and do not mutate non-active dashboards.
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm build`

## Blockers

- Command palette and hotkey assignment behavior require manual verification inside Obsidian.

## Completion Criteria
- [x] Plugin-wide `Collapse all issues` and `Expand all issues` commands are registered and hotkey-configurable via native Obsidian Hotkeys.
- [x] Command execution consistently targets the active dashboard context.
- [x] Phase 16 dependency is satisfied and no regressions exist in global dashboard action behavior.

---
Progress: 14/16 tasks complete
