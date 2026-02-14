# Phase 8: Project Folder - Checklist

**Status:** Complete
**Dependencies:** Phase 2

## Objective
Link on-disk project folders to dashboard (global) and individual issues (per-issue) with explorer and terminal buttons.

## Link Project Folder (Req 7)
- [x] Add `projectFolder` setting per dashboard in types and settings UI
- [x] Add `issueFolders` setting for per-issue independent folder storage (keyed by `dashboardId:issueId`)
- [x] Add "Open project folder" button to dashboard header (global)
- [x] Add folder/terminal buttons to per-issue controls (per-issue)
- [x] Implement folder open in system file explorer (platform-aware)
- [x] Left-click: opens explorer if folder set, opens FolderPathModal if not
- [x] Right-click: opens FolderPathModal to reassign/clear (when folder set)
- [x] Folder button shows faded state when no folder assigned
- [x] Terminal button hidden (not rendered) when no folder assigned
- [x] Add "Open terminal" button (PowerShell on Windows, bash on Mac/Linux)
- [x] Per-issue folder assignment is independent from global and other issues

## Completion Criteria
- [x] Project folder opens correctly on Windows
- [x] `pnpm build` passes

---
Progress: 13/13 tasks complete
