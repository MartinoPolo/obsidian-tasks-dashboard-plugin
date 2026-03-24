# Phase 10: Refactoring / Componentization

**Status:** Not Started
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

- [ ] Audit codebase for large files and extraction candidates
      Identify files exceeding ~300 lines that contain multiple distinct responsibilities. Key candidates from current codebase: `IssueHeader.svelte` (~500+ lines), `SortControls.svelte` (large toolbar), `dashboard-issue-actions.ts` (~350+ lines), `DashboardWriter.ts` (large write operations), `issue-creation-modal.ts` (~400+ lines). For each candidate, identify natural extraction boundaries (e.g., a group of related functions, a UI section that could be its own component).

- [ ] Analyze Obsidian Plugin componentization approach
      Research best practices for Obsidian plugin component architecture with Svelte 5. Consider: (a) how to share plugin instance without prop drilling, (b) whether to use Svelte context for plugin/services, (c) how to structure component hierarchy for testability, (d) how modal components interact with the Obsidian Modal base class. Document findings as decisions in this checklist.

### Extraction

- [ ] Extract header badges into an isolated module
      `HeaderBadges.svelte` is already a separate component but is tightly coupled to `IssueHeader.svelte` state. Consider whether badge computation logic (branch badge data, compaction, etc.) can be moved into the badges component or a dedicated badge service. Extract badge-related derived state from `IssueHeader.svelte` into a composable or helper.

- [ ] Refactor large files identified in audit
      Split files that have multiple responsibilities into focused single-responsibility files. Follow existing patterns: factory functions with closures, kebab-case file names, types in separate `*-types.ts` files. Preserve all public APIs -- refactoring must not change behavior. Run `pnpm lint` and `pnpm format` after each extraction.

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

Progress: 0/5 tasks complete

## Decisions

[Decisions made during execution, with reasoning]

## Blockers

None
