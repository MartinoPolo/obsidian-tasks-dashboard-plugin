# Tasks Dashboard Plugin - SPEC

## Core Features

- [x] Control an Obsidian note as a task dashboard
- [x] Select a note that becomes the dashboard (path and name configurable in settings)
- [x] Dashboard includes Active Issues, Notes, and Archive sections (H1 headers)
- [x] Creating an issue from hotkey/button prompts for name, priority, and optional GitHub link
- [x] Creating an issue writes a note in `{dashboard-path}/Issues/Active/` and adds an Active Issues entry

## Issue Creation Flow (Keyboard-Driven)

- [x] Prompts appear at top of screen (Quick Switcher position)
- [x] Step 1: name prompt (text input, Enter confirm, confirm/cancel with key hints)
- [x] Step 2: priority prompt (↑↓ navigation, medium preselected, order: low/medium/high/top)
- [x] Step 3: optional GitHub linking flow
  - if GitHub is enabled + authenticated: choose Issue/PR, Repository, or Skip
  - if GitHub is enabled but unauthenticated: allow pasted GitHub URL
  - if GitHub is disabled: skip GitHub step
- [x] After creation, open issue file with cursor positioned for immediate task entry

## Active Issue File Behavior

- [x] Smart cursor placement at end of `## Tasks` section (fallback: end of file)

## Issue Note Format

- [x] YAML frontmatter includes: created datetime, status (`active`/`archived`), priority
- [x] Back link to dashboard (`← Back to Dashboard`) uses relative path
- [x] Issue title header present
- [x] GitHub link rendered when provided
- [x] Ends with blank task `- [ ] `

## Dashboard Entry Format

- [x] Issue title rendered with priority-colored left border
- [x] Controls row with progress and actions below title
- [x] Tasks query block below controls (limit 10, sorted by priority, short mode)
- [x] No markdown separator between issue blocks
- [x] Section markers use `%%` comments compatible with parser/writer invariants

## Dashboard Structure

- [x] `# Active Issues`
- [x] `# Notes` between Active Issues and Archive
- [x] `# Archive`
- [x] `# How to Use This Dashboard`

## Interactive Controls

### Dashboard Buttons

- [x] Add Issue button
- [x] Sort by priority and by created/edited date (newest/oldest)
- [x] Collapse/expand all issues
- [x] Global in-dashboard Rebuild button in dashboard controls
- [x] Settings Rebuild action reconstructs from files and refreshes GitHub cards

### Per-Issue Controls

- [x] Consistent square icon buttons with high-contrast hover
- [x] Archive and delete (delete with confirmation)
- [x] Move up/down and move to top/bottom (right-click move shortcuts included)
- [x] Collapse/expand per issue (state persisted)
- [x] Rename with state migration for collapse/colors
- [x] Per-issue color picker (`<input type="color">`) persisted in `issueColors`
- [x] GitHub quick-open button (faded when missing link; click to add)
- [x] Folder/terminal/VS Code buttons per issue (independent from global)
- [x] Progress indicator with priority-aware styling
- [x] Always-visible 3-dots overflow in expanded and collapsed cards
- [x] Overflow contains only hidden row1/row2 actions and never duplicates visible actions
- [x] Header title priority: hide non-3-dots row1 actions before title truncation
- [x] Header hover reveal: show all row1 actions; enforce 200px title minimum; allow horizontal overflow if needed
- [x] No blank visual spacing between collapsed active issues

## Settings

- [x] Multiple dashboards configurable independently
- [x] Per-dashboard root path editable
- [x] Create Dashboard action creates dashboard file and folder structure
- [x] Progress display mode configurable (number/percentage/bar/number-percentage/all)
- [x] Hotkeys configurable via native Obsidian Hotkeys
- [x] Dashboard sections in settings can collapse to one-line summary and expand on demand

## Archive Functionality

- [x] Archiving sets issue status to `archived`
- [x] Archiving moves note to `Issues/Archive/`
- [x] Archiving moves dashboard entry to Archive section

## Progress Tracking

- [x] Automatic cache invalidation on file modify (5s cache)
- [x] Progress indicator shows done/total tasks per issue

## Color Customization

