# Phase 4: New Features - Specification

**Status:** Not Started
**Dependencies:** Phase 2

## Objective
Add major new capabilities: project folder linking and importing existing vault notes as dashboard issues.

## Scope
- Link on-disk project folder to dashboard with open/terminal buttons (Req 7)
- Import existing Obsidian notes as dashboard issues with autocomplete (Req 8)

## Out of Scope
- GitHub enhancements (Phase 3)
- Color customization (Phase 5)

## Deliverables
- Per-dashboard project folder path setting
- "Open project folder" button in dashboard header (system explorer)
- "Open terminal" button (bash/PowerShell in project folder)
- Button states for linked/unlinked folders
- "Add existing issue" button on dashboard
- Vault note autocomplete/suggest modal
- Note conversion to dashboard issue format

## Notes
- Folder opening: use `require('child_process').exec` or Obsidian's shell API
- Terminal: platform-aware (PowerShell on Windows, bash/zsh on Mac/Linux)
- Note import: add frontmatter, register in dashboard, preserve original content
- Autocomplete: use Obsidian's SuggestModal with vault file list
