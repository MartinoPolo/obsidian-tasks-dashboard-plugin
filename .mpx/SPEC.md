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


## Code Quality

- [x] Minimal whitespace
- [x] TypeScript with proper types
- [x] Modular architecture with separate services

## Requirements Batch (2026-03-04)

### Page Focus

- [x] Restrict smart cursor repositioning (jump to end of `## Tasks`) to note-entry events only; when the user directly clicks inside an already-open issue note, preserve the clicked cursor position and do not re-run auto-focus repositioning.


### Event Propagation

- [x] Consume mouse back-button navigation events inside multi-step issue creation modals so handled back actions (for example step 2 → step 1) never propagate to the dashboard or Obsidian-level page navigation.
- [x] While typing in GitHub search input fields (especially issue-creation linking step), consume Backspace so text editing does not trigger parent/browser-like back navigation.

### Worktrees

- [x] After worktree issue creation, assign the expected worktree folder automatically when setup succeeds, using the same effective assigned-folder behavior as manual folder assignment.
- [ ] When creating a child worktree issue from an existing worktree issue card, derive base context from the source issue’s stored worktree/base-repository metadata (not from presence of an in-folder `.git` directory), and keep creation functional even when `.git` is absent in the worktree folder.
- [ ] Persist explicit worktree branch metadata on the issue (including in issue file properties) and expose branch/worktree status details through an info affordance (icon with hover tooltip or dropdown).
- [x] Add a new issue info affordance that surfaces consolidated metadata: dashboard issue identity, assigned folder, linked GitHub issue/PR/repository, and current worktree details.
- [x] For worktree issues, GitHub issue/PR linking search scope must default to and prioritize the base repository of the source issue/folder from which the worktree was created, even if the worktree folder path differs.
- [ ] Render a worktree status icon in issue headers: green when worktree is active; red when setup failed, orange when worktree setup is pending or in-progress, gray when branch was deleted/merged
- [ ] Introduce worktree setup verification state machine: pending (orange tree) while polling for expected folder existence every 1 second for up to 10 seconds, success state only after folder appears and assignment is activated, and failure state (red tree) after timeout.
- [ ] If automatic worktree setup fails, expose a retry-capable `Add worktree later` header action (tree icon) as the first header action, hidden by default and auto-shown only in failed state.
- [ ] Add an option to refresh the state to check again what the state of the worktree is. It should include checking on the branch state so that we can refresh the knowledge about worktree.
- [ ] "Add worktree later" should not be a button with the whole text; it should be another header action. Use the same icon as we are using for displaying worktree status.
- [ ] Clicking the "Add Worktree Later" button should offer a list of currently available worktrees or a button to create a worktree from this issue name, with an auto-suggested name for the worktree and an input which is editable by the user before clicking the confirm button. It should spawn a modal with all worktrees currently active in the current repository, with an option to switch to other repositories. Do we have enough information about where the repository should be fetched from and where they live on our disk?
- [ ]
The worktree icon and info icon in the header of the issue card should be swapped. worktree icon on the left, info on the right. Whenever there's an assigned worktree, it should display the location of the worktree in relation to what it is based on. It should show the base branch, which is most usually dev. It should show which folder or repository it is based on, and it should show the name of the branch it is currently linked to or which is checked out in this worktree. Are we able to get and show all of this? I would like to see something like atc-common/dev -> 986-out-worktree-branch for example. atc-common is the folder where the repo is located and on the dev branch we're basing the worktree branch. It will also be used to be merged into. Could you please help me with the logic of fetching and keeping all these data and how to update them if any of this changes? There are multiple scenarios. The most common one is that there is a folder with a Git repository and the dev branch from which the worktree is created, and the name of the worktree and name of the branch is the same. There is also a scenario that we are basing the worktree on another worktree, so then we should definitely list the base branch as well.
- [ ] There is also an option to have multiple worktree base folders for issues in a dashboard. In that case, I would like to be able to sort by worktree base so that I see all the worktrees from, for example, ATC-common folder as one project and a separate section for key trader, which is a second project. Maybe just sorting by the base folder should be fine for now.
- [ ] See where we are creating worktrees in the C:/_MP_WORK folder. See the setup-worktree.sh script for details. This should probably lead to the folder detection logic.
- [ ] Maybe we will need a dashboard refresh button which checks that all the folders exist, that all the repositories exist, and refreshes the state of worktrees and branches and GitHub issues so that we can correctly display the status.
    - [ ] It could also update issue status and display it somewhere in the issue card header. It could even detect linked PRs and automatically link them to the issue cards and show their status. And also show the branch status including base branch sync
