# Svelte Migration — Phase 6: CSS Audit

## Context & Conventions

See `SVELTE-MIGRATION.md` for full migration plan. See `SVELTE_MIGRATION_GUIDELINES.md` for coding standards.

CSS migration is handled per-component during each phase — every component gets its `<style>` block when created. Phase 6 verifies completeness and removes dead CSS.

---

## Phase Summary

| Phase | Status | Description |
|-------|--------|-------------|
| 0 | ✅ Done | Infrastructure: deps, esbuild, tsconfig, eslint, svelte.d.ts, attach utils |
| 1 | ✅ Done | Shared components: icons, Icon, ActionButton, GitBadge, StatePill, LoadingIndicator, ErrorDisplay |
| 2 | ✅ Done | GitHub: GitHubCard, GitHubRepoCard, GitHubCardContainer, GitHubSearchContent, thin modal shell |
| 3 | Pending | Dashboard: IssueCard, IssueHeader, OverflowPanel, SortControls, ProgressBar, etc. |
| 4 | Pending | Modals: wizard, confirmation, color picker, priority selector, all modal content |
| 5 | Pending | Settings: SettingsTab, DashboardSettings, GitHubSettings |
| **6** | **✅ Done** | **CSS audit: verify global vs scoped, remove dead CSS** |
| 7 | Pending | Cleanup: delete replaced files, dead imports, final verification |
| 8 | Pending | Testing: vitest, component tests, CI |

---

## Phase 6 Checklist

- [x] 6.1 Audit `styles.css`
- [x] 6.2 Remove dead CSS
- [x] 6.3 Verify

---

## 6.1 Audit `styles.css`

Verify that only global CSS remains in `styles.css`:

**Must keep (global scope):**
- `:root` custom properties (`--tdc-*`)
- `.cm-line:not(.cm-active) .cm-comment` CodeMirror override
- `.tdc-hidden` utility
- `.priority-*` / `.tdc-priority-*` color classes (applied externally from TS)
- `.tdc-issue-content-collapsed`, `.tdc-issue-content-block` (sibling DOM)
- `.cm-embed-block:has(...)` collapsed state selectors
- `.theme-dark` / `.theme-light` overrides
- `.block-language-tasks-dashboard-*` code block wrappers

**Should have migrated into component `<style>` blocks:**
- `.tdc-gh-card*` → `GitHubCard.svelte`
- `.tdc-gh-search*` → `GitHubSearchContent.svelte`
- `.tdc-overflow-*` → `OverflowPanel.svelte`
- `.tdc-sort-*` → `SortControls.svelte` / `SortDropdown.svelte`
- `.tdc-issue-header*` → `IssueHeader.svelte`
- `.tdc-progress*` → `ProgressBar.svelte`
- `.tdc-info-panel*` → `IssueInfoPanel.svelte`
- `.tdc-modal-*` → `ModalLayout.svelte`
- `.tdc-settings*` → `SettingsTab.svelte`
- `.tdc-btn*` → `ActionButton.svelte`
- `.tdc-git-badge*` → `GitBadge.svelte`
- `.tdc-gh-state*` → `StatePill.svelte`

## 6.2 Remove dead CSS

Search `styles.css` for selectors that are no longer referenced by any component or TS file:
1. Extract all CSS selectors from `styles.css`
2. For each selector, search `src/` for references (in `.svelte`, `.ts` files)
3. Remove selectors with zero references
4. Be careful with dynamic class names (template literals, clsx arrays)

## 6.3 Verify

- `pnpm build` — no errors
- Visual regression check: compare all UI before/after
- Light and dark themes
- No CSS specificity conflicts between scoped and global

---

## Files Modified in Phase 6

```
styles.css — Reduced to global-only CSS (custom properties, theme overrides, external selectors)
```
