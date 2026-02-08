# Phase 2: Core UX Improvements - Checklist

## Collapsible Issues (Req 3)
- [x] Add collapse/expand toggle button per issue in DashboardRenderer
- [x] Implement collapsed state persistence in plugin settings (keyed by issue ID)
- [x] Add global collapse/expand all button to dashboard controls
- [x] Style collapsed state (hide task query + progress, show only header)

## Smart Cursor Positioning (Req 4)
- [ ] Modify file-open handler to find `## Tasks` section end
- [ ] Position cursor at end of Tasks section instead of end of file
- [ ] Fall back to end of file if section not found

## Separate Archive and Delete (Req 9)
- [ ] Change archive icon from trash to archive/box icon
- [ ] Add delete button with trash icon per issue
- [ ] Add confirmation modal for delete action
- [ ] Implement delete: remove from dashboard + move file to Obsidian trash
- [ ] Add delete method to DashboardWriter and IssueManager

## Sort by Date (Req 10)
- [ ] Add sort-by-created-date option (newest/oldest first)
- [ ] Add sort-by-last-edited-date option (newest/oldest first)
- [ ] Read frontmatter `created` and file mtime for sorting
- [ ] Update sort UI (dropdown or multiple buttons)

## Completion Criteria
- [ ] All features work correctly
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes

---
Progress: 4/10 tasks complete
