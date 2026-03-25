# Phase 10: Refactoring / Componentization

**Status:** In Progress
**Dependencies:** Phases 1-9 (all feature phases complete)

## Objective

Refactor large files and extract standalone UI units into isolated modules. Runs after all feature work to avoid merge conflicts and to capture the final state of the codebase.

## Scope

- Large file refactoring across the project
- Component extraction for standalone UI units (e.g., header badges)
- Obsidian Plugin componentization approach analysis
- Clean code sweep

## Out of Scope

- New features
- Behavioral changes
- API changes

---

## Tasks

### Analysis

- [x] Audit codebase for large files and extraction candidates
      14 files >300 lines identified. 6 extractions planned, 7 files marked do-not-split with justification. See ANALYSIS.md.

- [x] Analyze Obsidian Plugin componentization approach
      Decision: Keep prop drilling (max 3 levels), no Svelte context, extract logic to TS modules not components, preserve factory function pattern. See ANALYSIS.md.

### Extraction

- [x] Extract header badges into an isolated module
      Info content builder extracted to `dashboard/issue-header-info-content.ts`. Badge compaction and display logic kept in HeaderBadges.svelte (already a separate component with proper interface). No further extraction beneficial — badge state is tightly coupled to the render cycle.

- [x] Refactor large files identified in audit
      6 extractions completed:
      1. SortControls.svelte: sync/prune/collapse logic → `toolbar-sync-all.ts`, `toolbar-prune.ts`, `toolbar-collapse.ts`, `dashboard-content-reader.ts` (846→634)
      2. IssueHeader.svelte: info content builder → `issue-header-info-content.ts` (807→736, 247 lines is CSS)
      3. issue-creation-modal.ts: helpers + file-focus → `issue-creation-helpers.ts`, `open-file-and-focus.ts` (549→347)
      4. dashboard-issue-actions.ts: confirmations → `dashboard-issue-action-confirmations.ts` (485→404)
      5. IssueManager.ts: block-edit → `issue-manager-block-edit.ts` (659→604)
      6. OverflowPanel.svelte: settings mode → `OverflowLayoutSettings.svelte` (452→153)

### Verification

- [ ] Run full test suite and lint after refactoring
      Execute `pnpm lint`, `pnpm format`, and all tests. Verify no behavioral regressions. The refactoring phase should be purely structural with zero behavior changes.

### Completion Criteria

- [ ] No file exceeds ~300 lines (or has documented justification)
- [ ] Each file has a single clear responsibility
- [ ] All tests pass after refactoring
- [ ] Lint and format checks pass
- [ ] No behavioral changes introduced

---

Progress: 4/5 tasks complete

## Decisions

1. **No Svelte Context** — Keep prop drilling. Max 3 levels deep, type-safe, consistent. Context adds complexity without benefit at this scale.
2. **Extract Logic to TS Modules, Not Components** — For SortControls and IssueHeader, extracted async workflows and builders to TS modules. UI template structure stays in .svelte files.
3. **Preserve Factory Function Pattern** — All extracted modules use factory functions or pure function exports. No classes outside Obsidian base classes.
4. **CSS Stays in Svelte Files** — Scoped CSS cannot be extracted. IssueHeader's 247-line CSS is a known trade-off.
5. **OverflowPanel Split Uses Child Component** — Settings mode is a genuine second UI surface justifying a Svelte sub-component.
6. **Accept Some Files Above 300 Lines** — Files with documented justification: SortControls (634: 301 script + 257 template + 75 CSS, toolbar with 6 groups), IssueHeader (736: 349 script + 139 template + 247 CSS), IssueManager (604: partially decomposed CRUD with 6 satellite files), issue-manager-worktree (621: cohesive worktree lifecycle), GitHubSearchContent (656: well-decomposed with extracted engine/config/loaders), GitHubService (498: thin API wrappers, cache/request/mappers extracted), AssignedIssuesSection (533: single-purpose with 120 CSS), DashboardSettings (366: imperative Obsidian Setting API).

## Blockers

None
