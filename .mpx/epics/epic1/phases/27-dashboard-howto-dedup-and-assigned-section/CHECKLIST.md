# Phase 27: Dashboard How-To Dedup and Assigned Section - Checklist

**Status:** In Progress
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
- [x] Ensure dashboard contains exactly one `How to Use This Dashboard` section instance.
- [x] Deduplicate constants/rendering paths that can emit duplicate How-To sections.
- [x] Prevent duplicate How-To sections after rebuild operations.
- [x] Update How-To section content for latest controls and explicitly state section can be deleted.

### B. Collapse State Reliability
- [x] Persist per-issue collapsed/expanded state reliably across renders/reloads for all issues.
- [x] Ensure collapse-state hydration applies to complete dashboard issue set.
- [x] Harden `Collapse all` targeting for all dashboard issues (not only visible/rendered subset).

### C. Assigned Issues Section + Worktree Action
- [x] Add `Assigned Issues` section for dashboard-linked repository context.
- [x] Auto-fetch issues assigned to current user for linked repository.
- [x] Provide one-click worktree creation actions from assigned issues section entries.

## Validation
- [ ] Verify only one How-To section exists after create/rebuild/edit cycles. (Blocked: browser verification skipped per request.)
- [ ] Verify updated How-To content is rendered and explicitly mentions deletable section behavior. (Blocked: browser verification skipped per request.)
- [ ] Verify collapse state persists for all issues across reload/re-render. (Blocked: browser verification skipped per request.)
- [ ] Verify `Collapse all` applies to full dashboard dataset. (Blocked: browser verification skipped per request.)
- [ ] Verify `Assigned Issues` section fetches assigned issues and supports one-click worktree creation. (Blocked: browser verification skipped per request.)
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm build`

## Completion Criteria
- [ ] How-To section is single-instance, current, and rebuild-stable. (Blocked: manual/browser verification skipped per request.)
- [ ] Collapse-state behavior is reliable and full-dataset-aware. (Blocked: manual/browser verification skipped per request.)
- [ ] Assigned-issues workflow is available in dashboard context with worktree action support. (Blocked: manual/browser verification skipped per request.)

---
Progress: 13/21 tasks complete