- [ ] Worktree status icon and add worktree later should be merged into one with appropriate behavior
    - When worktree is active, it should just be an icon with a green tree.
    - When worktree setup failed or was never done, it should be a clickable button which triggers assignment or creation of a worktree.


### GitHub Integration

- [x] Fix repository-scoped GitHub search so `My repositories` reliably returns issue/PR results instead of empty results when authentication and scopes are valid.
- [x] Remove `All repositories` search mode: result set must be relevant to entered query terms/identifiers and must not prefer unrelated repositories; if relevance quality cannot meet this requirement, remove this scope.
- [x] Sort offered GitHub issues/PRs by recency with assignment-aware ranking (assigned-to-me first), while preserving fast incremental text/number search behavior.
- [x] Add optional foldable `Assigned Issues` dashboard section for dashboards with linked repositories, listing assigned GitHub issues and providing one-click conversion into dashboard issues.
- [x] Investigate how these assigned issues are refreshed, and also there's some improper styling.
- [ ] Assigned issues that already have a dashboard issue linked should go at the bottom of the assigned issue list. They should be separated from the unlinked assigned issues with a divider and a label "In dashboard" or something like that.

#### Bugs
- [x] The search and repository linking works correctly now; however, there are still some errors showing that the GitHub authentication failed. Also, the search works a bit weird, that whenever I search for issue 418, it finds it, but when for #418, it doesn't. When I search for 41, it also doesn't find it and when I search for 4, it finds issues 360 and 363 (Which might have some number in their description or something. I'm not sure. Please describe how the GitHub search works. )
- [x] Assigned issues section -  The buttons to convert and worktree are styled improperly. They are below each other and below the links to those issues, and the worktree button is always disabled
### Dashboard

- [x] Ensure dashboard contains exactly one `How to Use This Dashboard` section instance (deduplicate constants/rendering paths and prevent duplicates after rebuild).
- [x] Update `How to Use This Dashboard` content to reflect new controls and explicitly state the section can be freely deleted.
- [x] Persist per-issue collapsed/expanded state reliably across renders/reloads for all issues.
- [x] Ensure `Collapse all` targets all dashboard issues (not only currently visible/rendered subset).
- [x] Add an `Assigned Issues` section that auto-fetches issues assigned to current user for the dashboard-linked repository and provides one-click worktree creation actions. Two icon-only buttons per row: plus icon (add issue → step 2 with preselected GitHub issue) and worktree icon (quick worktree with medium priority and next available color, user edits name only).
- [x] The Active issues section should be after dashboard global action buttons
- [x] Add a dashboard info section with general info - linked folder, linked Github repository
- [x] Issues section should have a loading state so that I see that the request is pending.
- [ ] Open Dashboard Settings button should have an icon with the settings icon, not the folder icon. It should be some sort of wheel icon that is common for settings.
- [ ] All the dashboard buttons should have icons, not text. Tooltip should be enough to aid what the button does.
- [ ] Buttons should go next to the dashboard info section (where assigned folder and repo is displayed). Buttons should be in a separate container which wraps to second line if there's not enough space next to the dashboard info. Also it is flex-wrap which means buttons can move to the next line if there's not enough space, but they should try to stay in the same line as the dashboard info section. The dashboard info section should be on the left, and the buttons should be on the right of it aligned to the right if possible.
- [ ] Assigned issues should load 10 issues for each repo by default but should offer a load more button at the end of the section if there are more issues to load. It should indicate how many issues out of how many total assigned issues are loaded currently. something like (10/17 loaded) next to the repo title in assigned issues section.

