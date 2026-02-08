# Phase 1: Bug Fixes - State

Last Updated: 2026-02-08

## Status
Completed

## Progress
11/11 tasks complete (100%)

## Decisions Made
- Auto-refresh via `vault.on('modify')` chosen over manual refresh button
- `encodeURI()` used for backlink paths (standard markdown links, not wiki-links)
- Hardcoded hotkey removed entirely; users configure via Obsidian Settings > Hotkeys
- Create Files button already idempotent, no code change needed

## Blockers
None

---

## Session Handoff

### 2026-02-08 - Phase Completed
**Progress This Session:**
- Fixed progress not refreshing when tasks toggled from dashboard
- Added `invalidateCache`/`invalidateAllCache` to ProgressTracker
- Added `vault.on('modify')` listener + `rerenderDashboardViews()` to main.ts
- Fixed backlinks with spaces via `encodeURI()`
- Removed hardcoded `Ctrl+Shift+E` hotkey
- Added `show tree` to both task query generation locations in DashboardWriter

**Key Decisions:**
- Used `vault.read()` instead of `cachedRead()` for fresh content after invalidation
- Re-render scoped to open dashboard views only (performance)

**Issues Encountered:**
- 4 pre-existing lint errors in settings.ts/GitHubSearchModal.ts (not from phase-1)

**Critical Files:**
- `src/issues/ProgressTracker.ts` — added cache invalidation methods
- `src/issues/IssueManager.ts` — encodeURI on backlink path
- `src/dashboard/DashboardWriter.ts` — added `show tree` in 2 locations
- `main.ts` — vault modify listener, removed hardcoded hotkey
