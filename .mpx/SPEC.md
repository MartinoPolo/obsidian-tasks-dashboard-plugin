# Tasks Dashboard Plugin - SPEC

## Dashboard Structure

- [x] Control an Obsidian note as a task dashboard with configurable path and name
- [x] Dashboard sections: `# Active Issues`, `# Notes`, `# Archive`, `# How to Use This Dashboard`
- [x] Active Issues section renders after dashboard global action buttons
- [x] Section markers use `%%` comments compatible with parser/writer invariants
- [x] Exactly one `How to Use This Dashboard` section instance; content reflects current controls and states the section can be freely deleted
- [x] Dashboard info section displays linked folder and linked GitHub repository
- [x] Dashboard action buttons: Add Issue, Sort (priority/created/edited, newest/oldest), Collapse/Expand all, Rebuild
- [x] Settings Rebuild action reconstructs from files and refreshes GitHub cards
- [x] Collapse/Expand all targets every issue in the dashboard (entire dataset, not only visible/rendered subset)
- [x] All dashboard buttons should use icons only; tooltip describes function
- [x] Dashboard buttons positioned next to the dashboard info section (linked folder/repo). Buttons in a separate flex-wrap container aligned right; info section on the left. Buttons wrap to next line if insufficient space

## Issue Creation Flow

- [x] Keyboard-driven multi-step flow with prompts at top of screen (Quick Switcher position)
- [x] Step 1 (conditional): GitHub link selection — included only when GitHub integration is available for the dashboard. Live repository-scoped search while typing with number-aware lookup. When input is empty, show latest issues with arrow-key navigation. Enter confirms highlighted result or skips when no selection/URL exists. Clicking a result confirms and proceeds to Step 2
- [x] Step 2: Issue name entry — pre-filled as `{number} {first-four-words}` (no `#`) when a GitHub issue was selected; empty otherwise. Cursor positioned at end of pre-filled text without auto-select. Manual edits allowed before confirmation
- [x] Step 3 (conditional): Worktree yes/no — included when worktree creation is available. Two explicit choices: Yes (green tree icon) and No (red styling)
- [x] Step 4: Color selection — preset palette with color picker
- [x] Step 5: Priority selection — Low/Medium/High/Top order, Low preselected. Clicking a priority immediately confirms (no Enter/Confirm button needed)
- [x] After creation, open issue file with cursor positioned for immediate task entry
- [x] Creating an issue writes a note in `{dashboard-path}/Issues/Active/` and adds an Active Issues entry
- [x] Consume mouse back-button events inside multi-step modals so handled back actions (e.g., step 2→step 1) never propagate to Obsidian navigation
- [x] Consume Backspace in GitHub search input fields so text editing does not trigger browser-like back navigation

## Issue Card

### Entry Format

- [x] Issue title rendered with priority-colored left border
- [x] Controls row with progress and actions below title
- [x] Tasks query block below controls (limit 10, sorted by priority, short mode)
- [x] Issue blocks render without markdown separators
- [x] Collapsed active issues render with zero visual spacing

### Header & Actions

- [x] Consistent square icon buttons with high-contrast hover
- [x] 3-dots overflow menu always visible in expanded and collapsed cards
- [x] Overflow contains only hidden row1/row2 actions; never duplicates visible actions
- [x] On narrow widths, hide header buttons dynamically; expose hidden actions only via 3-dots overflow. No layout shift on hover
- [x] Header title priority: hide non-3-dots row1 actions before title truncation
- [x] Minimum title width: 100px
- [x] Theme-appropriate title text color (light text in dark mode, dark text in light mode) instead of default link color
- [x] Remove duplicate native/system tooltips on action buttons; keep only custom tooltip
- [x] Issue info affordance: instant hover tooltip, multi-line, info icon positioned after title. Displays dashboard identity, assigned folder, linked GitHub issue/PR/repository, and worktree details
- [x] Header color picker anchors as dropdown from issue header color button (or centered fallback); no off-screen corner placement
- [x] Color action tooltip reads "Issue color" (not "Header color")

### Per-Issue Controls

