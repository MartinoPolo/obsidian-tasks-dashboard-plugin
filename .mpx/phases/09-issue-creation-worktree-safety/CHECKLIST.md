# Phase 9: Issue Creation Workflow Fix + Worktree Safety

**Status:** Not Started
**Dependencies:** None

## Objective

Fix the issue creation flow when GitHub search returns no results and add safety checks for repository-folder mismatches in worktree creation.

## Scope

- GitHub search empty-result auto-advance to step 2
- Search text pre-filled as issue name
- Subtle notice for standalone issue creation
- Repository-folder mismatch detection
- Disabled worktree buttons with tooltip when mismatch detected
- Re-show quick-add buttons (orange) for previously-assigned issues whose dashboard issue was deleted

## Out of Scope

- Multi-folder support (explicitly deferred)
- Changes to the GitHub search modal itself
- OAuth or API changes

---

## Tasks

### Issue Creation Workflow

- [ ] Auto-advance to step 2 when GitHub search returns no results and user presses Enter
      In the issue creation modal (`issue-creation-modal.ts` and `IssueCreationWizard.svelte`), the step 1 is a GitHub issue search. When the search returns zero results and the user presses Enter (submits), auto-advance to step 2 (name input). Pre-fill the name input with the search text the user typed. Currently, pressing Enter with no results likely does nothing or stays on step 1. Modify the Enter keydown handler or search-submit logic to detect the empty-result case and transition to step 2.

- [ ] Show subtle notice when creating standalone issue (no GitHub match)
      When auto-advancing from empty search results, display a subtle notice: "No matching GitHub issue -- creating standalone." Use Obsidian's `Notice` API with a short duration (3-4 seconds). The notice should appear immediately on auto-advance, not after issue creation completes.

### Worktree Safety

- [ ] Detect repository-folder mismatch and disable worktree creation
      When the dashboard's linked GitHub repository does not match the linked project folder's git remote (e.g., folder points to repo A but GitHub link points to repo B), disable all worktree creation buttons. In `SortControls.svelte` (toolbar) and `AssignedIssuesSection.svelte` (quick-add), check if the project folder's git remote origin matches any of the linked repositories. Use `platformService.getGitRemoteUrl()` or equivalent to get the folder's remote. If mismatch: disable the "Add Worktree Issue" button with a tooltip: "Repository not linked to dashboard folder." Multi-folder support is explicitly deferred.

- [ ] Re-show quick-add buttons with orange styling for previously-assigned deleted issues
      When a dashboard issue is deleted but the GitHub issue was previously assigned to it, the quick-add/assign buttons in `AssignedIssuesSection.svelte` must reappear. Style the button in orange (not the default color) to indicate this issue was previously assigned and its dashboard issue was deleted. This requires tracking "previously assigned" state — check if the GitHub issue ID exists in any archived/deleted issue records or settings. The orange color gives visual history while allowing re-assignment.

### Completion Criteria

- [ ] Pressing Enter in step 1 with no search results advances to step 2 with text pre-filled
- [ ] "No matching GitHub issue -- creating standalone" notice appears on auto-advance
- [ ] Worktree creation buttons are disabled when repo-folder mismatch detected
- [ ] Disabled buttons show tooltip: "Repository not linked to dashboard folder."
- [ ] Previously-assigned issues show orange quick-add buttons after dashboard issue deletion

---

Progress: 0/4 tasks complete

## Decisions

[Decisions made during execution, with reasoning]

## Blockers

None
