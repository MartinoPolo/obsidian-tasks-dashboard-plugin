# Phase 11: Local Git Detection Infrastructure

**Status:** Complete
**Dependencies:** None (Epic 2 complete)

## Objective

Replace GitHub API-based behind-count and conflict detection with local git operations. Add an async spawn wrapper for long-running git commands (fetch, merge, push) to avoid freezing the Obsidian UI. Wire local detection into the dashboard refresh lifecycle with fetch deduplication across worktrees sharing the same repo.

## Scope

- Async git command runner (`runGitCommandAsync`)
- Local behind-count via `git rev-list`
- Local conflict detection via `git merge-tree`
- Fetch deduplication (one `git fetch origin` per unique repo root)
- Dashboard refresh integration

## Out of Scope

- Sync button click flow (Phase 12)
- Sync All orchestration (Phase 13)
- Dead code removal (Phase 14)

---

## Tasks

### Async Spawn Wrapper

- [x] Add `runGitCommandAsync(folderPath, args)` to `process-spawn.ts`
      Return `Promise<{ status: number; stdout: string; stderr: string }>`. Use `child_process.spawn` (not `spawnSync`) with stdout/stderr collection via stream listeners. Reject on spawn error; resolve on `close` event. Pass `{ shell: false, cwd: folderPath, windowsHide: true }` options. Keep existing sync functions (`runGitCommandOutput`, `runGitCommandStatus`) unchanged for instant local queries.

- [x] Export `runGitCommandAsync` from platform barrel and PlatformService
      Add to `platform/index.ts` exports and `PlatformService` interface if the service layer needs it via dependency injection.

### Fetch Deduplication

- [x] Add repo-root resolution from worktree folder path
      Given a worktree folder, resolve the actual repo root via `runGitCommandOutput(folder, ['rev-parse', '--show-toplevel'])`. Multiple worktree issues may share the same repo root; `git fetch origin` must run only once per root. Cache the folder-to-root mapping for the refresh cycle.

- [x] Add `createFetchCoordinator()` factory in `git-status/`
      Returns `{ fetchOnce(repoRoot: string): Promise<void> }`. Tracks in-flight fetch promises per repo root so concurrent calls coalesce into a single `git fetch origin` invocation. Clear tracking after each fetch completes. Prevents duplicate fetches when multiple issues trigger status checks simultaneously.

### Local Behind-Count Detection

- [x] Add `getBehindCount(worktreeFolder, baseBranch)` helper
      Runs sync `runGitCommandOutput(worktreeFolder, ['rev-list', '--count', 'HEAD..origin/<baseBranch>'])`. Parse stdout as integer. Return `0` when branch is up-to-date. Return `undefined` on parse failure or non-zero exit.

- [x] Integrate local behind-count into `git-status-service.ts`
      In `getIssueGitStatus`, replace the `comparePromise` block that calls `githubService.compareBranches` with: (1) resolve repo root from `originFolder`, (2) `fetchCoordinator.fetchOnce(repoRoot)` (async, deduplicated), (3) `getBehindCount(originFolder, baseBranch)` (sync, instant). Populate `behindBaseCount` from local result. The base branch is already available via `params.baseBranch` (stored per issue as `worktree_base_branch`).

### Local Conflict Detection

- [x] Add `detectMergeConflicts(worktreeFolder, baseBranch)` helper
      Runs `runGitCommandAsync(worktreeFolder, ['merge-tree', '--write-tree', 'HEAD', 'origin/<baseBranch>'])`. Requires Git 2.38+. Exit code 0 = no conflicts, exit code 1 = conflicts. Return `boolean`. On other errors (e.g., missing refs), return `undefined`.

- [x] Replace GitHub API `getPullRequestMergeable` with local `detectMergeConflicts`
      In `git-status-service.ts`, replace the `mergeablePromise` block that calls `githubService.getPullRequestMergeable` with a call to `detectMergeConflicts`. Run for issues with active branches (`branchStatus === 'active'`) that have a defined `baseBranch`. Store result in `mergeConflict` field.

### Completion Criteria

- [x] `runGitCommandAsync` runs `git fetch origin` without freezing the Obsidian UI
- [x] `behindBaseCount` populated from local `git rev-list`, not GitHub API
- [x] `mergeConflict` populated from local `git merge-tree`, not GitHub API
- [x] `git fetch origin` runs at most once per unique repo root per refresh cycle
- [x] Existing sync git helpers still work for instant queries

---

Progress: 8/8 tasks complete

## Decisions

- Moved local git detection (behind-count, conflict detection) outside `if (githubService.isAuthenticated())` block so they work without GitHub token.
- Removed unused `OPEN_PR_STATES` constant (was only used by the old PR-based mergeable check).
- `getBehindCount` is synchronous (instant after fetch), `detectMergeConflicts` is async — no need for `Promise.all` since they run sequentially after the shared fetch.

## Blockers

None