- [x] Archive (text styled orange in overflow) and delete with confirmation (text styled red in overflow)
- [x] Move up/down and move to top/bottom (right-click move shortcuts included)
- [x] Collapse/expand per issue (state persisted across renders/reloads)
- [x] Rename with state migration for collapse/colors
- [x] Per-issue color picker (`<input type="color">`) persisted in `issueColors`
- [x] GitHub quick-open button (faded when missing link; click to add)
- [x] Folder/terminal/VS Code buttons per issue (independent from global)
- [x] Progress indicator with priority-aware styling
- [x] Change priority action: uses same priority-selection prompt as creation. Hidden by default in action rows per layout settings but always accessible via 3-dots overflow
- [x] All actions hidden via layout settings remain present and executable in the 3-dots overflow
- [x] Layout-settings dropdown menus overflow viewport bounds with scrollbars when needed

## Issue Lifecycle

### Issue Note Format

- [x] YAML frontmatter: created datetime, status (`active`/`archived`), priority
- [x] Back link to dashboard (`← Back to Dashboard`) via relative path
- [x] Issue title header present
- [x] GitHub link rendered when provided
- [x] Ends with blank task `- [ ] `

### Archive

- [x] Archiving sets status to `archived`, moves note to `Issues/Archive/`, moves dashboard entry to Archive section

### Sort

- [x] Sort by priority and by created/edited date (newest/oldest)

## Progress Tracking

- [x] Automatic cache invalidation on file modify (5s cache)
- [x] Progress indicator shows done/total tasks per issue
- [x] Progress display mode configurable (number/percentage/bar/number-percentage/all)

## Color System

- [x] Single main issue color drives visual identity for issue card
- [x] Theme-aware derived controls/checklist backgrounds from main color (light/dark)
- [x] Theme-aware color palettes with explicit light/dark variants for visual balance and readability
- [x] Rebuild flow preserves marker compatibility while retaining color behavior
- [x] Track used issue colors per dashboard; disable already-assigned colors in creation picker (disabled colors render gray)
- [x] Auto-preselect next available color by rotating from last-used color position
- [x] Release color when an issue is deleted, archived, or color is changed (old color freed, new color reserved)
- [x] Option to release all colors in plugin settings
- [x] 30-color palette in 6×5 grid: six main hues (blue, red, orange, purple, brown, green) with five shades each. Darker shades at top in dark mode, lighter shades at top in light mode. Top row contains the most-used colors

## GitHub Integration

- [x] Per-vault PAT authentication
- [x] GitHub display mode setting (Minimal/Compact/Full) updates existing cards
- [x] Per-dashboard linked repository via repository picker
- [x] Per-dashboard no-GitHub mode toggle
- [x] Search modal with recent issues, real-time search, and scope selector: issue linked repository, dashboard linked repository, my repositories
- [x] Enter in search selects highlighted result (or accepts pasted GitHub URL)
- [x] Sort offered issues/PRs by recency with assignment-aware ranking (assigned-to-me first)
- [x] Multiple GitHub issues/PRs per dashboard issue
- [x] Repository links supported in addition to issue/PR links
- [x] Embedded GitHub cards in issue notes via `tasks-dashboard-github` code block
- [x] Link text uses issue number and title
- [x] Manual refresh action for GitHub data
- [x] Quick-open GitHub action per issue
- [x] Rate limit display in settings
- [x] Issues and pull requests both supported
- [x] Cards display number, status, labels, assignees, and description

### Assigned Issues Section

- [x] Optional foldable section for dashboards with linked repositories, listing assigned GitHub issues with one-click conversion into dashboard issues. Two icon-only buttons per row: plus icon (add issue → step 2 with preselected GitHub) and worktree icon (quick worktree with medium priority, next available color, user edits name only)
- [x] Loading state visible while request is pending
- [x] Linked assigned issues (already in dashboard) go at the bottom, separated by divider and label (e.g., "In dashboard")
- [x] Load 10 issues per repo by default with "Load more" button. Display loaded/total count next to repo title (e.g., "10/17 loaded")

## Project Folder & External Tools

