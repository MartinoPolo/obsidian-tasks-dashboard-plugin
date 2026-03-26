# Phase 14: Cleanup

**Status:** Complete
**Dependencies:** Phase 11, 12, 13 (all Epic 3 feature phases)

## Objective

Remove dead code paths left over from the GitHub API-based behind-count and conflict detection. Update sync constants to reflect their new role as Claude Code fallback-only.

## Scope

- Remove `compareBranches` usage from `git-status-service.ts`
- Remove dead code in `GitHubService.ts` related to branch comparison
- Update `sync-constants.ts` to clarify fallback-only role

## Out of Scope

- Removing `getPullRequestMergeable` from GitHubService if still used elsewhere
- Removing any GitHubService methods still needed by other features

---

## Tasks

### Dead Code Removal

- [x] Remove `compareBranches` call from `git-status-service.ts`
      Already replaced by Phase 11's local detection. Verified removed.

- [x] Remove `compareBranches` from `GitHubService.ts` and its types
      Removed method from service factory, `BranchCompareResult` from types, `GitHubCompareApiResponse` from API types, method from `GitHubServiceInstance` interface.

- [x] Remove `getPullRequestMergeable` usage from git status flow
      Already replaced by Phase 11. No other callers found. Removed from `GitHubService.ts` and `GitHubServiceInstance` interface.

### Constants Update

- [x] Update `sync-constants.ts` with clarifying comment
      Added comment: "Fallback for dirty worktrees and conflict cases — used when Claude Code terminal is spawned because in-plugin sync cannot handle the situation."

### Verification

- [x] Verify no dead imports or references remain
      Searched codebase for `compareBranches`, `BranchCompareResult`, `GitHubCompareApiResponse`, `getPullRequestMergeable` — zero references in source files. `pnpm lint` and `pnpm build` pass.

### Completion Criteria

- [x] `compareBranches` fully removed from GitHubService and git-status-service
- [x] `getPullRequestMergeable` removed — no other callers exist
- [x] `sync-constants.ts` clarified as fallback-only
- [x] `pnpm lint` passes with no unused import errors
- [x] Build succeeds (`pnpm build`)

---

Progress: 5/5 tasks complete

## Decisions

- Removed `OPEN_PR_STATES` from git-status-service.ts — was only used by the old PR-based mergeable check.
- Removed both `compareBranches` and `getPullRequestMergeable` since neither had callers after Phase 11's replacement.

## Blockers

None
