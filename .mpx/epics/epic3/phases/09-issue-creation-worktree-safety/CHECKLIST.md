# Phase 9: Issue Creation Workflow Fix + Worktree Safety

**Status:** Complete
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

- [x] Auto-advance to step 2 when GitHub search returns no results and user presses Enter
      Already working via `enterSkipsWithoutSelection: true` in `openIssueCreationModal`. Search text pre-filled as issue name via callback.

- [x] Show subtle notice when creating standalone issue (no GitHub match)
      Added Notice in `issue-creation-modal.ts` callback when url and metadata are undefined and searchQuery is present.

### Worktree Safety

- [x] Detect repository-folder mismatch and disable worktree creation
      Added `getGitRemoteUrl` to platform service, `doesRemoteMatchLinkedRepos` utility. Both `SortControls.svelte` and `AssignedIssuesSection.svelte` detect mismatch and disable worktree buttons with tooltip.

- [x] Re-show quick-add buttons with orange styling for previously-assigned deleted issues
      Added `deletedIssueGitHubUrls` to settings, recording on delete (filtered by `isGitHubWebUrl`), orange `tdc-btn-previously-assigned` CSS class, cleanup on re-add.

### Completion Criteria

- [x] Pressing Enter in step 1 with no search results advances to step 2 with text pre-filled
- [x] "No matching GitHub issue -- creating standalone" notice appears on auto-advance
- [x] Worktree creation buttons are disabled when repo-folder mismatch detected
- [x] Disabled buttons show tooltip: "Repository not linked to dashboard folder."
- [x] Previously-assigned issues show orange quick-add buttons after dashboard issue deletion

---

Progress: 4/4 tasks complete

## Decisions

- Auto-advance already worked via existing `enterSkipsWithoutSelection: true` config — no code change needed for that part.
- Used `$effect` + `$state` for git remote URL lookup to avoid blocking the render cycle with `spawnSync` in `$derived`.
- Extracted shared helpers: `doesRemoteMatchLinkedRepos`, `recordDeletedIssueGitHubUrls`, `removeDeletedIssueGitHubUrl`.
- URL recording happens after `deleteIssue` succeeds to prevent orphaned entries on failure.
- URLs filtered with `isGitHubWebUrl` before recording to prevent storage of non-web URLs.

## Blockers

None
