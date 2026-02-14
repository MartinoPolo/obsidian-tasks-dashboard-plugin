# Phase 1: Bug Fixes - Checklist

**Status:** Complete
**Dependencies:** None

## Objective
Fix critical bugs: progress refresh, backlinks with spaces, command registration, create files button, task query tree display.

## Decisions
- Auto-refresh via `vault.on('modify')` chosen over manual refresh button
- `encodeURI()` used for backlink paths (standard markdown links, not wiki-links)
- Hardcoded hotkey removed entirely; users configure via Obsidian Settings > Hotkeys
- Create Files button already idempotent, no code change needed

## Progress Refresh (Req 1)
- [x] Investigate why progress doesn't update when tasks toggled from dashboard
- [x] Fix progress recalculation on vault modify events for dashboard file
- [x] Verify refresh button works or remove if auto-refresh is reliable

## Backlink with Spaces (Req 2)
- [x] Fix backlink generation in IssueManager to handle spaces in dashboard names
- [x] Test with various dashboard names (spaces, special chars)

## Command Registration (Req 5)
- [x] Remove any hardcoded Ctrl+Shift+E shortcut
- [x] Ensure per-dashboard commands register correctly via Obsidian's command API
- [x] Verify commands appear in Obsidian Hotkeys settings for remapping

## Create Files Button (Req 11)
- [x] Add existence check before creating dashboard files
- [x] Button does nothing silently if files already exist

## Show Tree in Queries (Req 12)
- [x] Add `show tree` to task query generation in DashboardWriter
- [x] Verify subtasks display hierarchically in dashboard

## Completion Criteria
- [x] All bugs verified fixed
- [x] `pnpm build` passes
- [x] `pnpm lint` passes (4 pre-existing errors in settings.ts/GitHubSearchModal.ts, none from phase-1 changes)

---
Progress: 11/11 tasks complete
