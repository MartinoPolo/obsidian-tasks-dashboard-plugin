# Tasks Dashboard Plugin - SPEC

> Full feature spec and history: [epic1/SPEC.md](epics/epic1/SPEC.md)

# Epic 2

## Badge icons per state

- [x] Add distinct SVG icons for each branch state (`active`, `local`, `remote-gone`, `deleted`, `unknown`). Use GitHub Octicons where possible, Lucide as fallback. Each state must be visually distinguishable without reading the tooltip.
- [x] Add distinct SVG icons for each PR state (`open`, `draft`, `merged`, `closed`, `review-requested`) and issue state (`open`, `closed`, `not-planned`). Verify existing icons are correct and add missing ones.
- [x] Verify branch lifecycle detection: `resolveBranchStatus()` should return `remote-gone` (not `local`) when a remote branch was deleted after full PR lifecycle. The badge text/tooltip must say "remote branch deleted" (not "not pushed yet"). If the detection is already correct, fix only the display. Use a distinct color (orange or unused color) for `remote-gone`.
- [x] Verify merged PR detection: `computeAggregatePrState()` should return `merged` for merged PRs. Badge must show purple color + merged icon + "Merged" text, matching GitHub's purple. If detection works, this is display-only. Test with single and multiple PRs.

## Base branch sync detection

- [x] Detect when a branch is behind its base branch using the GitHub compare API (`GET /repos/{owner}/{repo}/compare/{base}...{head}`) to get the `behind_by` count. Run on the same 5-minute cache cycle as other git status checks.
- [x] Add a new branch badge state "behind base" with a unique color and sync icon. Show the `behind_by` count in the badge text/tooltip.
- [x] Detect merge conflicts using the PR's `mergeable` field from the GitHub API. When `mergeable === false`, show a warning badge (alert triangle, amber pill) next to the sync badge.

## Sync action

- [x] Add a sync button inline in the issue header (`HeaderBadges.svelte`), rendered right after the branch badge. Only visible when the branch is behind the base branch. Clicking it opens Windows Terminal at the worktree folder and auto-executes `claude /mp-sync-base`. Show a spinning sync icon while syncing, until the next git status refresh cycle detects the branch is up-to-date.
- [x] Add a "Sync All Un-synced Branches" button in the dashboard toolbar (Group 4: Sync). Disabled/grayed when no branches need syncing. Spawns terminals sequentially — one per unsynced branch — each auto-executing `claude /mp-sync-base` at the respective worktree folder.

## Badge contrast on issue colors

- [x] Badges must adapt to the issue header's background color. Use semi-transparent versions of the semantic badge colors (green/red/purple/etc.) so the issue background bleeds through slightly. Use the issue's text color as the badge border color. This ensures both semantic meaning and sufficient contrast regardless of issue color.

## Color picker

- [x] Rename the "Text color" picker in the issue color dropdown to "Custom color".
- [x] Add a letter "A" preview in the custom color picker input area, rendered in the currently selected custom color, so the user sees how the text would look against the issue background before confirming.

## Closed issue appearance

- [x] When a dashboard issue has a closed/merged PR + remote branch deleted + GitHub issue closed, apply a CSS overlay: `filter: grayscale(0.8) opacity(0.7)`. Preserve the stored color so reopening restores the original appearance. Do not modify the color picker or stored value.

## Issue info panel

- [x] Remove Dashboard ID and Issue ID from the info panel content.
- [x] Restructure the info panel with visually distinct section headers. Use this hierarchy:
  ```
  ## Issue
  Name, Priority

  ## GitHub
  Issue link, PR link(s)

  ## Branch
  Base branch, Local branch, Remote branch, Status

  ## Worktree
  Folder path, State
  ```
  List each branch (base, local, remote) exactly once — do not duplicate across sections.

## Prune worktrees

