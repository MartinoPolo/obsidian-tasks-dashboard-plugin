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
- [x] Track globally used issue colors across the vault; disable already-assigned colors in creation picker (disabled colors render gray)
- [x] Auto-preselect the next available unused color by default
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
- [x] Embedded GitHub cards in dashboard and issue notes
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

## Bugs
- [x] Wrapping the dashboard buttons doesn't work, and they are just hidden on the right. If there's not enough space, it correctly wraps in relation to the dashboard info section, but when the buttons themselves span across the whole width of the page, they won't wrap. It should either be horizontally scrollable, or it should wrap to the next line, which is preferred.

- [x] Worktree created from the Quick option in a assigned issues sections (Open worktree from [issue number] button) of dashboard which has multiple assigned repositories and one folder. Specifically, my work dashboard is not correctly created. I see that the expected folder is worktree_expected_folder: C:/_MP_work/1017-superadmin-shouldnt-create-accounts and should be worktree_expected_folder: C:/_MP_work/worktrees/1017-superadmin-shouldnt-create-accounts

When I go through the worktree creation from the ATC back office issue, which is a separate issue on the dashboard with the correct linked folder and repository, everything works fine; however, I'm not exactly sure how to link this to the correct folder from the assigned issues section. The dashboard had the correct folder assigned at the moment of creation of that worktree issue (C:\_MP_work\atc-backoffice) So I'm not exactly sure where the problem is.

- [x] Even when I have multiple repositories linked to a dashboard, whenever I create an issue and I open the GitHub issue modal, the search scope still is only offering the first GitHub repository. It should offer options to switch to any linked repository for the search.
- [x] The X button to remove the link of the repository to the dashboard in the GitHub repositories modal should be a square.
- [x] After creating a worktree issue which assigns the folder for that issue automatically, we should also open terminal as if we opened it from the Open Terminal button, so in that folder with that color. It should probably wait a bit for the worktree folder to be created. I'm not sure how to ensure that the folder is created. Maybe it can wait for a while with delayed checking and progressively larger delay.
- [x] The duplicate color checking from Color Picker should probably be unique to every dashboard. Each dashboard should track its own used colors. Currently, if I use a color in one dashboard, it becomes unavailable in all other dashboards, which is not ideal. It should only be unavailable in the dashboard where it's already used.

- [x] When archiving an issue that has a worktree assigned, I get a prompt for whether I want to also remove the worktree. When I hit escape, the issue is archived and the worktree is not created. I would like the behavior to change so that hitting escape completely cancels archiving the issue. The issue should only be archived by pressing enter.
Therefore, we have to change the logic of deleting the worktree to the checkbox we have in the delete issue modal. Archiving an issue should be archived immediately on click of the button. If there is no worktree, it should ask "Do you really want to archive the issue?" and have a checkbox also delete or remove the associated worktree. Hitting escape in that modal cancels both deletions, and hitting enter deletes the issue and removes the worktree if the checkbox is checked.
- [x] I am not able to assign worktree later if the worktree creation failed or the setup failed or the link between worktree and the dashboard issue is somehow broken. I need to be able to assign the worktree again, which means to link it to a proper folder as well as to the worktree on GitHub, I guess, or what are all the data necessary for a proper worktree linkage. The user should be able to add worktree later or assign worktree to a specific issue, updating all the necessary properties. We already have a button. That button has a tooltip "Retry worktree setup". Clicking on that button spawns a modal, but I'm not able to click on any of the active worktrees for them to be assigned. I am only able to create a new worktree by placing a new name in the input and pressing Create. User needs to be able to see a list of currently created worktrees and assign the dashboard issue to a worktree, which should update all the necessary properties and states. First, please research what properties are set during work recreation and if we are able to gather them all.
Also, it seems that in that modal the Create and Cancel buttons are reversed. The Create green button should be on the right. Please check that this is the case in other modal as well and report any inconsistencies.

- [x] Icon for rebuild dashboard is the same as for sort - Let's find something suitable for rebuild action
- [x] When a branch is deleted, it displays the number in the branch name twice. 1019-1019-table-pagination
- [x] If a branch is not yet pushed to origin, it is evaluated as deleted. We should Determine the state of a branch based on both local and remote state of that branch.
- [x] PR/Issue/branch badges should be visible even in collapsed state of dashboard issue card. Currently, it's visible only in the expanded state. The badges should also be a bit larger. The badges should be on the left of the worktree button/icon. The order in the header should be:
1. collapse_button
2. title
3. badges
4. worktree button/icon
5. issue_info
6. the rest of the buttons Their text should always match the text of the title and the issue info icon, which means to get the secondary color from the color picker selected for that issue. Also, there's some issue with layouting whenever we decrease the width of the page where the badges are visible. The buttons are getting correctly hidden to the point when only the three dot button is visible, and then there is some undefined state which changes on and off with each pixel change in width of the page. The two states are:
- badges collapsed into icons - this is what we want for not enough space.
- badges expanded to full size with text, some buttons on the right visible, and issue title being truncated - this is some weird not well defined state which should be discarded

- [x] Worktree icon in the issue card says atc-backoffice/main -> 1001-name-of-the-worktree-and-branch. However, the worktree was based on the dev branch in ATC backoffice, which means that there is no base branch detection or it is incorrect. I would like to save the branch name from the time when the worktree is created so that we know to which branch this was related.

