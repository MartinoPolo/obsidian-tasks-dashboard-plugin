# Phase 4: New Features - Checklist

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
Progress: 0/10 tasks complete
