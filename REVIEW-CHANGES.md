# Actionable Checklist

## Critical
- [ ] None.

## Important
- [ ] **Unhandled async failure in worktree setup poller**
  **Location:** `src/issues/IssueManager.ts` (runWorktreeSetup polling loop, around lines 839-878)
  **Why:** The fire-and-forget polling IIFE has no `try/catch`. If an issue is renamed/deleted/moved while polling, metadata reads can throw and create unhandled promise rejections in runtime.
  **Concrete fix:** Wrap the poller body in `try/catch`; treat missing issue/file as terminal-cancel and exit quietly (or mark failed only if issue still exists).

- [ ] **No in-flight guard for retry worktree setup**
  **Location:** `src/issues/IssueManager.ts` (`retryWorktreeSetup` / `runWorktreeSetup`, around lines 812-906), `src/dashboard/DashboardRenderer.ts` (retry button click, around lines 196-205)
  **Why:** Repeated clicks can launch multiple worktree setup scripts and concurrent pollers for the same issue, causing racey metadata transitions (`pending`/`active`/`failed`) and duplicate external process launches.
  **Concrete fix:** Add a per-issue lock/map keyed by `dashboardId:issueId`; ignore/debounce retries while one run is active, and clear lock in `finally`.

- [ ] **Synchronous git checks in render path can block UI**
  **Location:** `src/dashboard/DashboardRenderer.ts` (header render branch status check, around lines 95-102), `src/utils/platform.ts` (`isGitBranchMissing` via `spawnSync`, around lines 160-197 and 301-333)
  **Why:** Rendering worktree issues can trigger multiple synchronous git commands on the UI thread, risking noticeable dashboard jank on larger datasets.
  **Concrete fix:** Move branch-missing computation off the render path (cache in issue metadata, update during lifecycle/rebuild, or perform async check and refresh when complete).

# Nice-to-Have

## Minor (optional)
- [ ] **Color preview can remain after dismissing picker without commit**
  **Location:** `src/dashboard/dashboard-issue-actions.ts` (`openIssueColorDropdown`, around lines 112-220)
  **Why:** Live `input` preview applies styles immediately, but closing via `Escape`/outside click does not restore the original persisted color, so unsaved preview may linger until next refresh.
  **Concrete fix:** Track `originalColor` + `didCommit`; on close without commit, call `applyIssueSurfaceStyles(container, originalColor)` before removing dropdown.

- [ ] **Legacy modal classes remain but are no longer reachable from active flow**
  **Location:** `src/modals/issue-creation-modal.ts` (`_GitHubLinkTypeModal` around line 922, `_GithubPromptModal` around line 1580)
  **Why:** These paths appear deprecated in the new GitHub-first flow and increase maintenance surface.
  **Concrete fix:** Remove dead classes and related unused wiring, or re-integrate them explicitly if still intended.