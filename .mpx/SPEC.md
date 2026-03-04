# Tasks Dashboard Plugin - SPEC

## Core Features

- [x] Control an Obsidian note as a task dashboard
- [x] Select a note that becomes the dashboard (path and name configurable in settings)
- [x] Dashboard includes Active Issues, Notes, and Archive sections (H1 headers)
- [x] Creating an issue from hotkey/button prompts for name, color, priority, and optional GitHub link
- [x] Creating an issue writes a note in `{dashboard-path}/Issues/Active/` and adds an Active Issues entry

## Issue Creation Flow (Keyboard-Driven)

- [x] Prompts appear at top of screen (Quick Switcher position)
- [x] Step 1: name prompt (text input, Enter confirm, confirm/cancel with key hints)
- [x] Step 2: color prompt (preset palette + color picker)
- [x] Step 3: priority prompt (↑↓ navigation, order: low/medium/high/top; first option focused by default)
- [x] Step 4: optional GitHub linking flow
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
- [x] Search modal with recent issues, real-time search, and scope selector:
  - issue linked repository (when available)
  - dashboard linked repository (when available)
  - my repositories
  - all GitHub
- [x] Enter in search selects the currently highlighted result when available (or accepts pasted GitHub URL)
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
- [x] Terminal button is visible when enabled; faded when no folder and opens folder picker on click
- [x] Terminal opens Windows Terminal on Windows, Terminal.app on macOS, default emulator on Linux
- [x] VS Code opens folder via `code` CLI
- [x] VS Code button is visible when enabled; faded when no folder and opens folder picker on click
- [x] Per-dashboard toggle controls folder/terminal/VS Code button visibility
- [x] Issue folder assignment is fully independent per issue/global

### Button Behavior Source of Truth (Concise)

- [x] Folder: left-click opens folder when assigned, otherwise opens picker; context/right click opens picker for reassignment/clear.
- [x] Terminal: visible when terminal visibility is enabled; faded if no folder; click opens terminal for assigned folder or opens folder picker when missing.
- [x] VS Code: visible when VS Code visibility is enabled; faded if no folder; click opens VS Code for assigned folder or opens folder picker when missing.
- [x] Add issue in worktree (global): visible with GitHub actions; faded unless dashboard project folder is a Git repository; click launches worktree issue flow or prompts to set/fix project folder.
- [x] Add issue in worktree (per issue): visible with GitHub actions; faded unless issue folder is a Git repository; click launches worktree issue flow or prompts to set/fix issue folder.

## Worktree Integration

- [x] `Add issue in worktree` action exists in global dashboard actions and per-issue actions, using the same visibility gate as GitHub action visibility.
- [x] Worktree action uses dedicated worktree icon button treatment.
- [x] Clicking `Add issue in worktree` launches keyboard-driven multi-step flow: name, color, priority, optional GitHub issue/PR linking.
- [x] Worktree flow reuses shared issue creation flow with color prompt; repository-link option is excluded in worktree mode.
- [x] Worktree setup executes `C:\_MP_projects\mxp-claude-code\scripts\setup-worktree.sh` via existing safe process-launch path and passes selected color.
- [x] Issue deletion and archive flows prompt for optional worktree removal and run `C:\_MP_projects\mxp-claude-code\scripts\remove-worktree.sh` when confirmed.
- [x] Worktree origin folder is persisted in issue frontmatter and reused for removal/setup context.

## Plugin-Wide Dashboard Hotkeys

- [x] Add plugin-wide commands and configurable hotkeys for `Collapse all issues` and `Expand all issues` dashboard actions, using native Obsidian hotkey registration so users can bind/change keys in the global Hotkeys settings.
- [x] Ensure `Collapse all issues` and `Expand all issues` hotkeys are plugin-level (not dashboard-specific settings), and apply to the active dashboard context when invoked.
- [x] Plan the hotkeys phase as dependent on completion of Phase 16 worktree integration, including the previously planned global `Add issue in worktree` behavior.

## Dashboard Action and Visibility Improvements