- [x] Add a "Prune Closed Worktrees" button in the dashboard toolbar (Group 4: Sync, next to Sync All). Clicking it: (1) automatically detects issues with closed/merged PR + deleted remote branch + closed GitHub issue, (2) shows a confirmation modal listing all worktrees and their associated issues to be removed, (3) on confirm, calls `remove-worktree.sh --skip-confirmation name1 name2 ...` once with all branch names, (4) archives all associated dashboard issues after successful removal.
- [x] Modify `remove-worktree.sh` to accept multiple branch arguments and loop internally (it already does — verify and ensure robust behavior with the `--skip-confirmation` flag for bulk operations).

## Dashboard toolbar

- [x] Reorder dashboard toolbar buttons with visual grouping (gaps between groups). Fixed default order:
  - Group 1 (Create): Add Issue, Add Worktree Issue, Import Note
  - Group 2 (View): Collapse All, Expand All, Sort
  - Group 3 (External): Open Folder, Open Terminal, Open VS Code, GitHub
  - Group 4 (Sync): Sync All, Prune Worktrees
  - Group 5 (Maintain): Refresh, Rebuild
  - Group 6 (Config): Settings (always rightmost)
- [x] Import Note and Rebuild are rarely used — hide them first when space is limited. Use multi-line wrapping instead of a three-dots overflow menu. Settings must always remain visible and rightmost.

## Issue creation workflow

- [x] When the GitHub search in step 1 returns no results and the user presses Enter, auto-advance to step 2 (name input) with the search text pre-filled as the issue name. Show a subtle notice: "No matching GitHub issue — creating standalone."

## Worktree safety

- [x] When the linked GitHub repository does not match the linked folder (e.g., folder points to repo A but GitHub link points to repo B), disable worktree creation buttons with a tooltip: "Repository not linked to dashboard folder." Multi-folder support deferred.
- [x] When a dashboard issue is deleted but the GitHub issue was previously assigned, the quick-add/assign buttons must reappear in the assigned issues section. However, the button should be styled in orange (not the default color) to indicate this issue was previously assigned and its dashboard issue was deleted. This gives visual history while allowing re-assignment.

## TODO

- [x] Refactor large files; clean code sweep across the project
- [x] Componentize standalone UI units (e.g., header badges) into isolated modules; analyze Obsidian Plugin componentization approach

## BUGS
- [x] After worktree creation with quick add worktree, the branch badge says branch deleted.
- [x] Color picker has custom color picker section. It should have letter A inside the color preview circle. The letter is next to the color preview circle and has incorrect colot. It should be black or white depending on the contrast with the background color. However it currently always have the same color as the background color.
- [-] The visibility of Git batch icons is very poor, so we should change the icon color to match the text color of the header so that there's always enough contrast with the background of the issue header. We should make the background of the badge more vivid. Currently, I think it's set with some opacity. We should definitely make it less transparent and more colorful, because now the background will be the only thing carrying the color. The text of the badge, the border of the badge, and the icon of the badge will now all share the same color, which will be black for light backgrounds and white for dark backgrounds. Find me the value which sets the transparency, and I'll play with it manually for a while.

- [ ] Add one more row at the top of color picker with vivid colors.
- [ ] We now have a sync branch badge and button. The buttons spawns a claude code terminal with /mp-sync skill. This is good but we should improve it. First let's run the claude code with "claude --dangerously-skip-permissions" command instead "claude". Also, it goes to plan mode by default, and I would like it to go to accept edits or bypass permissions mode. This should also be set programmatically. Please see the Claude Code CLI documentation about this. Otherwise, the syncing always asks me, and I would like it to be automatic.
Let's remove the duplication in the badge and button for syncing. The badge itself should just be a clickable button similar to GitHub issue and GitHub PR badges.
If there are conflicts, we correctly detect this already; however, we create a separate badge for conflicts. Let's just put the warning icon next to the sync icon in the sync badge and just enrich the tool tip to say something like "sync branch and resolve conflicts".