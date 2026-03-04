# Phase 28: ESLint ObsidianMD Integration - Checklist

**Status:** Planned
**Dependencies:** Existing ESLint config/tooling scripts, package-manager lockfile consistency

## Objective
Add `eslint-plugin-obsidianmd` to local linting so checks align with Obsidian pre-publish style/quality expectations where applicable.

## Scope
- Install and configure plugin
- Integrate rules into existing lint pipeline
- Keep rules scoped/pragmatic for this plugin codebase

## Tasks

### A. Dependency + Config
- [ ] Add `eslint-plugin-obsidianmd` dependency to project tooling.
- [ ] Update ESLint configuration to load and apply ObsidianMD plugin rules.
- [ ] Scope/override rules where needed to avoid non-actionable noise.

### B. Script and Workflow Alignment
- [ ] Ensure existing lint scripts run with ObsidianMD plugin active.
- [ ] Confirm lint output remains actionable for local development workflow.
- [ ] Document any required lint-command expectations in relevant `.mpx/` phase notes if needed.

## Validation
- [ ] Verify `pnpm lint` runs with ObsidianMD plugin checks enabled.
- [ ] Verify no plugin misconfiguration errors in lint/typecheck/build pipeline.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build`

## Completion Criteria
- [ ] ObsidianMD lint parity is integrated into local lint workflow.
- [ ] Tooling configuration is stable and maintainable.

---
Progress: 0/13 tasks complete