- [x] Add a dashboard-level `Open dashboard settings` action button in the top dashboard action area alongside existing global actions (for example, `Collapse all`). Clicking it should open this plugin's Obsidian settings, and when supported by available APIs it should focus and/or scroll to the current dashboard's settings block; otherwise it should gracefully fall back to opening the plugin settings tab.
- [x] Add a per-issue `Change priority` action that uses the same priority-selection prompt flow used during issue creation, so priority can be changed quickly from the dashboard without opening the issue note.
- [x] `Change priority` must be hidden by default in action rows according to existing layout settings semantics (hidden means not shown in header row nor controls row), but it must always remain accessible through the per-issue 3-dots overflow dropdown.
- [x] Ensure all actions hidden via layout settings remain correctly present and executable in the 3-dots overflow dropdown (never lost when hidden from visible rows).
- [x] Update global `Collapse all issues` behavior so it targets every issue in the dashboard (entire dashboard dataset), not only issues currently visible in the active view/render window.

## Open / Optional Improvements

### Optional (Non-Blocking) UX Improvements

- [x] Optional tooltip hints for overflow actions when labels are icon-only
- [x] Optional one-click reset to default action layout at dashboard scope
- [x] Optional lightweight confirmation toast after saving action layout settings

## Code Quality

- [x] Minimal whitespace
- [x] TypeScript with proper types
- [x] Modular architecture with separate services

## Requirements Batch (2026-03-04)

### Page Focus

- [ ] Restrict smart cursor repositioning (jump to end of `## Tasks`) to note-entry events only; when the user directly clicks inside an already-open issue note, preserve the clicked cursor position and do not re-run auto-focus repositioning.

### Event Propagation

- [ ] Consume mouse back-button navigation events inside multi-step issue creation modals so handled back actions (for example step 2 → step 1) never propagate to the dashboard or Obsidian-level page navigation.
- [ ] While typing in GitHub search input fields (especially issue-creation linking step), consume Backspace so text editing does not trigger parent/browser-like back navigation.

### Worktrees

- [ ] After worktree issue creation, assign the expected worktree folder automatically when setup succeeds, using the same effective assigned-folder behavior as manual folder assignment.
- [ ] When creating a child worktree issue from an existing worktree issue card, derive base context from the source issue’s stored worktree/base-repository metadata (not from presence of an in-folder `.git` directory), and keep creation functional even when `.git` is absent in the worktree folder.
- [ ] Persist explicit worktree branch metadata on the issue (including in issue file properties) and expose branch/worktree status details through an info affordance (icon with hover tooltip or dropdown).
- [ ] Add a new issue info affordance that surfaces consolidated metadata: dashboard issue identity, assigned folder, linked GitHub issue/PR/repository, and current worktree details.
- [ ] Add explicit dashboard-level visual indication for worktree issues (either a dedicated section/sort grouping or marker-based identification next to priority) without breaking Active/Archive section model.
- [ ] For worktree issues, GitHub issue/PR linking search scope must default to and prioritize the base repository of the source issue/folder from which the worktree was created, even if the worktree folder path differs.
- [ ] Render a worktree status icon in issue headers between collapse chevron and issue title: green when worktree is active; red when tracked branch is merged or deleted (safe-to-delete signal).
- [ ] Introduce worktree setup verification state machine: pending (orange tree) while polling for expected folder existence every 1 second for up to 10 seconds, success state only after folder appears and assignment is activated, and failure state (red tree) after timeout.
- [ ] If automatic worktree setup fails, expose a retry-capable `Add worktree later` header action (tree icon) as the first header action, hidden by default and auto-shown only in failed state.

### GitHub Integration

- [ ] Fix repository-scoped GitHub search so `My repositories` reliably returns issue/PR results instead of empty results when authentication and scopes are valid.
- [ ] Repair or remove `All repositories` search mode: result set must be relevant to entered query terms/identifiers and must not prefer unrelated repositories; if relevance quality cannot meet this requirement, remove this scope.
- [ ] Sort offered GitHub issues/PRs by recency with assignment-aware ranking (assigned-to-me first), while preserving fast incremental text/number search behavior.
- [ ] Add optional foldable `Assigned Issues` dashboard section for dashboards with linked repositories, listing assigned GitHub issues and providing one-click conversion into dashboard issues.

### Issue Creation Workflow

