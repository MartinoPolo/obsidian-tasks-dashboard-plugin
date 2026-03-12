# Svelte Migration — Phase 7: Cleanup

## Context & Conventions

See `SVELTE-MIGRATION.md` for full migration plan. See `SVELTE_MIGRATION_GUIDELINES.md` for coding standards.

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
| 6 | Pending | CSS audit: verify global vs scoped, remove dead CSS |
| **7** | **🔄 Current** | **Cleanup: delete replaced files, dead imports, final verification** |
| 8 | Pending | Testing: vitest, component tests, CI |

---

## Phase 7 Checklist

- [ ] 7.1 Delete replaced files
- [ ] 7.2 Remove dead imports
- [ ] 7.3 Remove dead CSS
- [ ] 7.4 Final build verification
- [ ] 7.5 Full smoke test

---

## 7.1 Delete replaced files

| File | Lines |
|---|---|
| `src/dashboard/header-actions.ts` | 336 |
| `src/dashboard/sort-controls.ts` | 434 |
| `src/dashboard/dashboard-overflow-panel.ts` | 493 |
| `src/dashboard/git-status-indicator.ts` | 201 |
| `src/dashboard/dashboard-renderer-github-cards.ts` | 126 |
| `src/dashboard/dashboard-github-link-actions.ts` | 34 |
| `src/github/GitHubCardRenderer.ts` | 472 |
| `src/modals/modal-helpers.ts` | 196 |
| `src/modals/modal-keyboard-helpers.ts` | 75 |
| `src/settings/github-settings-renderer.ts` | 229 |
| **Total** | **~2,596** |

Note: Some files are deleted earlier in their respective phases. This checklist catches any remaining files.

## 7.2 Remove dead imports

Search all TS files for unused imports after deletions:
- Run `pnpm typecheck` to find missing/unused imports
- Check all `import` statements in `src/` reference existing files
- Remove `export` statements for functions that no longer have callers

## 7.3 Remove dead CSS

Final sweep of `styles.css` for selectors no longer referenced anywhere. Should be minimal if Phase 6 was thorough.

## 7.4 Final build verification

- `pnpm build` — no errors
- `pnpm typecheck` — no errors
- `pnpm lint` — no errors

## 7.5 Full smoke test

See `SVELTE-MIGRATION.md` Verification section:
1. Create new dashboard
2. Add issues (name, color, priority, GitHub link, worktree)
3. Collapse/expand issues
4. Sort issues (field, direction)
5. View overflow menu actions
6. View issue info panel
7. Search and link GitHub items
8. Create issue via wizard (all steps + back navigation)
9. Rename issue
10. Change issue color, priority
11. Delete/archive issues with confirmation
12. View assigned issues section
13. View GitHub note cards
14. Change settings (global, per-dashboard, GitHub)
15. Test both light and dark themes
16. Test portal positioning at various scroll positions + window resize
17. Test keyboard navigation in all modals
18. Test narrow widths — badge compaction, row1 priority layout
