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

- [x] Smart cursor positioning at end of ## Tasks section (falls back to end of file)

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
- [x] Sort by date created/edited (newest/oldest)
- [x] Collapse/expand all issues button
- [x] Rebuild dashboard button (refreshes from files + GitHub cards)

### Per-Issue Controls

- [x] Square buttons with consistent SVG icons and high-contrast hover
- [x] Archive button (archive icon, separate from delete)
- [x] Delete button (trash icon) with confirmation dialog
- [x] Move up/down buttons (arrow icons)
- [x] Move to top/bottom buttons
- [x] Collapse/expand toggle per issue (state persisted)
- [x] Rename button with modal (migrates state: collapsed, colors, folders)
- [x] Per-issue color picker (native `<input type="color">`, persisted to `issueColors`)
- [x] GitHub quick-open button (opens linked URL, faded when no link — click prompts to add)
- [x] Folder/terminal/VS Code buttons (per-issue, independent from global)
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
- [x] Progress indicator displays done/total tasks for each issue

## GitHub Integration

- [x] Per-vault GitHub authentication using Personal Access Tokens
- [x] GitHub Display Mode setting (Minimal/Compact/Full) — switching updates existing cards
- [x] Per-dashboard GitHub repository linking via repository picker modal (settings only)
- [x] Per-dashboard no-GitHub mode toggle (skips GitHub link during creation)
- [x] GitHub search modal with recent issues, real-time search, scope selector (linked repo/my repos/all GitHub)
- [x] Enter key in search confirms without selecting first suggestion
- [x] Multiple GitHub issues/PRs per dashboard issue (add via button, not re-prompted at creation)
- [x] Link whole GitHub repositories to issues (not just issues/PRs)
- [x] Embedded GitHub info cards on dashboard and in issue notes
- [x] Show issue number and title in link text (not generic text)
- [x] Manual refresh button to update GitHub data
- [x] GitHub quick-open button per issue (opens linked URL in browser)
- [x] Rate limit display in settings
- [x] Support for both issues and pull requests
- [x] Display issue number, status, labels, assignees, and description

## Project Folder Integration

- [x] Per-dashboard global project folder setting (`dashboard.projectFolder`)
- [x] Per-issue independent folder storage (`settings.issueFolders[dashboardId:issueId]`)
- [x] Folder button in dashboard header (global) and per-issue header
- [x] Left-click folder button: opens explorer if folder set, opens FolderPathModal if not
- [x] Right-click folder button: opens FolderPathModal to reassign/clear (when folder set)
- [x] Faded folder button indicates no folder assigned
- [x] Terminal button hidden when no folder assigned (not faded)
- [x] Terminal opens PowerShell on Windows, default terminal on Mac/Linux
- [x] VS Code button opens folder in VS Code (uses `code` CLI, cross-platform)
- [x] VS Code button hidden when no folder assigned (same visibility as terminal)
- [x] VS Code button styled with brand color (#007ACC)
- [x] Per-dashboard toggle for folder/terminal button visibility
- [x] Issue folder assignment is independent — does not affect other issues or global

## Code Hardening

- [ ] Fix command injection in platform.ts — replace exec() with spawn() + shell:false
- [ ] Fix prototype pollution in YAML frontmatter parser
- [ ] Tighten GitHub URL validation with protocol check
- [ ] Parallelize GitHub card rendering (Promise.all)
- [ ] Parallelize file reads during sort operations
- [ ] Fix memory leak — dropdown event listener accumulation
- [ ] Async progress bar rendering with placeholder
- [ ] LRU cache with size cap for GitHub API cache
- [ ] Debounce vault modify event handler
- [ ] Add TFile type guards on getAbstractFileByPath calls
- [ ] Typed error propagation from GitHub API
- [ ] Operation locking for archive/unarchive race conditions
- [ ] Error handling for spawn() failures with user notice
- [ ] Validate loadData() shape before type assertion
- [ ] Handle swallowed promise rejections in render
- [ ] Try/catch in plugin onload() with user notice
- [ ] Replace deprecated electron.remote
- [ ] Split addGitHubLink (167 lines) into sub-functions
- [ ] Split rebuildDashboardFromFiles (123 lines) into sub-functions
- [ ] Unify duplicate sortByCreatedDate/sortByEditedDate logic
- [ ] Extract magic numbers to named constants
- [ ] Minor convention fixes (forEach→for...of, substr→substring, exec loop→matchAll)

## Code Quality

- [x] Minimal whitespace
- [x] TypeScript with proper types
- [x] Modular architecture with separate services

## Documentation

- [x] requirements.md with checklist
- [x] README.md with installation and usage instructions
- [x] ideas.md with future tasks and improvements
