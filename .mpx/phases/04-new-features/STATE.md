# Phase 4: New Features - State

Last Updated: 2026-02-08

## Status
In Progress

## Progress
10/18 tasks complete (56%)

## Decisions Made
- Move to top/bottom reuses `rebuildActiveSectionWithSortedBlocks` — no new rebuild logic
- Rename scopes replacements to issue block only — avoids collisions with other issues
- Header color uses native `<input type="color">` — no custom modal needed
- `issueColors` stored as `Record<string, string>` alongside `collapsedIssues`

## Blockers
None (Phase 2 completed)

---

## Session Handoff

### 2026-02-08
**Progress This Session:**
- Completed Move to Top/Bottom (Req 15) — 2 tasks
- Completed Rename Issue (Req 16) — 3 tasks
- Completed Per-Issue Header Color (Req 17) — 3 tasks
- Build passes clean

**Key Decisions:**
- `moveIssueToPosition()` extracts target block, rebuilds array, delegates to shared rebuild function
- `renameIssue()` finds issue block by markers, replaces within block only, then renames file and migrates state
- Color picker appends hidden `<input type="color">` to body, live preview on `input`, persists on `change`
- Colors and collapsed state both cleaned up on delete, migrated on rename

**Issues Encountered:**
- What went wrong: None
- What NOT to do: N/A
- What we tried: N/A
- How we handled it: N/A

**Next Steps:**
1. Link Project Folder (Req 7) — 6 tasks remaining
2. Add Existing Notes as Issues (Req 8) — 5 tasks remaining

**Critical Files:**
- `src/dashboard/DashboardWriter.ts` — `moveIssueToPosition()`
- `src/dashboard/DashboardRenderer.ts` — 4 new buttons, header color, color picker
- `src/issues/IssueManager.ts` — `renameIssue()`, issueColors cleanup
- `src/modals/IssueModal.ts` — `RenameIssueModal`
- `src/types.ts` — `issueColors` setting
- `src/settings.ts` — project folder setting (next)

**Working Memory:**
- Windows: `start ""` for explorer, PowerShell for terminal
- Mac: `open` for Finder, Terminal.app
- SuggestModal from Obsidian API for file autocomplete
- `issueColors` key = issueId, value = hex color string