### Issue Creation Workflow

- [x] Redefine step order to: Step 1 GitHub link selection (old step 4 behavior), Step 2 issue name entry (pre-filled from selected GitHub issue title/number when selected, empty when skipped), then remaining creation steps.
- [x] Conditionally include Step 1 GitHub link selection only when GitHub integration is available for the active dashboard/context.
- [x] In GitHub-link step, support live repository-scoped search while typing and number-aware lookup (typing an issue number should surface matching issue in repository when present).
- [x] When GitHub-link search input is empty, offer latest issues as default suggestions; support arrow-key navigation and Enter to select highlighted result.
- [x] After selecting a GitHub issue in Step 1, prefill Step 2 name using `{number} {first-four-words-of-title}` format (no `#`) and allow manual edits before confirmation.
- [x] In Step 1 (GitHub link selection), do not render a separate Skip button; Enter performs skip when there is no selected suggestion and no pasted URL.
- [x] In Step 1, clicking a result or pressing Enter on the highlighted result confirms that selection and proceeds directly to Step 2.
- [x] In Step 2 with prefilled name, place the cursor at the end of the text and do not auto-select the full input value.
- [x] Add conditional worktree yes/no step after name step when worktree creation is available under existing `Add WorkTree Issue` eligibility conditions.
- [x] Worktree yes/no step must use two explicit choices with visual semantics: Yes with green tree icon and No with red styling.
- [x] Remove dashboard-level `Add WorkTree Issue` button and merge capability into `Add Issue` flow via the conditional worktree step.
- [x] Rename per-issue card action from `Add WorkTree Issue` to `Add Issue` with plus icon, while keeping current enable/disable gating semantics tied to worktree feasibility from that issue context.
- [x] For automatically derived worktree/branch names, normalize from resulting issue name by lowercasing, replacing spaces with dashes, retaining only git-branch-safe characters, and ensuring issue number prefix is included when available.
- [x] Preselect `Low` as default in priority selection step.
- [x] Clicking on a priority should work the same as pressing Enter in the Add Issue workflow. The same when we are editing priority later by clicking on the Change Priority button in the Issue card. Clicking a specific priority should immediately confirm it. We shouldn't need to press Enter or click on the Confirm button. Clicking the priority should be enough.

### Issue Card

- [x] On narrow widths, stop hover-only reveal of hidden header buttons; expose hidden actions only via 3-dots overflow for consistent discoverability.
- [x] Minimum title width in issue header should be 100px.
- [x] The three dots button should always be visible.
- [x] Remove duplicate native/system tooltips on issue-card action buttons and keep only the custom tooltip experience.
- [x] The title of the card should be very light gray in dark mode and very dark gray in light mode, instead of the current blue link color. And for sit, there are probably some default styles for this kind of link, and they are overriding our styling. We need to set it properly.

#### Bugs
- [x] There is still different behavior of the buttons when the user hovers over the header on a narrow screen. The buttons should dynamically disappear when the screen is being narrowed, and they should be visible under the three dots always. The three dots button should always be visible, and the others should be visible only if there is enough space; otherwise, they should be under the three dots button. There should be no change in positions when hovering over the header.
- [x] There is still duplicite tooltip in worktree status icon on hover.  Only keep our beautiful tooltip with status active, pending, to delete, or error?
- [x] Some buttons in the GitHub link integration in the issue card on the dashboard currently don't have icons, or the icons are not visible. These icons are refresh GitHub data and remove GitHub link. I will thoroughly explain what these icons should do and what GitHub data they refresh. Do they refresh the issue data or all GitHub data, for example worktree, etc.?

### Layout Settings

- [x] Allow layout-settings dropdown menus to overflow viewport bounds with scrollbars when needed instead of clipping content.
- [x] Style `Delete issue` action text as red in issue-card 3-dots dropdown.
- [x] Style `Archive` action text as orange in issue-card 3-dots dropdown.

### Colors