- [x] Per-dashboard global project folder (`dashboard.projectFolder`)
- [x] Per-issue folder storage keyed as `settings.issueFolders[dashboardId:issueId]`
- [x] Folder button in dashboard header (global) and per-issue header. Left-click opens explorer when set, else opens `FolderPathModal`. Right-click opens `FolderPathModal` to reassign/clear
- [x] Faded folder button indicates no folder assigned
- [x] Terminal button visible when enabled; faded when no folder (opens folder picker on click). Opens Windows Terminal on Windows, Terminal.app on macOS, default emulator on Linux
- [x] VS Code button visible when enabled; faded when no folder (opens folder picker on click). Opens folder via `code` CLI
- [x] Per-dashboard toggle controls folder/terminal/VS Code button visibility
- [x] Issue folder assignment is fully independent per issue/global

## Worktree Integration

### Completed

- [x] `Add issue in worktree` action in global dashboard actions and per-issue actions, using GitHub action visibility gate. Faded unless target folder is a Git repository; click launches worktree flow or prompts to set/fix folder
- [x] Dedicated worktree icon button treatment
- [x] Worktree flow reuses shared issue creation flow with color prompt; repository-link option excluded in worktree mode
- [x] Worktree setup executes configurable setup script via safe process-launch path (`shell: false`) and passes selected color
- [x] Issue deletion and archive prompt for optional worktree removal; execute configurable removal script when confirmed. Skip worktree removal when no worktree is assigned
- [x] Worktree origin folder persisted in issue frontmatter and reused for removal/setup context
- [x] After worktree creation, assign expected worktree folder automatically when setup succeeds
- [x] For worktree issues, GitHub linking search scope defaults to base repository of the source issue/folder
- [x] Per-issue card action labeled "Add Issue" (plus icon) with enable/disable gating tied to worktree feasibility from issue context
- [x] Normalized worktree/branch names: lowercase, spaces→dashes, git-branch-safe characters only, issue number prefix when available

### Pending

- [x] When creating a child worktree issue from an existing worktree issue card, derive base context from the source issue's stored worktree/base-repository metadata (not from `.git` directory presence), and keep creation functional even when `.git` is absent in the worktree folder
- [x] Persist explicit worktree branch metadata on the issue (including in issue file properties) and expose branch/worktree status details through an info affordance (icon with hover tooltip or dropdown)
- [x] Render a worktree status icon in issue headers: green when active, red on setup failure, orange when pending/in-progress, gray when branch deleted/merged
- [x] Worktree setup verification state machine: pending (orange tree) polling for expected folder every 1s for up to 10s, success after folder appears and assignment activates, failure (red tree) after timeout
- [x] On setup failure, expose a retry-capable worktree header action (tree icon) as the first header action, auto-shown only in failed state
- [x] Add a refresh action to re-check worktree/branch state and update displayed status
- [x] Worktree retry action uses the same tree icon as the status icon; displayed as a header action, not a text button
- [x] Clicking the worktree retry action spawns a modal listing currently active worktrees in the repository (with option to switch repositories), plus an option to create a new worktree with auto-suggested editable name and confirm button
- [x] Worktree icon in issue header positioned left of info icon. When a worktree is assigned, display relative location info: base folder/repo name, base branch (e.g., `dev`), and checked-out branch name (e.g., `atc-common/dev → 986-worktree-branch`). Support worktree-on-worktree scenarios by always showing the base branch. Derive folder detection from the configured worktree output directory
- [x] Support multiple worktree base folders per dashboard. Sort issues by worktree base folder to visually group worktrees from the same project
- [x] Dashboard refresh button that verifies folder/repo existence, refreshes worktree/branch state and GitHub issue status. Detect linked PRs to auto-link and display their status including base branch sync
- [x] Merge worktree status icon and "Add worktree later" into a single icon with context-dependent behavior: green tree icon when worktree is active; clickable button triggering worktree assignment/creation when setup failed or was never done

## Settings & Configuration

- [x] Multiple dashboards configurable independently
- [x] Per-dashboard root path editable
- [x] Create Dashboard action creates dashboard file and folder structure
- [x] Hotkeys configurable via native Obsidian Hotkeys
- [x] Dashboard sections in settings collapse to one-line summary and expand on demand
- [x] Plugin-wide commands and configurable hotkeys for Collapse/Expand all issues, registered via native Obsidian hotkey system. Plugin-level scope, applies to active dashboard context when invoked
- [x] Dashboard-level "Open dashboard settings" action button. Opens plugin settings, focusing/scrolling to current dashboard's settings block when API supports it

