# Lessons Learned — Epic 3

## Local Git > GitHub API for Sync Detection

GitHub API-based behind-count (`compareBranches`) and conflict detection (`getPullRequestMergeable`) were replaced with local git operations. Benefits:
- **No auth required** — `git rev-list` and `git merge-tree` work without a GitHub token, so sync detection runs even when GitHub integration is unconfigured.
- **Faster** — local git queries are instant after a single `git fetch origin`. No HTTP round-trips per issue.
- **More reliable** — GitHub's `mergeable` field has a known delay (returns `null` while computing), requiring polling. Local `git merge-tree` gives an immediate answer.

## Async vs Sync Git Commands

Two tiers of git command execution:
- **Sync** (`runGitCommandOutput`, `runGitCommandStatus`): For instant local queries — `rev-list --count`, `status --porcelain`, `rev-parse`. These complete in milliseconds and are safe to call on the main thread.
- **Async** (`runGitCommandAsync`): For network or heavy operations — `fetch`, `merge`, `push`. These can take seconds and would freeze the Obsidian UI if run synchronously. Uses `child_process.spawn` with stream listeners, resolves on `close` event.

Rule of thumb: if it touches the network or modifies the working tree, use async.

## Fetch Deduplication

Multiple worktree issues can share the same git repo root. Running `git fetch origin` once per issue would be redundant and slow. `createFetchCoordinator()` tracks in-flight fetch promises per repo root so concurrent calls coalesce into a single invocation. Pattern: resolve repo root via `git rev-parse --show-toplevel`, then `fetchOnce(repoRoot)`.

## `git merge-tree --write-tree` for Conflict Detection

Git 2.38+ supports `git merge-tree --write-tree HEAD origin/<base>` which performs a three-way merge in memory without touching the working tree. Exit code 0 = clean merge possible, exit code 1 = conflicts. This replaced the GitHub API `mergeable` field and is both faster and more reliable.

## Badge Visibility on Colored Backgrounds

Semi-transparent badge backgrounds (`color-mix()` with the issue header color) maintain semantic meaning while adapting to any header color. Key insight: badge text, border, and icon should all share the header's text color (black for light headers, white for dark headers) — the background color alone carries the semantic meaning (green=active, purple=merged, etc.). This ensures contrast regardless of issue color.

## Obsidian Modal Reactivity

Obsidian `Modal` instances mount Svelte components once. To update modal content (e.g., progress steps during sync), use a remount-on-update pattern: unmount the existing Svelte component and mount a new one with updated props. Obsidian modals don't natively support Svelte reactivity after initial mount.

## Responsive Toolbar with ResizeObserver

`ResizeObserver` on the toolbar container detects available width and progressively hides low-priority buttons (Import Note, Rebuild) when space is limited. This avoids a three-dots overflow menu while keeping the toolbar functional at all widths. Settings button is pinned rightmost and never hidden.
