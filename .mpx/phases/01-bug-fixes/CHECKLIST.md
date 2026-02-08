# Phase 1: Bug Fixes - Checklist

## Progress Refresh (Req 1)
- [x] Investigate why progress doesn't update when tasks toggled from dashboard
- [ ] Fix progress recalculation on vault modify events for dashboard file
- [ ] Verify refresh button works or remove if auto-refresh is reliable

## Backlink with Spaces (Req 2)
- [ ] Fix backlink generation in IssueManager to handle spaces in dashboard names
- [ ] Test with various dashboard names (spaces, special chars)

## Command Registration (Req 5)
- [ ] Remove any hardcoded Ctrl+Shift+E shortcut
- [ ] Ensure per-dashboard commands register correctly via Obsidian's command API
- [ ] Verify commands appear in Obsidian Hotkeys settings for remapping

## Create Files Button (Req 11)
- [ ] Add existence check before creating dashboard files
- [ ] Button does nothing silently if files already exist

## Show Tree in Queries (Req 12)
- [ ] Add `show tree` to task query generation in DashboardWriter
- [ ] Verify subtasks display hierarchically in dashboard

## Completion Criteria
- [ ] All bugs verified fixed
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes

---
Progress: 0/8 tasks complete
