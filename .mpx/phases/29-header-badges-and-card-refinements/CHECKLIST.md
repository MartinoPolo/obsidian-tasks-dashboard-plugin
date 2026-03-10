# Phase 29: Header Badges & Card Refinements

## Overview
Move git status badges into issue header, simplify card layout, refine header styling, add priority toggle, remove redundant GitHub links from issue notes.

---

## 1. Header Styling Fixes

### 1.1 Info Icon Color & Hover
- [x] `styles.css`: Change `.tdc-issue-info-inline` color from `var(--text-muted)` to `var(--text-normal)` (match header text)
- [x] `styles.css`: Add `background: var(--background-modifier-hover)` on `.tdc-issue-info-inline:hover` instead of color change
- [x] `styles.css`: Remove the `color: var(--text-normal)` override on `.tdc-issue-info-inline:hover` (color stays constant now)
- [x] Verify: Info icon color matches issue title text color in both light and dark themes
- [ ] SPEC check: `Issue Header Styling > Info icon color matches header text color`

### 1.2 Worktree Icon Active State (Verification)
- [x] Verify `.tdc-worktree-status-active` uses green color (`var(--tdc-priority-low)` = `#4caf50`)
- [ ] SPEC check: `Issue Header Styling > Worktree icon uses green color in active state`

### 1.3 Consistent Header Spacing
- [x] `styles.css`: Remove `margin-left: 6px` from `.tdc-issue-info-inline` — let the parent `gap: 8px` handle spacing
- [x] Verify all header elements (collapse, title, worktree icon, info icon, badges, actions) use uniform gap
- [ ] SPEC check: `Issue Header Styling > Consistent spacing between worktree icon, info icon, and other header action buttons`

---

## 2. Header Badges (Branch / PR / Issue State)

### 2.1 Types & Data Model
- [x] `src/git-status/git-status-types.ts`: Add `IssueState` type (`'open' | 'closed' | 'not_planned' | 'unknown'`) and `LinkedGitHubIssue` interface (`{ number, title, url, state, repository }`)
- [x] `src/git-status/git-status-types.ts`: Add `linkedIssues: LinkedGitHubIssue[]` to `IssueGitStatus`
- [x] `src/git-status/git-status-service.ts`: Fetch GitHub issue state for each `githubLinks` entry that is an issue (not PR). Add to `linkedIssues` in result

### 2.2 Badge Renderer Refactoring
- [x] `src/dashboard/git-status-indicator.ts`: Add `renderIssueBadge(container, issue)` — creates `<a>` badge with issue state icon + `#number State` text, clickable link to issue URL
- [x] `src/dashboard/git-status-indicator.ts`: Refactor `renderBranchBadge` to trim branch name to 16 chars (full name in tooltip)
- [x] `src/dashboard/git-status-indicator.ts`: Export `renderBranchBadge`, `renderPrBadge`, `renderIssueBadge` individually (not just `renderGitStatusStrip`)
- [x] `src/dashboard/header-actions.ts`: Add GitHub issue state SVG icons — `gitIssueOpen` (circle-dot), `gitIssueClosed` (circle-check), `gitIssueNotPlanned` (skip/circle-slash)

### 2.3 Badge CSS
- [x] `styles.css`: Add `.tdc-git-badge-issue-open`, `.tdc-git-badge-issue-closed`, `.tdc-git-badge-issue-not-planned` with GitHub-matching colors
- [x] `styles.css`: Add `.tdc-header-badges` flex container (inside header, `display: flex; gap: 4px; align-items: center; flex-shrink: 1; min-width: 0; overflow: hidden`)
- [x] `styles.css`: Add `.tdc-git-badge-compact` (icon-only mode): `padding: 1px 4px` and hide text child `span`
- [x] `styles.css`: Responsive rule — when `.tdc-header-badges` overflows, add `.tdc-badges-compact` class to switch all badges to icon-only

### 2.4 Rendering Badges in Header
- [x] `src/dashboard/DashboardRenderer.ts`: Create `.tdc-header-badges` container in header, positioned after info icon and before `.tdc-header-actions`
- [x] `src/dashboard/DashboardRenderer.ts`: After git status fetch resolves, render branch/PR/issue badges into `.tdc-header-badges` (using exported badge renderers)
- [x] `src/dashboard/DashboardRenderer.ts`: Add shimmer placeholder in `.tdc-header-badges` while loading (similar to current `.tdc-git-status-loading`)
- [x] `src/dashboard/DashboardRenderer.ts`: Implement responsive badge compaction — use `ResizeObserver` on header to toggle `.tdc-badges-compact` when title truncates

### 2.5 Right-Click Context Menu
- [x] `src/dashboard/git-status-indicator.ts`: Add `contextmenu` event listener on branch/PR/issue badges
- [x] Create dropdown with single "Refresh" item (reuse sort-dropdown styling pattern from `sort-controls.ts`)
- [x] On click: invalidate cache for this issue's git status + re-render
- [x] Wire cache invalidation through `gitStatusService.invalidate(dashboardId, issueId)`
- [x] `src/git-status/git-status-service.ts`: Expose `invalidate(dashboardId, issueId)` method to clear cached entry

