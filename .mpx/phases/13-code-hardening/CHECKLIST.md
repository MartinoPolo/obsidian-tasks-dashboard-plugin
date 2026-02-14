# Phase 13: Code Hardening — Checklist

**Status:** Not Started
**Dependencies:** Phase 12 (refactoring complete, stable file structure)

## Objective
Address security vulnerabilities, performance bottlenecks, error handling gaps, and code quality issues identified in full codebase review. No new features — hardening only.

## Decisions
- Execution order: Security (Group A) first, then Performance (B), Error Handling (C), Code Quality (D)
- Each task ends with `pnpm build` passing
- No functional behavior changes unless fixing a bug/vulnerability

## Progress: 1/24

## Group A: Security Fixes

### A1. Fix command injection in platform.ts
Replace `exec()` with `spawn()` using `shell: false` and argument arrays. User-controlled folder paths are currently interpolated into shell strings — quote escaping is insufficient (e.g., `" & calc & "` bypasses it). Also validate `tabColor` format against `/^#[0-9A-Fa-f]{6}$/`.

**File:** `src/utils/platform.ts:18-40`

- [x] Replace `exec()` calls with `spawn()` + argument arrays for Windows/Mac/Linux terminal
- [x] Replace `exec()` for VS Code with `spawn('code', [folderPath], { shell: false })`
- [x] Validate `tabColor` format before passing to spawn args
- [x] Verify `pnpm build` passes

### A2. Fix prototype pollution in YAML frontmatter parser
Manual YAML parsing sets `result[key] = value` without key validation. `__proto__` key would pollute Object.prototype.

**File:** `src/dashboard/DashboardWriter.ts:515-534`

- [ ] Use `Object.create(null)` instead of `{}` for result object
- [ ] Skip `__proto__`, `constructor`, `prototype` keys
- [ ] Verify `pnpm build` passes

### A3. Tighten GitHub URL validation
Missing protocol check — `javascript:github.com/x/y/issues/1` would match current regex.

**File:** `src/modals/GitHubSearchModal.ts:192-194`

- [ ] Require `^https?://` prefix in GitHub URL validation regex
- [ ] Add `$` anchor to prevent partial matches
- [ ] Verify `pnpm build` passes

## Group B: Performance Improvements

### B1. Parallelize GitHub card rendering
Sequential `await` in loop creates waterfall — each card waits for previous. With N links = Nx latency.

**File:** `src/dashboard/DashboardRenderer.ts:500-503`

- [ ] Replace `for...of await` loop with `Promise.all(params.githubLinks.map(...))`
- [ ] Ensure DOM order preserved (pre-create containers, pass to each promise)
- [ ] Verify `pnpm build` passes

### B2. Parallelize file reads during sort operations
Issue files read one-by-one in loop during sort. With 20 issues = 20 sequential I/O operations.

**File:** `src/dashboard/DashboardWriter.ts:426-478`

- [ ] Replace sequential loop with `Promise.all()` for `readCreatedDateForIssue` calls
- [ ] Apply same fix to `sortByEditedDate` file reads
- [ ] Verify `pnpm build` passes

### B3. Fix memory leak — dropdown event listeners accumulate
`window.addEventListener('scroll/resize')` added on render, cleanup only in `onunload`. Re-render accumulates listeners without cleanup.

**File:** `src/dashboard/sort-controls.ts:144-219`

- [ ] Register cleanup via `MarkdownRenderChild.register()` callback
- [ ] Remove scroll, resize, and click listeners on re-render/unload
- [ ] Verify `pnpm build` passes

### B4. Render progress asynchronously with placeholder
`await getProgress()` blocks render path. Cold cache = visible delay before UI appears.

**File:** `src/dashboard/DashboardRenderer.ts:496`

- [ ] Render placeholder progress bar (0/0) immediately
- [ ] Update with real data when async read completes
- [ ] Verify `pnpm build` passes

### B5. Implement LRU cache with size cap for GitHub cache
Map grows unbounded in long sessions. No eviction strategy.

**File:** `src/github/GitHubService.ts:67`

- [ ] Add `MAX_CACHE_SIZE` constant (~200 entries)
- [ ] Evict oldest entry when limit reached
- [ ] Verify `pnpm build` passes

### B6. Debounce vault modify event handler
Every keystroke in issue file triggers cache invalidation + dashboard refresh. No debounce.

**File:** `main.ts:93-103`

- [ ] Add 500ms debounce on `triggerDashboardRefresh()` call
- [ ] Keep immediate `invalidateCache()` (cheap operation)
- [ ] Verify `pnpm build` passes

## Group C: Error Handling & Reliability

### C1. Add TFile type guards on getAbstractFileByPath calls
`getAbstractFileByPath()` returns `TAbstractFile | null`, cast to `TFile` without `instanceof` check at 10+ locations.

**File:** `src/dashboard/DashboardWriter.ts` (multiple locations)

- [ ] Replace all `as TFile | null` casts with `instanceof TFile` guards
- [ ] Return early or throw descriptive error when not TFile
- [ ] Verify `pnpm build` passes