- [x] Single main issue color drives visual identity for issue card
- [x] Theme-aware derived controls/checklist backgrounds from main color (light/dark)
- [x] Section-level Active/Notes/Archive color settings removed
- [x] Rebuild flow preserves marker compatibility while retaining color behavior

## GitHub Integration

- [x] Per-vault PAT authentication
- [x] GitHub display mode setting (Minimal/Compact/Full) updates existing cards
- [x] Per-dashboard linked repository via repository picker
- [x] Per-dashboard no-GitHub mode toggle
- [x] Search modal with recent issues, real-time search, and scope selector (linked repo/my repos/all GitHub)
- [x] Enter in search confirms without selecting first suggestion
- [x] Multiple GitHub issues/PRs per dashboard issue
- [x] Repository links supported in addition to issue/PR links
- [x] Embedded GitHub cards in dashboard and issue notes
- [x] Link text uses issue number and title
- [x] Manual refresh action for GitHub data
- [x] Quick-open GitHub action per issue
- [x] Rate limit display in settings
- [x] Issues and pull requests both supported
- [x] Cards display number, status, labels, assignees, and description

## Project Folder Integration

- [x] Per-dashboard global project folder (`dashboard.projectFolder`)
- [x] Per-issue folder storage keyed as `settings.issueFolders[dashboardId:issueId]`
- [x] Folder button in dashboard header (global) and per-issue header
- [x] Left-click folder opens explorer when set, else opens `FolderPathModal`
- [x] Right-click folder opens `FolderPathModal` to reassign/clear
- [x] Faded folder button indicates no folder assigned
- [x] Terminal hidden when no folder assigned
- [x] Terminal opens Windows Terminal on Windows, Terminal.app on macOS, default emulator on Linux
- [x] VS Code opens folder via `code` CLI
- [x] VS Code hidden when no folder assigned
- [x] Per-dashboard toggle controls folder/terminal button visibility
- [x] Issue folder assignment is fully independent per issue/global

## Worktree Integration (Planned)

- [ ] Add a new `Add issue in worktree` action in global dashboard actions and/or per-issue actions when GitHub linking is available, with the same visibility logic as the existing GitHub action/button.
- [ ] Use a GitHub-like icon for `Add issue in worktree` with an additional square-accent treatment (GitHub-inspired icon with extra square framing detail).
- [ ] Clicking `Add issue in worktree` must launch a keyboard-driven multi-step prompt flow (same interaction pattern as issue creation) that collects: worktree name (free text), worktree color (preset palette options plus custom color picker), priority, and associated GitHub issue/PR/repository selection using the same GitHub linking patterns as issue creation.
- [ ] Reuse the existing add-issue creation system for both standard and worktree-enabled flows, and extend the shared flow to include a color-picking step; the only functional difference for `Add issue in worktree` is that it runs worktree setup after inputs are collected.
- [ ] After collecting inputs for `Add issue in worktree`, execute `C:\_MP_projects\mxp-claude-code\scripts\setup-worktree.sh` through the existing terminal-spawn approach used by the plugin (Windows Terminal-compatible path), and pass the selected color to the script so worktree tooling uses the same unified color.
- [ ] When an issue is archived or deleted, show a prompt asking whether to remove its worktree, and if confirmed execute `C:\_MP_projects\mxp-claude-code\scripts\remove-worktree.sh` using the same safe process-launch approach.

## Plugin-Wide Dashboard Hotkeys (Planned)

- [ ] Add plugin-wide commands and configurable hotkeys for `Collapse all issues` and `Expand all issues` dashboard actions, using native Obsidian hotkey registration so users can bind/change keys in the global Hotkeys settings.
- [ ] Ensure `Collapse all issues` and `Expand all issues` hotkeys are plugin-level (not dashboard-specific settings), and apply to the active dashboard context when invoked.
- [ ] Plan the hotkeys phase as dependent on completion of Phase 16 worktree integration, including the previously planned global `Add issue in worktree` behavior.

## Open / Optional Improvements

### Optional (Non-Blocking) UX Improvements

- [ ] Optional tooltip hints for overflow actions when labels are icon-only
- [ ] Optional one-click reset to default action layout at dashboard scope
- [ ] Optional lightweight confirmation toast after saving action layout settings

## Code Quality

- [x] Minimal whitespace
- [x] TypeScript with proper types
- [x] Modular architecture with separate services