### 2.6 Remove Git Status Strip
- [x] `src/dashboard/DashboardRenderer.ts`: Remove the `gitStatusContainer` creation (lines ~717-740) — git status fetch stays but renders into header badges now
- [x] `styles.css`: Remove or deprecate `.tdc-git-status-container`, `.tdc-git-status-loading`, `.tdc-git-status-strip` rules
- [x] Verify collapsed cards still hide badges appropriately

---

## 3. PR State Accent Repositioning

### 3.1 Move Accent from Left Border to Header Bottom
- [x] `styles.css`: Change `.tdc-pr-accent-*` from `border-left` to `border-bottom` on `.tdc-issue-header` (not `.tdc-issue-container`)
- [x] `styles.css`: Update gradient `::before` overlays to flow from bottom-up instead of top-left
- [x] `src/dashboard/DashboardRenderer.ts`: Apply `tdc-pr-accent-*` class to `header` element instead of `container`
- [x] `src/dashboard/git-status-indicator.ts`: Update `applyPrStateAccent` to accept header element
- [x] Verify accent doesn't conflict with priority left-border on header
- [ ] SPEC check: `Header Badges > PR state accent strip rendered at bottom border of issue header`

---

## 4. Remove GitHub Cards from Dashboard Issue Cards

### 4.1 Remove Embedded Card Rendering
- [x] `src/dashboard/DashboardRenderer.ts`: Remove the GitHub card rendering block (lines ~764-776 — the `if (dashboard.githubEnabled && params.githubLinks.length > 0)` section)
- [x] Verify `tasks-dashboard-github` code block rendering in issue _notes_ still works (`renderGitHubNoteCard`)
- [x] `styles.css`: Remove or scope `.tdc-github-container` CSS to note-only contexts if needed
- [ ] SPEC check: `Issue Card Simplification > Remove embedded GitHub issue/PR cards from dashboard issue cards`

---

## 5. Priority Toggle

### 5.1 Settings
- [x] `src/types.ts`: Add `prioritiesEnabled?: boolean` to `DashboardConfig` (default `true`)
- [x] `src/constants/settings-defaults.ts`: Set default `prioritiesEnabled: true`
- [x] `src/settings/settings-options.ts`: Add toggle to `DASHBOARD_VISIBILITY_TOGGLES` array or create dedicated setting in dashboard settings UI

### 5.2 Hide Priority Strips
- [x] `styles.css`: When `.tdc-priorities-disabled` class is on `.tdc-issue-container`, hide the priority left-border: `border-left-color: transparent` or use `var(--text-muted)` fallback
- [x] `src/dashboard/DashboardRenderer.ts`: Add `.tdc-priorities-disabled` class to container when `dashboard.prioritiesEnabled === false`

### 5.3 Skip Priority Step in Creation
- [x] `src/modals/issue-creation-modal.ts`: Skip `PriorityPromptModal` when `dashboard.prioritiesEnabled === false`; auto-assign `'low'`
- [x] `src/modals/note-import-modal.ts`: Same skip logic for note import flow
- [x] Verify quick-create (assigned issues section) already uses default priority — no change needed

### 5.4 Hide Sort by Priority
- [x] `src/dashboard/sort-controls.ts`: Filter out `'Priority'` from `sortOptions` when `dashboard.prioritiesEnabled === false`
- [x] Verify remaining sort options render correctly when priority is excluded

### 5.5 Progress Bar Styling
- [x] `src/dashboard/DashboardRenderer.ts`: When priorities disabled, use neutral color for progress fill instead of priority color (or keep low-priority green — decide)
- [ ] SPEC check: `Priority Toggle > Per-dashboard setting prioritiesEnabled`

---

## 6. Remove GitHub Link from Issue Notes

### 6.1 Issue Creation
- [x] `src/issues/issue-manager-github.ts` → `generateGithubLinksBody`: Remove the `[linkText](url)\n\n` markdown link prefix. Keep only the `` ```tasks-dashboard-github ``` `` code block
- [x] `src/issues/issue-manager-github.ts` → `generateIssueContent`: Verify output no longer contains standalone markdown link before the code block

### 6.2 GitHub Linking (Post-Creation)
- [x] `src/issues/issue-manager-github.ts` → `updateBodyWithGitHubLink`: Remove the `[linkText](url)\n\n` prefix from `githubBlock`. Keep only the code block
- [x] Verify existing issue notes with both link + code block still render correctly (backward compat — old links stay, new ones don't add link)

### 6.3 Cleanup
- [x] `src/issues/issue-manager-github.ts`: Remove `formatGitHubLinkText` if no other callers exist after link removal
- [ ] SPEC check: `Issue Note Cleanup > Remove the standalone GitHub issue markdown link`

---

## 7. Final Verification

- [ ] Build passes: `pnpm build`
- [ ] Lint passes: `pnpm lint`
- [ ] Manual test: create issue with and without GitHub link, verify no standalone link in note
- [ ] Manual test: verify badges appear in header, responsive collapse to icon-only
- [ ] Manual test: right-click badge → Refresh works
- [ ] Manual test: disable priorities → no strip, no priority step, no sort option
- [ ] Manual test: verify PR accent on header bottom border
- [ ] Manual test: no GitHub card between controls and tasks section
- [ ] Update SPEC.md: check off all Phase 29 items
