# Phase 4: New Features - Specification

**Status:** In Progress
**Dependencies:** Phase 2

## Objective
Add major new capabilities: move-to-top/bottom, rename issue, per-issue header color, project folder linking, and importing existing vault notes as dashboard issues.

## Scope
- Move to top/bottom buttons for quick issue reordering (Req 15)
- Full issue rename with dashboard + file + state migration (Req 16)
- Per-issue header background color via native color picker (Req 17)
- Link on-disk project folder to dashboard with open/terminal buttons (Req 7)
- Import existing Obsidian notes as dashboard issues with autocomplete (Req 8)

## Out of Scope
- GitHub enhancements (Phase 3)
- Global color customization (Phase 5)

## Deliverables
- `moveIssueToPosition()` in DashboardWriter — reuses rebuildActiveSectionWithSortedBlocks
- toTop/toBottom buttons with SVG icons in DashboardRenderer
- `renameIssue()` in IssueManager — updates markers, file, H1, migrates collapsed + color state
- `RenameIssueModal` with pre-filled input and validation
- Rename button with pencil icon in DashboardRenderer
- `issueColors: Record<string, string>` in settings
- Header color applied in renderHeader, color picker button with palette icon
- Color migration on rename, cleanup on delete
- Per-dashboard project folder path setting
- "Open project folder" button in dashboard header (system explorer)
- "Open terminal" button (bash/PowerShell in project folder)
- Button states for linked/unlinked folders
- "Add existing issue" button on dashboard
- Vault note autocomplete/suggest modal
- Note conversion to dashboard issue format

## Notes
- Move to top/bottom: early return if already at position, no file write
- Rename: replacements scoped to issue block to avoid collisions
- Color picker: native `<input type="color">`, live preview on `input` event, save on `change`
- Folder opening: use `require('child_process').exec` or Obsidian's shell API
- Terminal: platform-aware (PowerShell on Windows, bash/zsh on Mac/Linux)
- Note import: add frontmatter, register in dashboard, preserve original content
- Autocomplete: use Obsidian's SuggestModal with vault file list
