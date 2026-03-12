# Svelte Migration — Phase 8: Testing

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
| 7 | Pending | Cleanup: delete replaced files, dead imports, final verification |
| **8** | **🔄 Current** | **Testing: vitest, component tests, CI** |

---

## Phase 8 Checklist

- [x] 8.1 Install test dependencies
- [x] 8.2 Create `vitest.config.ts`
- [x] 8.3 Create `src/test/setup.ts`
- [x] 8.4 Create `src/test/mocks/obsidian.ts`
- [x] 8.5 Add `package.json` scripts
- [x] 8.6 Write component tests
- [x] 8.7 Verify
- [ ] 8.8 CI integration

---

## 8.1 Install test dependencies

```
pnpm add -D vitest @testing-library/svelte jsdom @sveltejs/vite-plugin-svelte
```

## 8.2 Create `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
});
```

## 8.3 Create `src/test/setup.ts`

Global test setup: import mock obsidian module.

## 8.4 Create `src/test/mocks/obsidian.ts`

Stubs: `Modal`, `Notice`, `setTooltip`, `Setting`, `MarkdownRenderChild`

## 8.5 Add package.json scripts

```json
"test": "vitest run",
"test:watch": "vitest"
```

## 8.6 Write component tests (priority order)

1. `Icon.test.ts` — SVG rendering: correct viewBox, size, content; stroke vs fill styles
2. `ActionButton.test.ts` — renders icon + label, fires onclick, faded class
3. `GitBadge.test.ts` — span vs anchor, CSS classes per badge type
4. `ProgressBar.test.ts` — width percentage, text per display mode
5. `GitHubCard.test.ts` — 3 display modes, refresh/unlink buttons
6. `ConfirmationDialog.test.ts` — confirm/cancel callbacks, Escape key
7. `ColorPicker.test.ts` — swatch selection, custom color
8. `PrioritySelector.test.ts` — keyboard nav, selection
9. `IssueCard.test.ts` — integration with mock plugin

## 8.7 Verify

- `pnpm test` — all pass, no console errors

## 8.8 CI integration

Add `pnpm test` to CI pipeline.

---

## Files Created in Phase 8

```
vitest.config.ts
src/test/
  setup.ts
  mocks/obsidian.ts
src/components/
  Icon.test.ts
  ActionButton.test.ts
  GitBadge.test.ts
  dashboard/ProgressBar.test.ts
  github/GitHubCard.test.ts
  modals/ConfirmationDialog.test.ts
  modals/ColorPicker.test.ts
  modals/PrioritySelector.test.ts
  dashboard/IssueCard.test.ts
```
