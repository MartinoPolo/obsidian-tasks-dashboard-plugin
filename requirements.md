# Tasks Dashboard Plugin - Requirements Checklist
## Core Features
- [x] Control an obsidian note as user's tasks dashboard
- [x] Select a note (choose path from settings)
- [x] Dashboard has Active Issues, Notes, and Archive sections (H1 headers)
- [x] Pressing Ctrl+Shift+E creates a new high-level issue
- [x] New issue creates a note in `{dashboard-path}/issues/active/`
## Issue Creation Flow (Keyboard-Driven)
- [x] All prompts appear at top of screen (same position as Quick Switcher)
- [x] Step 1: Prompt for name (text input, Enter to confirm, Confirm/Cancel buttons with key hints)
- [x] Step 2: Prompt for priority (list with ↑↓ navigation, Medium properly preselected, sorted: low/medium/high/top)
- [x] Step 3: Prompt for GitHub link (optional, Enter to create issue)
- [x] After creation: Open issue file with cursor at end (ready to type tasks)
## Active Issue File Behavior
- [x] Auto-position cursor at end of file when opening any active issue file
- [x] Enables quick task addition without manual navigation
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
- [x] `# Active Issues` as H1 header
- [x] `# Notes` section between Active Issues and Archive
- [x] `# Archive` as H1 header
- [x] `# How to Use This Dashboard` as H1 header
## Interactive Controls (Dashboard Buttons)
- [x] Add Issue button (opens issue creation flow)
- [x] Sort by Priority button
- [x] Refresh Progress button
- [x] Archive button (trash icon) per issue
- [x] Move up/down buttons (arrow icons) per issue
- [x] Progress indicator with priority-colored progress bar
- [x] Priority indicated by colored left border (low=green, medium=yellow, high=red, top=purple)
- [x] Square buttons with SVG icons and high-contrast hover
## Settings
- [x] Set multiple separate dashboards
- [x] Edit root path for each dashboard
- [x] Create Dashboard button to create dashboard.md + folders after configuring
- [x] Progress display mode setting (number/percentage/bar/number-percentage/all)
- [x] Hotkeys configurable via Obsidian's native Hotkeys settings
## Progress Tracking
- [x] Automatic cache invalidation on file modify (5s cache)
- [x] Manual refresh button for when auto-refresh doesn't trigger
## Archive Functionality
- [x] Archiving sets issue status to archived
- [x] Archiving moves note to `issues/archive/`
- [x] Archiving moves issue entry to Archive section
## Code Quality
- [x] Minimal whitespace
- [x] TypeScript with proper types
- [x] Modular architecture with separate services
## Documentation
- [x] requirements.md with checklist
- [x] README.md with installation and usage instructions