### C2. Add typed error propagation to GitHubService
`apiRequest()` catches all errors, logs to console, returns `undefined`. Callers can't distinguish network failure from 404 from auth error.

**File:** `src/github/GitHubService.ts:150-162`

- [ ] Return `{ data, error }` result type or throw typed errors
- [ ] Surface auth failures and network errors to user via `Notice`
- [ ] Verify `pnpm build` passes

### C3. Add operation locking for archive/unarchive
Modify content → move file → update dashboard. Rapid clicks can interleave operations on same issue.

**File:** `src/issues/IssueManager.ts:238-284`

- [ ] Add per-issue operation lock (Map<string, boolean> or Set)
- [ ] Skip operation if lock held, show notice
- [ ] Release lock in finally block
- [ ] Verify `pnpm build` passes

### C4. Add error handling to exec()/spawn() calls in platform.ts
Shell commands fail silently if terminal/VS Code not installed. No user feedback.

**File:** `src/utils/platform.ts:25-39`

- [ ] Add error callback to spawn calls
- [ ] Show `Notice` on failure (e.g., "Could not open terminal")
- [ ] Verify `pnpm build` passes

### C5. Validate loadData() shape before type assertion
`loadData()` returns `unknown`, immediately cast to `Partial<TasksDashboardSettings>` without validation.

**File:** `main.ts:220`

- [ ] Check `loaded && typeof loaded === 'object'` before merging
- [ ] Validate key fields exist and have expected types
- [ ] Verify `pnpm build` passes

### C6. Add error handling for swallowed promise rejections in render
`void` keyword on async render calls swallows errors. Failed renders show nothing.

**File:** `src/dashboard/DashboardRenderer.ts:50-56`

- [ ] Replace `void` with `.catch()` that shows error in container
- [ ] Log error to console for debugging
- [ ] Verify `pnpm build` passes

### C7. Add try/catch to plugin onload() with user notice
If `loadSettings()` or service creation fails, plugin initialization fails silently.

**File:** `main.ts:41-104`

- [ ] Wrap onload body in try/catch
- [ ] Show `Notice` with error message on failure
- [ ] Log full error to console
- [ ] Verify `pnpm build` passes

### C8. Replace deprecated electron.remote
`require('electron').remote` removed in newer Electron versions. Will crash in future Obsidian updates.

**File:** `src/utils/platform.ts:44`

- [ ] Research Obsidian's current approach to folder picker dialogs
- [ ] Replace with Obsidian-native API or `@electron/remote` if needed
- [ ] Verify `pnpm build` passes

## Group D: Code Quality & Conventions

### D1. Split addGitHubLink into focused sub-functions
167 lines with 5-level nesting. Mixes YAML parsing, format migration, frontmatter manipulation, body editing.

**File:** `src/issues/IssueManager.ts:392-559`

- [ ] Extract `migrateOldGitHubFormat(content)` for legacy format handling
- [ ] Extract `updateFrontmatterWithGitHubLink(content, link, metadata)` for YAML manipulation
- [ ] Extract `updateBodyWithGitHubLink(content, link, metadata, dashboardId)` for body section
- [ ] Verify `pnpm build` passes

### D2. Split rebuildDashboardFromFiles into sub-functions
123 lines in a single function. Multiple responsibilities: parse, extract notes, scan files, rebuild.

**File:** `src/dashboard/DashboardWriter.ts:622-745`

- [ ] Extract `extractNotesSection(content, parsed)` for notes preservation
- [ ] Extract `scanIssueFilesForRebuilding(app, dashboard)` for file scanning
- [ ] Keep orchestrator function thin
- [ ] Verify `pnpm build` passes

### D3. Unify duplicate sort logic
`sortByCreatedDate` and `sortByEditedDate` share 90% logic — differ only in timestamp source.

**File:** `src/dashboard/DashboardWriter.ts:408-503`

- [ ] Extract `sortByDateField(dashboard, direction, getTimestamp)` generic
- [ ] Make `sortByCreatedDate`/`sortByEditedDate` thin wrappers
- [ ] Verify `pnpm build` passes

### D4. Extract magic numbers to named constants
Hardcoded values scattered: truncation (60/100/200), API limits (20/50/100), debounce (100/300ms), slug length (50), cache TTL.

**Files:** DashboardRenderer.ts, GitHubService.ts, GitHubSearchModal.ts, slugify.ts, main.ts

- [ ] Create constants at top of each file (not a shared constants file — keep locality)
- [ ] Replace all magic numbers with named constants
- [ ] Verify `pnpm build` passes

### D5. Minor convention fixes
Small violations of project conventions found across codebase.

**Files:** GitHubSearchModal.ts:305, slugify.ts:11, DashboardParser.ts:62

- [ ] Replace `.forEach()` with `for...of` in GitHubSearchModal.ts
- [ ] Replace deprecated `.substr()` with `.substring()` in slugify.ts
- [ ] Replace `exec()` in while loop with `matchAll()` in DashboardParser.ts (prevents infinite loop risk)
- [ ] Verify `pnpm build` passes