## Code Quality

- [x] Minimal whitespace
- [x] TypeScript with proper types
- [x] Modular architecture with separate services
- [x] `eslint-plugin-obsidianmd` configured for Obsidian pre-publish style/check parity

## Git Status

- [x] Fetch and display branch status, linked PR status, and GitHub issue status per dashboard issue
- [x] Branch badge: green when active, strikethrough when deleted, gray when unknown
- [x] Branch state determined from both local and remote refs; unpushed local branches recognized as active
- [x] PR badge with state icon: open (green), draft (gray), merged (purple), closed (red), review-requested (yellow). Clickable link to PR URL
- [x] PR badge shown only when a PR exists
- [x] GitHub issue state badge with icons (open = green circle-dot, closed = purple circle-check). Clickable link to issue URL
- [x] Badge text: branch name trimmed to 16 chars (full name in tooltip); PR and issue show `#number State`
- [x] Badges rendered in issue header after title; visible in both expanded and collapsed card states
- [x] Responsive badge compaction: badges collapse to icon-only mode when header space is insufficient (keeping state color and icon, dropping text)
- [x] Right-click context menu on badges with "Refresh" action for per-issue git status refresh
- [x] Works for both worktree issues (branch-based lookup) and non-worktree issues (GitHub-link-based lookup)
- [x] PR state accent: vivid header bottom-border with gradient overlay for merged and review-requested states
- [x] Sort by PR state: review-requested → open → draft → merged → closed
- [x] 5-minute cache with manual refresh via dashboard refresh button and per-issue badge context menu

## Priority Toggle

- [x] Per-dashboard setting `prioritiesEnabled` (default: `true`). When disabled:
  - Priority left-border strip hidden on issue cards (CSS-driven, priority class still applied)
  - Priority selection step skipped in all issue creation workflows
  - All issues auto-assigned `low` priority
  - "Sort by Priority" option hidden from sort dropdown
  - Issues retain priority in data model (not displayed or prompted)

## Issue Card Layout

- [x] Dashboard issue card contains: header (with badges and buttons), controls (progress + action buttons), task query section
- [x] Header element order: collapse button, title, badges, worktree icon, info icon, action buttons
- [x] Info icon color matches header text color; hover shows background highlight
- [x] Consistent spacing between all header elements via parent `gap`; no per-element margin overrides
- [x] Rebuild action uses a distinct icon from sort action

## Issue Lifecycle

- [x] Archive and delete confirmation modals display unfinished task count in red when incomplete tasks exist
- [x] Archive modal includes worktree removal checkbox; Escape cancels the entire operation
- [x] Issue notes use `tasks-dashboard-github` code block as the sole GitHub section (no standalone markdown link)
- [ ] New issue files created without a default markdown checkbox to avoid false unfinished-task counts
- [ ] Priority selection step displays a confirmation button; no skip action (every issue requires a priority, with default pre-selected)

## External Tools

- [x] After worktree creation, auto-open terminal in the worktree folder with issue color once folder is confirmed
- [x] VS Code launch verifies Peacock color (`peacock.color` in `.vscode/settings.json`) matches issue color; corrects mismatch before opening

## Worktree Refinements

- [x] Quick worktree from assigned issues derives expected folder from the worktree output directory configuration
- [x] Worktree retry modal lists active worktrees for direct assignment in addition to creating new worktrees
- [x] Worktree base branch persisted at creation time for accurate base-branch display
- [x] Normalized worktree branch names avoid duplicate number prefixes

## UI Consistency

- [x] Modal confirm buttons positioned on the right; cancel/secondary on the left
- [x] GitHub repository removal button uses square icon styling
- [x] GitHub search scope offers all linked repositories for the dashboard (not just the first)

## TODO

- [ ] Refactor large files; clean code sweep across the project
- [ ] Componentize standalone UI units (e.g., header badges) into isolated modules; analyze Obsidian Plugin componentization approach
- [ ] Consolidate all current phases into 1 epic