- [ ] Priority selection step in issue creation doesn't have a confirmation button, only skip and cancel. Skip doesn't even make sense here as task has to have a priority. Even when no priority is selected, there is a default priority assigned.

## Git Status

- [x] Fetch and display branch status, linked PR status, and GitHub issue status per dashboard issue
- [x] Branch badge with GitHub-style icon: green when active, strikethrough when deleted, gray when unknown
- [x] PR badge with state icon: open (green), draft (gray), merged (purple), closed (red), review-requested (yellow)
- [x] PR badge only shown when a PR exists
- [x] Works for both worktree issues (branch-based lookup) and non-worktree issues (GitHub-link-based lookup)
- [x] PR state accent: vivid card accent (border + gradient overlay) for merged and review-requested states
- [x] Sort by PR state: review-requested → open → draft → merged → closed
- [x] 5-minute cache with manual refresh via dashboard refresh button

### Header Badges (Phase 29)

- [x] Move branch and PR badges from the git-status strip (below header) into the issue header, directly after the worktree icon
- [x] Add GitHub issue state badge in the header alongside branch/PR badges, with appropriate GitHub icons (open = green circle-dot, closed = purple circle-check) and clickable link to the GitHub issue
- [x] Badge text: branch name trimmed to 16 characters; PR shows `#number State`; issue shows `#number State`
- [x] Responsive badge behavior: when insufficient header space, badges collapse to icon-only mode (keeping state color and icon, dropping text)
- [x] PR badge is a clickable link opening the PR URL
- [x] Right-click context menu on PR/branch/issue badges with "Refresh" action to refresh git status for that specific issue
- [x] Remove the git-status strip container (`.tdc-git-status-container`) between header and controls — badges live in header now
- [x] PR state accent strip rendered at bottom border of issue header (not left border)

### Issue Card Simplification (Phase 29)

- [x] Remove embedded GitHub issue/PR cards from dashboard issue cards. Dashboard issue card contains only: header (with badges and buttons), controls (progress + action buttons), task query section
- [x] GitHub issue summary retained only inside the issue note file (via `tasks-dashboard-github` code block)

## Issue Header Styling (Phase 29)

- [x] Info icon color matches header text color (not `--text-muted`). On hover, show slightly gray background (no color change to `--text-normal`)
- [x] Worktree icon uses green color (`var(--tdc-priority-low)` / `#4caf50`) in active state (already implemented, verify)
- [x] Consistent spacing between worktree icon, info icon, and other header action buttons — remove the extra `margin-left: 6px` on info icon so all elements use the header's `gap: 8px`

## Priority Toggle (Phase 29)

- [x] Per-dashboard setting `prioritiesEnabled` (default: `true`). When disabled:
  - Priority left-border strip hidden on issue cards (CSS-driven, priority class still applied)
  - Priority selection step skipped in all issue creation workflows
  - All issues auto-assigned `low` priority
  - "Sort by Priority" option hidden from sort dropdown
  - Issues retain priority in data model (just not displayed or prompted)

## Issue Note Cleanup (Phase 29)

- [x] Remove the standalone GitHub issue markdown link (`[#number - title](url)`) from issue note creation (`generateIssueContent`) and GitHub linking (`updateBodyWithGitHubLink`). The `tasks-dashboard-github` code block remains as the sole GitHub section in issue notes

## Ask before Archiving/Deleting if there are unfinished tasks in the issue (Phase 30)
- [x] Whenever archiving or deleting an issue, if there are any unfinished tasks in that issue, we should ask for confirmation with a warning that there are unfinished tasks. In the case of delete modal, we already have that, and we just want to add red text saying there are x unfinished tasks. In case of archive, we also have the model, but I think we spawn it only when there is a worktree assigned to that issue. Now I would also like to spawn it if there are any unfinished tasks.
- [ ] The active issue file that is created After Add Issue workflow has a markdown checkbox by default, we need to remove this checkbox so that, when this file is not opened at all during the whole lifecycle, it is not marked as having unfinished tasks.

## Check VS code color before spawning it from the plugin
- [x] VS Code color is determined by workspace settings in.vscode/settings.json, specifically the peacock.color property. Whenever VS Code is spawned from this Obsidian plugin, we should check that the value in that Peacock color property matches the color of the issue it is spawned from. If it's spawned from the dashboard, we don't have to do this check because dashboards don't have colors aside. Whenever we are spawning it from an issue, it should do this check. Please see how the setup worktree script does the color change and use that convention to also edit the color or to check the color and edit the color if there is a mismatch to the current issue color.
- [x] Whenever an issue is created automatically via "quick worktree from #[issue number]" button is used, It should use the next color related to the last color that was used for issue creation. Currently, we're using a system where the first available color is used; however, I would like to change that so that the system remembers which color was the last used during any issue creation and selects the next available color from there. The point is that when I create an issue, delete this issue, and create another issue, it has the same color, and I would like the issue colors to rotate more.

## Manual Test cases
- See what happens when we have full GitHub integration for a dashboard with all the worktrees' PRs and branches correctly fetched and displayed, and what happens when we remove the GitHub integration.
   - See if sorting by GitHub stuff is hidden.

## TODO
- [ ] Refactor all large files, do a clean code sweep across the whole project
- [ ] We should keep small components if possible - for example header badges seems like a perfect candidate for standalone component. First, analyze how we should approach componentization in Obsidian Plugin.

- [ ] Consolidate all current phases into 1 epic