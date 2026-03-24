# Phase 6: Issue Info Panel Restructure

**Status:** Not Started
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

- [ ] Remove Dashboard ID and Issue ID from info panel content
      In `IssueHeader.svelte`, the `infoContent` derived value currently starts with `Dashboard: ${dashboard.id}\nIssue: ${params.issue}`. Remove these two lines entirely. They are internal identifiers that provide no user value in the info panel.

- [ ] Restructure info panel with section hierarchy
      Replace the current flat text layout with visually distinct sections. Target hierarchy:
      ```
      ## Issue
      Name, Priority

      ## GitHub
      Issue link(s), PR link(s)

      ## Branch
      Base branch, Local branch, Remote branch, Status

      ## Worktree
      Folder path, State
      ```
      Build the content string in `IssueHeader.svelte` `infoContent` using this structure. Each section header should be a bold/emphasized line. List each branch (base, local, remote) exactly once in the Branch section -- do not duplicate across sections. The current `worktreeSummary` includes `branch`, `origin`, `expected folder`, `setup state`, `base repository`, `base branch` -- redistribute these across the new sections (e.g., `base branch` goes to Branch section, `expected folder` goes to Worktree section).

### Rendering

- [ ] Add visual styling for section headers in the info panel
      Currently `IssueInfoPanel.svelte` renders `content` as plain text with `white-space: pre-line`. Either: (a) switch to structured HTML rendering with `{@html}` and proper sanitization, or (b) use a simple convention (e.g., lines starting with `##` get bold styling via CSS). Option (b) is simpler and safer. Add CSS for section headers: larger font-weight, subtle bottom border or spacing, to make sections visually scannable.

### Completion Criteria

- [ ] Dashboard ID and Issue ID no longer appear in the info panel
- [ ] Info panel shows 4 distinct sections: Issue, GitHub, Branch, Worktree
- [ ] Section headers are visually distinguishable from content
- [ ] Branch information appears exactly once (in Branch section), not duplicated
- [ ] Non-worktree issues show "Not a worktree issue" in Worktree section

---

Progress: 0/3 tasks complete

## Decisions

[Decisions made during execution, with reasoning]

## Blockers

None
