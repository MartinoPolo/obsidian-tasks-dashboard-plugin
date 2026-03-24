# Phase 2: GitHub API Enhancements

**Status:** Not Started
**Dependencies:** None

## Objective

Add GitHub compare API integration and PR mergeable field support to power the sync detection and conflict warning features.

## Scope

- GitHub compare API (`GET /repos/{owner}/{repo}/compare/{base}...{head}`) for `behind_by` count
- PR `mergeable` field from GitHub API
- 5-minute cache cycle integration (same as existing git status checks)
- New data types for behind/mergeable state

## Out of Scope

- Sync button UI (Phase 03)
- Badge rendering for "behind base" (Phase 03)
- Conflict resolution UI

---

## Tasks

### API Layer

- [ ] Add `compareBranches()` method to `GitHubService`
      Call `GET /repos/{owner}/{repo}/compare/{base}...{head}`. Return `{ behindBy: number, aheadBy: number }`. Handle 404 (branch not found) gracefully by returning `undefined`. Add response type `GitHubCompareApiResponse` to `github-api-types.ts` with at minimum `behind_by`, `ahead_by`, `status` fields.

- [ ] Add `getPullRequestMergeable()` method to `GitHubService`
      Call `GET /repos/{owner}/{repo}/pulls/{pull_number}` and extract the `mergeable` field. The `mergeable` field is `boolean | null` (null means GitHub is still computing). Return `{ mergeable: boolean | null }`. Add the `mergeable` field to `GitHubPullRequestApiResponse` type if not present. May reuse existing PR fetch if the field is already returned in the current PR endpoints.

### Data Layer

- [ ] Extend `IssueGitStatus` with behind-base and mergeable data
      Add fields to `git-status-types.ts`: `behindBaseCount: number | undefined` (undefined when not a worktree issue or API unavailable), `mergeConflict: boolean | undefined` (true when `mergeable === false`). These fields populate during `getIssueGitStatus()` alongside existing branch/PR fetches.

- [ ] Integrate compare + mergeable into `getIssueGitStatus()` flow
      In `git-status-service.ts`, after discovering PRs and resolving branch status: (1) if `baseBranch` and `branchName` are both defined and the branch is `active`, call `compareBranches(owner, repo, baseBranch, branchName)` to get `behindBy`; (2) if there are open PRs, call `getPullRequestMergeable()` for the highest-priority open PR to get `mergeable`. Both use the same 5-minute cache TTL (`GIT_STATUS_CACHE_TTL_MS`). Store results in `IssueGitStatus`.

### Completion Criteria

- [ ] `compareBranches()` returns correct `behindBy` count for branches that are behind
- [ ] `getPullRequestMergeable()` returns the `mergeable` field correctly
- [ ] `IssueGitStatus` includes `behindBaseCount` and `mergeConflict` after status fetch
- [ ] API errors are handled gracefully (fields remain `undefined` on failure)

---

Progress: 0/4 tasks complete

## Decisions

[Decisions made during execution, with reasoning]

## Blockers

None