- [x] Make issue color palettes theme-aware with explicit light/dark variants so selected colors remain visually balanced and readable in both themes.
- [x] Track globally used issue colors across the vault and disable already-assigned colors in creation color-picker step.
- [x] Auto-preselect the next available unused color by default in creation color-picker step.
- [x] Add Option to release all the colors (in plugin settings)
- [x] Expand color palette to grouped multi-column shades (30 colors), 6x5 layout, and adapt color-picker grid layout accordingly. There should be six main colours, one for each column, and the columns should just be different shades of the same colour, starting with the darker variants in dark mode and going down in the table. They should be lighter. This way, the first row will be the most used colors. Similarly, apply for light mode the light mode colors. At the top should be the most used ones, so something like:
- light blue
- light red
- light orange
- light purple
- light brown
-  light green Pick the best contrasting colors.
- [x] Release previously reserved color when an issue is deleted or archived so it becomes selectable again. Also release color when a color is changed so the old color becomes available and the new color is reserved.
- [x] Use theme-appropriate title text color for issue-card links/titles (light text in dark mode, dark text in light mode) instead of generic link color styling.
- [x] Reposition header color picker to anchor as dropdown from issue header color button (preferred) or centered fallback; avoid off-screen corner placement.
- [x] Renaming requirement: change color-action tooltip/title from `Header color` to `Issue color`.
- [x] When changing issue color from the issue-card color action, update color-allocation tracking so old color is released and new color is reserved correctly.



### Tooling

- [x] Add and configure `eslint-plugin-obsidianmd` so local linting includes Obsidian pre-publish style/check parity where applicable.

### Other


### Bug list:
- [x] The automatic issue name creation from the GitHub issue name should remove the hash # sign. It should also only list the first four words from the issue title The user can always change the name themselves.
- [x] Disabled colors in the color picker should be gray.
- [x] Colors in the color picker for dark mode should be darker than the ones for light mode. We are choosing accent colors for background, so that should be darker in dark mode and lighter in light mode. You probably have switched the colors.
- [x] The color of the title of the issue card doesn't seem to be changed; it still has the same ink color. It should be whiter in dark mode and darker in light mode.
- [x] There is a new icon with an eye which triggers issue info; however, that's supposed to be opening on hover and not in the system notification, but it should spawn its own tooltip. It should spawn the tooltip instantly and not wait. It should be a multi-line tooltip containing all the information it currently has, and it should not be in a button style. It should have an info icon, not an info icon, and it should go right after the text of the title.
- [x] Remove the skip button from the first step of add issue workflow. There already is the enter button which has skip functionality if user haven't interacted with search field or results
- [x] Clicking an issue directly in the search results should confirm that issue and go to the next step. The same should happen when an issue is navigated to with keys and Enter is pressed. This should both directly confirm the issue and go to the next step directly.
- [x] When the user goes to step two of issue creation (aka the name), whenever the user already selected a GitHub issue linked in the first step, the name in the input field in the second step is selected. This should not be the case. The cursor should be in that input field at the end of the currently pre-selected name. It should not be selected.
- [x] In the third step, choosing Priority, it seems that both low and medium are pre-selected. We probably have two different mechanisms for the default selected option, and it seems to be both low and medium. So keep the default too low for simplicity.
- [x] Deleting an issue that wasn't created in a worktree currently spawns the remove-worktree script, even if there is no checkbox to also remove the worktree. Whenever there is no worktree assigned to an issue, we should not attempt to remove the work
- [x] I don't see any tree icons in worktrees as I requested.
- [x] I created an issue with Git worktree, and the worktree setup script went correctly. The worktree was created; everything went fine, but the issue in the dashboard indicates that worktree setup failed. Please check how we are detecting if the setup was correct and figure out how to fix it or a completely better solution on how to detect worktree setup correct completion.
- [x] Whenever I go from the dashboard to one of the issues, I have them opened side by side so the issue file is not opened again; it's just focused. The cursor jumps at the start of the task section or at the end of the task section. This is an issue because when I directly click into this already opened issue file, the cursor jumps to a different position. Give it one more attempt and only jump the cursor if the file was just opened, not just focused or switched to. Or we're gonna remove this smart cursor jumping completely.
