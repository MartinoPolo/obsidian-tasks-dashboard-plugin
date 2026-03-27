# Phase 6: Issue Info Panel Restructure

**Status:** Complete
**Dependencies:** None

## Objective

Restructure the issue info panel into a well-organized section hierarchy with visually distinct headers, and remove internal IDs from the display.

## Scope

- Remove Dashboard ID and Issue ID from info panel content
- Restructure into 4 sections: Issue, GitHub, Branch, Worktree
- Visually distinct section headers
- No duplicate branch listing across sections

## Out of Scope

- Info panel positioning/sizing changes
- Adding new data fields
- Interactive elements in the panel

---

## Tasks

### Content Structure

- [x] Remove Dashboard ID and Issue ID from info panel content
- [x] Restructure info panel with section hierarchy

### Rendering

- [x] Add visual styling for section headers in the info panel

### Completion Criteria

- [x] Dashboard ID and Issue ID no longer appear in the info panel
- [x] Info panel shows 4 distinct sections: Issue, GitHub, Branch, Worktree
- [x] Section headers are visually distinguishable from content
- [x] Branch information appears exactly once (in Branch section), not duplicated
- [x] Non-worktree issues show "Not a worktree issue" in Worktree section

---

Progress: 3/3 tasks complete

## Decisions

- Used `## ` prefix convention for section headers (option b from checklist) — simpler and safer than `{@html}`, shared via `INFO_SECTION_HEADER_PREFIX` constant
- Removed "Assigned folder" from Issue section (spec says Name, Priority only)
- Removed "Repository" from Worktree section (spec says Folder path, State only)
- Remote branch shown as `origin/<branch>` instead of origin folder path

## Blockers

None
