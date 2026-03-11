# Phase 28: ESLint ObsidianMD Integration - Checklist

**Status:** Completed
**Dependencies:** Existing ESLint config/tooling scripts, package-manager lockfile consistency

## Objective
Add `eslint-plugin-obsidianmd` to local linting so checks align with Obsidian pre-publish style/quality expectations where applicable.

## Scope
- Install and configure plugin
- Integrate rules into existing lint pipeline
- Keep rules scoped/pragmatic for this plugin codebase

## Tasks

### A. Dependency + Config
- [x] Add `eslint-plugin-obsidianmd` dependency to project tooling.
- [x] Update ESLint configuration to load and apply ObsidianMD plugin rules.
- [x] Scope/override rules where needed to avoid non-actionable noise.

### B. Script and Workflow Alignment
- [x] Ensure existing lint scripts run with ObsidianMD plugin active.
- [x] Confirm lint output remains actionable for local development workflow.
- [x] Document any required lint-command expectations in relevant `.mpx/` phase notes if needed.

## Validation
- [x] Verify `pnpm lint` runs with ObsidianMD plugin checks enabled.
- [x] Verify no plugin misconfiguration errors in lint/typecheck/build pipeline.
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm build`

## Completion Criteria
- [x] ObsidianMD lint parity is integrated into local lint workflow.
- [x] Tooling configuration is stable and maintainable.

---
Progress: 13/13 tasks complete
