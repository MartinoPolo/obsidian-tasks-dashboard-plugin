# Tasks Dashboard Plugin - Requirements Checklist
## Core Features
- [x] Control an obsidian note as user's tasks dashboard
- [x] Select a note (choose path from settings)
- [x] Dashboard has Active Issues and Archive sections (H1 headers)
- [x] Pressing Ctrl+Shift+E creates a new high-level issue
- [x] User prompted to fill: issue name, priority (low/medium/high/top), optional GitHub link
- [x] New issue creates a note in `{dashboard-path}/issues/active/`
## Issue Note Format
- [x] YAML frontmatter with: created datetime, status (active/archived), priority
- [x] Back link to dashboard (`← Back to [dashboard]`)
- [x] Header with issue name
- [x] GitHub link (if provided) as clickable link
## Dashboard Entry Format
- [x] Issue name displayed as large header with priority-colored left border
- [x] Controls (progress + buttons) appear below issue header
- [x] Tasks query block below controls (limit 10, sorted by priority, short mode)
- [x] Separator `---` between issues
- [x] Section markers use `%%` Obsidian comments (hidden in Live Preview)
## Interactive Controls
- [x] Archive button (trash icon) next to each issue
- [x] Move up button (arrow icon) next to each issue
- [x] Move down button (arrow icon) next to each issue
- [x] Progress indicator (x/y + percentage + colored progress bar)
- [x] Priority indicated by colored left border (low=green, medium=yellow, high=red, top=purple)
- [x] Sort by Priority button at top of Active Issues section
- [x] Square buttons with SVG icons and high-contrast hover
## Archive Functionality
- [x] Archiving sets issue status to archived
- [x] Archiving moves note to `issues/archive/`
- [x] Archiving moves issue entry to Archive section in dashboard
## Settings
- [x] Set multiple separate dashboards
- [x] Edit root path for each dashboard
- [x] Each dashboard has its own command for creating issues
- [x] Hotkeys configurable via Obsidian's native Hotkeys settings
## Dashboard Structure
- [x] `# Active Issues` as H1 header
- [x] `# Archive` as H1 header
- [x] Usage instructions at bottom of dashboard
## Code Quality
- [x] Minimal whitespace (no unnecessary empty lines)
- [x] TypeScript with proper types
- [x] Modular architecture with separate services
## Documentation
- [x] requirements.md with checklist
- [x] README.md with installation and usage instructions
