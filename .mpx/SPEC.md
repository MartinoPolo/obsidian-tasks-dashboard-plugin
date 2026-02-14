# Tasks Dashboard Plugin — Specification

> **Converted from existing project.** Features marked `[IMPLEMENTED]` already exist in the codebase. Do not create setup tasks for existing infrastructure. Phase planning should start from New Requirements.

Generated: 2026-02-08

## Project Overview
Obsidian plugin for managing task dashboards with issue tracking, progress indicators, priority-based organization, and GitHub integration. Uses custom markdown code blocks that render interactive controls.

## Tech Stack
- **Language:** TypeScript 5.7
- **Runtime:** Node.js (Obsidian plugin environment)
- **Framework:** Obsidian Plugin API (v0.15.0+)
- **Build Tool:** esbuild 0.24
- **Package Manager:** pnpm
- **Linting:** ESLint 9 + typescript-eslint
- **Formatting:** Prettier 3
- **Testing:** None

## Project Structure
```
obsidian-tasks-dashboard-plugin/
├── main.ts                    # Plugin entry point
├── src/
│   ├── dashboard/            # Dashboard parsing, writing, rendering
│   │   ├── DashboardParser.ts
│   │   ├── DashboardWriter.ts
│   │   └── DashboardRenderer.ts
│   ├── github/               # GitHub API integration
│   │   ├── GitHubService.ts
│   │   └── GitHubCardRenderer.ts
│   ├── issues/               # Issue management & progress tracking
│   │   ├── IssueManager.ts
│   │   └── ProgressTracker.ts
│   ├── modals/               # UI modals
│   │   ├── IssueModal.ts
│   │   └── GitHubSearchModal.ts
│   ├── settings.ts           # Plugin settings UI
│   ├── types.ts              # TypeScript interfaces & types
│   └── utils/                # Utilities
│       ├── slugify.ts
│       └── priorities.ts
├── styles.css                # Plugin styles
├── manifest.json             # Obsidian manifest
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── eslint.config.js
```

