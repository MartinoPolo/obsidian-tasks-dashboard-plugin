# Phase 7: Issue UX - Checklist

**Status:** Complete
**Dependencies:** Phase 2

## Objective
Quick issue management: move to top/bottom, rename with full state migration, per-issue header color.

## Decisions
- Move to top/bottom reuses `rebuildActiveSectionWithSortedBlocks`
- Rename scopes replacements to issue block only to avoid collisions
- Header color uses native `<input type="color">`, live preview on `input`, save on `change`
- `issueColors` stored as `Record<string, string>` alongside `collapsedIssues`

## Move to Top/Bottom (Req 15)
- [x] Add `moveIssueToPosition()` to DashboardWriter with early return if already at position
- [x] Add toTop/toBottom buttons and icons to DashboardRenderer

## Rename Issue (Req 16)
- [x] Add `renameIssue()` to IssueManager — updates dashboard markers, file path, H1, migrates state
- [x] Add `RenameIssueModal` with pre-filled input, validation, error handling
- [x] Add rename button and icon to DashboardRenderer

## Per-Issue Header Color (Req 17)
- [x] Add `issueColors: Record<string, string>` to settings type and defaults
- [x] Apply stored header color in renderHeader, add color picker button with native input
- [x] Migrate/clean up issueColors on rename and delete

## Completion Criteria
- [x] All features work correctly
- [x] `pnpm build` passes

---
Progress: 10/10 tasks complete
