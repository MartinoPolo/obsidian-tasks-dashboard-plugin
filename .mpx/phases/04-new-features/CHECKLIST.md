# Phase 4: New Features - Checklist

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

## Link Project Folder (Req 7)
- [ ] Add `projectFolder` setting per dashboard in types and settings UI
- [ ] Add "Open project folder" button to dashboard header
- [ ] Implement folder open in system file explorer (platform-aware)
- [ ] Button shows linked state (different color/icon when folder set)
- [ ] Clicking unlinked button opens prompt to select folder path
- [ ] Add "Open terminal" button (PowerShell on Windows, bash on Mac/Linux)

## Add Existing Notes as Issues (Req 8)
- [ ] Add "Add existing issue" button to dashboard controls
- [ ] Create vault note suggest modal (SuggestModal with file autocomplete)
- [ ] Convert selected note: add frontmatter (priority, status, created)
- [ ] Add converted note entry to dashboard's Active Issues section
- [ ] Preserve original note content, add back link to dashboard

## Completion Criteria
- [ ] Project folder opens correctly on Windows
- [ ] Note import preserves existing content
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes

---
Progress: 10/18 tasks complete
