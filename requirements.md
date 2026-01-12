# Tasks Dashboard Plugin - Requirements Checklist

## Core Features

- [x] Control an obsidian note as user's tasks dashboard
- [x] Select a note which becomes the dashboard (choose path and name from settings)
- [x] Dashboard has Active Issues, Notes, and Archive sections (H1 headers)
- [x] Pressing (user defined keyboard shortcut)
  - prompts user for issue name, priority, and optional GitHub link
  - creates a new issue note (file) in `{dashboard-path}/Issues/Active/`
  - adds an entry to the Active Issues section in the dashboard note

## Issue Creation Flow (Keyboard-Driven)

- [x] All prompts appear at top of screen (same position as Quick Switcher)
- [x] Step 1: Prompt for name (text input, Enter to confirm, Confirm/Cancel buttons with key hints)
- [x] Step 2: Prompt for priority (list with ↑↓ navigation, Medium properly preselected, sorted: low/medium/high/top)
- [x] Step 3: Prompt for GitHub link (optional, Enter to confirm issue creation)
- [x] After creation: Open issue file with cursor at end (ready to type tasks)

## Active Issue File Behavior

- [x] Auto-position cursor at end of file when opening any active issue file

## Issue Note Format

- [x] YAML frontmatter with: created datetime, status (active/archived), priority
- [x] Back link to dashboard (`← Back to [dashboard]`)
- [x] Header with issue name
- [x] GitHub link (if provided) as clickable link
- [x] Blank task `- [ ] ` at end (no placeholder text)

## Dashboard Entry Format

- [x] Issue name displayed as large header with priority-colored left border
- [x] Controls (progress + buttons) appear below issue header
- [x] Tasks query block below controls (limit 10, sorted by priority, short mode)
- [x] Separator `---` between issues
- [x] Section markers use `%%` Obsidian comments (hidden in Live Preview via CSS)

## Dashboard Structure

- [x] `# Active Issues`
- [x] `# Notes` section between Active Issues and Archive for manual notes
- [x] `# Archive`
- [x] `# How to Use This Dashboard`

## Interactive Controls (Dashboard Buttons)

### Dashboard Buttons

- [x] Add Issue button (opens issue creation flow)
- [x] Sort by Priority button
- [x] Refresh Progress button

### Per-Issue Controls

- [x] Square buttons with consistent SVG icons and high-contrast hover
- [x] Archive button (trash icon)
- [x] Move up/down buttons (arrow icons)
- [x] Progress indicator with priority-colored progress bar
- [x] Priority indicated by colored left border (low=green, medium=yellow, high=red, top=purple)

## Settings

- [x] Set multiple separate dashboards
- [x] Edit root path for each dashboard
- [x] Create Dashboard button to create dashboard.md + folders after configuring
- [x] Progress display mode setting (number/percentage/bar/number-percentage/all)
- [x] Hotkeys configurable via Obsidian's native Hotkeys settings

## Archive Functionality

- [x] Archiving sets issue status to archived
- [x] Archiving moves note to `Issues/Archive/`
- [x] Archiving moves issue entry to Archive section

## Progress Tracking

- [x] Automatic cache invalidation on file modify (5s cache)
- [x] Auto-refresh dashboard progress when issue files are modified (debounced 500ms)
- [x] Manual refresh button to force progress recalculation and view re-render
- [x] Progress updates automatically when tasks are checked in issue files

## Code Quality

- [x] Minimal whitespace
- [x] TypeScript with proper types
- [x] Modular architecture with separate services

## Documentation

- [x] requirements.md with checklist
- [x] README.md with installation and usage instructions
- [ ] ideas.md with future tasks and improvements
