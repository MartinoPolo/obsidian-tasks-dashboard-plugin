# Phase 2: Core UX Improvements - Specification

**Status:** Not Started
**Dependencies:** Phase 1

## Objective
Improve daily workflow with collapsible issues, smart cursor positioning, separate archive/delete actions, and date-based sorting.

## Scope
- Collapsible issues in dashboard with persisted state (Req 3)
- Smart cursor positioning at ## Tasks section (Req 4)
- Separate archive and delete actions with distinct icons (Req 9)
- Sort by created/last edited date (Req 10)

## Out of Scope
- GitHub enhancements
- New major features (project folder, note import)

## Deliverables
- Collapse/expand per-issue and global toggle
- Cursor at ## Tasks section end on file open
- Archive icon (box/folder), Delete icon (trash) with confirmation
- Sort dropdown with priority/created/edited options

## Notes
- Collapsed state storage: use plugin settings (data.json) keyed by issue ID
- Archive icon candidates: box-arrow-down, folder-archive
- Delete should use Obsidian's trash system for recoverability
- Sort by date requires reading frontmatter `created` field and file mtime