## Dev Commands
| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm build` | Type-check and build |
| `pnpm dev` | Watch mode |
| `pnpm lint` | Check lint errors |
| `pnpm lint:fix` | Auto-fix lint errors |
| `pnpm format` | Format with Prettier |

## Existing Features [IMPLEMENTED]

> These features are already implemented. They are documented here for context but should NOT be re-implemented in phases.

### Multiple Dashboards [IMPLEMENTED]
Configure separate dashboards for different projects with custom root paths.

### Issue Management [IMPLEMENTED]
Create, archive, and organize issues with four priority levels (low, medium, high, top).

### Issue Creation Flow [IMPLEMENTED]
Three-step keyboard-driven flow: Name -> Priority -> GitHub link. Opens issue file with cursor at end.

### Issue Note Format [IMPLEMENTED]
YAML frontmatter (created, status, priority), back link to dashboard, header, GitHub link, blank task.

### Dashboard Entry Format [IMPLEMENTED]
Issue header with priority-colored border, controls (progress + buttons), Tasks query block, separators, section markers.

### Interactive Controls [IMPLEMENTED]
Add Issue, Sort by Priority, Archive, Move up/down, progress bars with priority colors.

### Progress Tracking [IMPLEMENTED]
Visual progress bars with configurable display modes (number/percentage/bar/combined). 5s cache.

### Settings [IMPLEMENTED]
Multiple dashboards, root path editing, Create Dashboard button, progress display mode, configurable hotkeys.

### Archive Functionality [IMPLEMENTED]
Sets issue status to archived, moves note to Archive folder, moves dashboard entry to Archive section.

### GitHub Integration [IMPLEMENTED]
PAT authentication, embedded metadata cards (minimal/compact/full), search modal, per-dashboard repo linking, manual refresh.

### Markdown Processor [IMPLEMENTED]
Custom code block processors for `tasks-dashboard-controls` and `tasks-dashboard-sort`.

### File Structure Management [IMPLEMENTED]
Auto-creates Issues/Active and Issues/Archive folders.

## New Requirements

### 1. Fix Progress Refresh Bug
Progress indicator doesn't update when tasks are toggled from dashboard view. Refresh button is non-functional.

#### Acceptance Criteria
- Progress updates automatically when tasks are checked/unchecked from dashboard
- OR: Manual refresh button correctly forces progress recalculation
- Remove whichever approach is not chosen

### 2. Fix Dashboard Backlink with Spaces
Backlink to dashboard from issue notes breaks when dashboard name contains spaces.

#### Acceptance Criteria
- Backlinks work correctly with spaces in dashboard names
- Use proper Obsidian link encoding

### 3. Collapsible Issues in Dashboard
Add ability to collapse/expand issue details in the dashboard view.

#### Acceptance Criteria
- Toggle button per issue to collapse/expand details
- Collapsed state persisted per issue
- Global collapse/expand all button

### 4. Smart Cursor Positioning
Instead of jumping to end of file, jump to end of "## Tasks" section.

#### Acceptance Criteria
- Cursor positioned at end of ## Tasks section when opening active issue files
- Falls back to end of file if section not found

### 5. Fix Shortcut/Command Registration
Per-dashboard "Create Issue" commands don't work properly. Shortcut may be hardcoded.

#### Acceptance Criteria
- Per-dashboard commands work correctly
- Default Ctrl+Shift+E works and can be remapped via Obsidian hotkeys settings
- No hardcoded shortcuts

### 6. Enhanced GitHub Integration

#### 6a. Embedded GitHub View in Issue Notes
Show GitHub card/metadata in the issue note file, not just dashboard.

#### 6b. Add GitHub Issue/PR After Creation
Button to add GitHub issue and/or PR to an existing dashboard issue.

#### 6c. Repository Picker + Search Scope
Choose repo from a list instead of typing full name. Show suggestions from user's repos. Replace "Search all repositories" checkbox with a dropdown scope selector: **Linked repository** (default when dashboard has `githubRepo`), **My repositories** (default otherwise — searches personal + org repos via parallel queries), **All GitHub** (opt-in global search). Fetch `/user` and `/user/orgs` for scope filtering with caching. Cap parallel org queries at 5; fall back to global search + client-side filter for more.

#### 6d. No-GitHub Mode
Per-dashboard option to disable GitHub integration. Skip the GitHub link prompt during creation.

#### 6e. Card Type Switching
Switching GitHub card display mode should update existing cards immediately.

#### 6f. Dashboard Rebuild Includes GitHub Cards
Rebuild button should refresh GitHub cards too.

#### 6g. Enter Key in GitHub Search
Enter in GitHub search step should confirm without selecting first suggestion. Only explicitly selected items get linked.

#### 6h. Better GitHub Link Display
Show issue number and title in the link text, not generic text.

#### 6i. Multiple GitHub Issues Per Dashboard Issue
Support linking multiple GitHub issues/PRs to one dashboard issue. Don't re-prompt during creation; use "Add" buttons afterward.

#### 6j. Rate Limit Display
Show GitHub API rate limit somewhere in settings or dashboard.

#### 6k. Link GitHub Repository to Issue
Allow linking a whole GitHub repo (not just issue/PR) to a dashboard issue. Useful for mini-project dashboards where each issue represents a repo.

#### 6l. GitHub Quick-Open Button
Button in issue controls row to open linked GitHub URL in browser. When no link exists, button appears faded and opens a prompt to add one (same UX pattern as Req 7 folder button).

#### Acceptance Criteria
- Each sub-feature works independently
- Backward compatible with existing GitHub-linked issues

### 7. Link Project Folder to Dashboard & Issues
Associate on-disk project folders independently with the dashboard (global) and with individual issues (per-issue).

#### Behavior
| State | Folder Button | Terminal Button |
|-------|--------------|-----------------|
| No folder | Visible (faded) — click opens FolderPathModal | Hidden |
| Has folder | Visible (full) — left-click opens Explorer, right-click opens FolderPathModal (reassign/clear) | Visible — click opens terminal |

Same UX for both per-issue and global buttons, but each uses **independent** storage:
- Global: `dashboard.projectFolder` (set via settings or dashboard header button)
- Per-issue: `settings.issueFolders[dashboardId:issueId]` (set via issue controls)

#### Acceptance Criteria
- Setting per dashboard to link a global folder path
- Per-issue folder stored independently in `issueFolders` (namespaced by dashboardId:issueId)
- Folder buttons in both dashboard header and per-issue controls
- Left-click: opens explorer (if folder set) or FolderPathModal (if not)
- Right-click: opens FolderPathModal to reassign/clear (only when folder is set)
- Terminal button hidden when no folder assigned (not faded)
- Assigning folder to one issue does not affect other issues or the global button
- Platform-aware: PowerShell on Windows, default terminal on Mac/Linux
- VS Code button opens folder via `code` CLI (cross-platform), hidden when no folder assigned

### 8. Add Existing Notes as Issues
Import existing Obsidian notes into a dashboard as issues.

#### Acceptance Criteria
- "Add existing issue" button on dashboard
- Input with autocomplete/suggestions from vault notes
- Selected note gets converted (frontmatter added, formatted)
- Note remains in vault, represented in dashboard
- Converted note has all standard issue features

### 9. Separate Archive and Delete
Archive (current trash icon) and Delete should be distinct actions.

#### Acceptance Criteria
- Archive action with a new icon (not trash can)
- Delete action with trash can icon
- Delete shows confirmation dialog
- Delete removes issue from dashboard and optionally from vault
- Deleted files go to Obsidian trash or Issues/Deleted folder

### 10. Sort by Date
Sort issues by created date or last edited date.

#### Acceptance Criteria
- Sort by created date (newest/oldest first)
- Sort by last edited date (newest/oldest first)
- Optional: Show last edited date in issue cards

### 11. Fix "Create Files" Button
Settings button should handle edge cases properly.

#### Acceptance Criteria
- "Create Files" button does nothing if files already exist
- No errors when clicking on existing dashboard

### 12. Show Tree in Task Queries
Add `show tree` to dashboard task queries to properly display subtasks.

#### Acceptance Criteria
- Task queries include `show tree` option
- Subtasks display hierarchically in dashboard

### 13. Delete Dashboard from Settings
Add ability to delete a dashboard configuration.

#### Acceptance Criteria
- Confirmation dialog before deleting
- Option to remove associated data (files/folders)

### 14. Customizable Dashboard Colors
Allow users to customize background colors of dashboard sections.

#### Acceptance Criteria
- Setting to customize priority colors and/or background colors
- Changes reflect immediately in dashboard rendering

### 15. Move to Top/Bottom
Quick-move buttons to send an issue to the first or last position in the active section.

#### Acceptance Criteria
- "Move to top" button moves issue to first position
- "Move to bottom" button moves issue to last position
- Early return if already at target position
- Reuses existing rebuild infrastructure

### 16. Rename Issue
Full rename: dashboard markers, file path, H1, and state migration.

#### Acceptance Criteria
- Rename modal with pre-filled input, auto-selected text
- Validates empty name, same name (closes silently), and existing slug collision
- Updates all dashboard markers and metadata within the issue block
- Renames issue file
- Updates H1 in issue file
- Migrates collapsedIssues and issueColors state

### 17. Per-Issue Header Color
Custom background color per issue header via native color picker.

#### Acceptance Criteria
- Color picker button in issue controls
- Uses native browser `<input type="color">`
- Live preview while picking
- Persists to `issueColors` in settings
- Color migrated on rename, cleaned up on delete

### 18. Code Quality Refactoring
Eliminate ~800 lines of duplicated code across 15 files. Pure refactoring — no functional changes.

#### Scope
- Consolidate GitHub URL parsing (3+ regex patterns across 4 files) into `src/utils/github-url.ts`
- Extract shared dashboard path construction into `src/utils/dashboard-path.ts`
- Extract GitHub display helpers (state, truncate, date, contrast) into `src/utils/github-helpers.ts`
- Move API response interfaces from GitHubService.ts into `src/github/github-api-types.ts`
- Unify 99% identical `searchIssues`/`searchPullRequests` into shared `searchItems`
- Unify 3 identical move operations in DashboardWriter via `extractAndRemoveIssueBlock`
- Unify `buildIssueEntry` + `buildIssueBlock` into single `buildIssueMarkdownBlock`
- Split DashboardRenderer.ts (989 lines) into header-actions.ts + sort-controls.ts (~500 lines remaining)
- Deduplicate button creation (4+ times), visibility checks (9 times), collapse/expand (90% shared)
- Deduplicate YAML metadata building (4 times) and file search (3 times) in IssueManager
- Split IssueModal.ts (570 lines) into 3 files + modal-helpers.ts
- Extract visibility toggle pattern (4 identical) in settings.ts

#### Acceptance Criteria
- `pnpm build` passes after each group
- No functional changes — behavior identical pre/post refactoring
- 10 new utility/module files created
- DashboardRenderer.ts reduced from 989 to ~500 lines

## Technical Constraints
- Must integrate with existing factory function patterns
- Preserve existing Obsidian API class inheritance (Plugin, Modal, etc.)
- Follow established code style (functional programming, camelCase, etc.)
- Maintain backward compatibility with existing dashboard files
- TypeScript strict mode

## Dependencies Between Requirements
- Req 6b depends on 6c (repo picker useful for adding issues later)
- Req 6i depends on 6b (multiple issues requires "add later" capability)
- Req 6k depends on 6c (reuses repo picker infrastructure)
- Req 6l depends on 6b (shares "add link" prompt concept); soft dependency on 6k (handle all link types)
- Req 9 is independent but related to Archive (Req existing)
- Req 10 depends on existing sort infrastructure
- Req 3 (collapsible) is independent
- Req 1 (progress refresh) is a bug fix, highest priority
- Req 2 (backlink fix) is a bug fix, highest priority
- Req 5 (shortcut fix) is a bug fix, highest priority
