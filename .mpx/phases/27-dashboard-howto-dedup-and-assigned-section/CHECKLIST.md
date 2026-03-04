# Phase 27: Dashboard How-To Dedup and Assigned Section - Checklist

**Status:** Planned
**Dependencies:** Dashboard renderer/writer/parser markers, Phase 19 collapse behavior, GitHub linked-repository context

## Objective
Stabilize dashboard section rendering/content by deduplicating the How-To section, ensuring full-dataset collapse behavior, preserving collapse state, and adding assigned-issues section support.

## Scope
- Enforce single How-To section instance and updated content
- Persist per-issue collapse/expand state across render/reload
- Re-validate and harden collapse-all behavior against full dataset
- Add assigned-issues section with one-click worktree creation

## Tasks

### A. How-To Section Dedup + Content
- [ ] Ensure dashboard contains exactly one `How to Use This Dashboard` section instance.
- [ ] Deduplicate constants/rendering paths that can emit duplicate How-To sections.
- [ ] Prevent duplicate How-To sections after rebuild operations.
- [ ] Update How-To section content for latest controls and explicitly state section can be deleted.

### B. Collapse State Reliability
- [ ] Persist per-issue collapsed/expanded state reliably across renders/reloads for all issues.
- [ ] Ensure collapse-state hydration applies to complete dashboard issue set.
- [ ] Harden `Collapse all` targeting for all dashboard issues (not only visible/rendered subset).

### C. Assigned Issues Section + Worktree Action
- [ ] Add `Assigned Issues` section for dashboard-linked repository context.
- [ ] Auto-fetch issues assigned to current user for linked repository.
- [ ] Provide one-click worktree creation actions from assigned issues section entries.

## Validation
- [ ] Verify only one How-To section exists after create/rebuild/edit cycles.
- [ ] Verify updated How-To content is rendered and explicitly mentions deletable section behavior.
- [ ] Verify collapse state persists for all issues across reload/re-render.
- [ ] Verify `Collapse all` applies to full dashboard dataset.
- [ ] Verify `Assigned Issues` section fetches assigned issues and supports one-click worktree creation.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build`

## Completion Criteria
- [ ] How-To section is single-instance, current, and rebuild-stable.
- [ ] Collapse-state behavior is reliable and full-dataset-aware.
- [ ] Assigned-issues workflow is available in dashboard context with worktree action support.

---
Progress: 0/23 tasks complete