- [ ] Redefine step order to: Step 1 GitHub link selection (old step 4 behavior), Step 2 issue name entry (pre-filled from selected GitHub issue title/number when selected, empty when skipped), then remaining creation steps.
- [ ] Conditionally include Step 1 GitHub link selection only when GitHub integration is available for the active dashboard/context.
- [ ] In GitHub-link step, support live repository-scoped search while typing and number-aware lookup (typing an issue number should surface matching issue in repository when present).
- [ ] When GitHub-link search input is empty, offer latest issues as default suggestions; support arrow-key navigation and Enter to select highlighted result.
- [ ] After selecting a GitHub issue in Step 1, prefill Step 2 name using `#{number} {title}` format and allow manual edits before confirmation.
- [ ] While a GitHub issue is selected for the current flow, do not restart auto-search until the field is fully cleared (selection-lock behavior).
- [ ] Add conditional worktree yes/no step after name step when worktree creation is available under existing `Add WorkTree Issue` eligibility conditions.
- [ ] Worktree yes/no step must use two explicit choices with visual semantics: Yes with green tree icon and No with red styling.
- [ ] Remove dashboard-level `Add WorkTree Issue` button and merge capability into `Add Issue` flow via the conditional worktree step.
- [ ] Rename per-issue card action from `Add WorkTree Issue` to `Add Issue` with plus icon, while keeping current enable/disable gating semantics tied to worktree feasibility from that issue context.
- [ ] In name/link inputs, when field is empty or numeric-only, ArrowUp/ArrowDown should move selection within offered GitHub issue suggestions.
- [ ] For automatically derived worktree/branch names, normalize from resulting issue name by lowercasing, replacing spaces with dashes, retaining only git-branch-safe characters, and ensuring issue number prefix is included when available.
- [ ] Preselect `Medium` as default in priority selection step.

### Issue Card

- [ ] On narrow widths, stop hover-only reveal of hidden header buttons; expose hidden actions only via 3-dots overflow for consistent discoverability.
- [ ] Reduce minimum title width in issue header so short names relinquish space to visible actions before overflowing.
- [ ] Remove duplicate native/system tooltips on issue-card action buttons and keep only the custom tooltip experience.

### Layout Settings

- [ ] Allow layout-settings dropdown menus to overflow viewport bounds with scrollbars when needed instead of clipping content.
- [ ] Style `Delete issue` action text as red in issue-card 3-dots dropdown.
- [ ] Style `Archive` action text as orange in issue-card 3-dots dropdown.

### Colors

- [ ] Make issue color palettes theme-aware with explicit light/dark variants so selected colors remain visually balanced and readable in both themes.
- [ ] Track globally used issue colors across the vault and disable already-assigned colors in creation color-picker step.
- [ ] Auto-preselect the next available unused color by default in creation color-picker step.
- [ ] Expand color palette to grouped multi-column shades (minimum 25 colors), with optional 6x5 layout (30 colors) if implemented, and adapt color-picker grid layout accordingly.
- [ ] Release previously reserved color when an issue is deleted or archived so it becomes selectable again.
- [ ] Use theme-appropriate title text color for issue-card links/titles (light text in dark mode, dark text in light mode) instead of generic link color styling.
- [ ] Reposition header color picker to anchor as dropdown from issue header color button (preferred) or centered fallback; avoid off-screen corner placement.
- [ ] Renaming requirement: change color-action tooltip/title from `Header color` to `Issue color`.
- [ ] When changing issue color from the issue-card color action, update color-allocation tracking so old color is released and new color is reserved correctly.

### Dashboard

- [ ] Ensure dashboard contains exactly one `How to Use This Dashboard` section instance (deduplicate constants/rendering paths and prevent duplicates after rebuild).
- [ ] Update `How to Use This Dashboard` content to reflect new controls and explicitly state the section can be freely deleted.
- [ ] Persist per-issue collapsed/expanded state reliably across renders/reloads for all issues.
- [ ] Ensure `Collapse all` targets all dashboard issues (not only currently visible/rendered subset).
- [ ] Add an `Assigned Issues` section that auto-fetches issues assigned to current user for the dashboard-linked repository and provides one-click worktree creation actions.

### Tooling

- [ ] Add and configure `eslint-plugin-obsidianmd` so local linting includes Obsidian pre-publish style/check parity where applicable.