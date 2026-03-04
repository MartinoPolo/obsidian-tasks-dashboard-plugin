# Phase 23: GitHub Search Relevance and Assigned Feed - Checklist

**Status:** Planned
**Dependencies:** Phase 03/04/05/06 GitHub services, search modal scopes and ranking paths

## Objective
Improve GitHub search quality and add an optional assigned-issues dashboard feed for linked repositories.

## Scope
- Fix `My repositories` result reliability
- Repair or remove low-quality `All repositories` scope
- Add recency + assignment-aware ranking
- Add optional foldable `Assigned Issues` section with one-click conversion

## Tasks

### A. Scope Reliability
- [ ] Fix repository-scoped search so `My repositories` returns issue/PR results when auth/scopes are valid.
- [ ] Add regression coverage for `My repositories` empty-result failure mode.
- [ ] Evaluate `All repositories` relevance quality against query-term and identifier matching requirements.
- [ ] If relevance quality is sufficient, repair ranking/filtering; otherwise remove `All repositories` scope cleanly.

### B. Ranking + Incremental Behavior
- [ ] Sort offered issue/PR results by recency.
- [ ] Apply assignment-aware boost so assigned-to-me items rank first.
- [ ] Preserve incremental text search responsiveness.
- [ ] Preserve incremental number/id search responsiveness.

### C. Assigned Issues Section (Optional)
- [ ] Add optional foldable `Assigned Issues` dashboard section for linked repositories.
- [ ] Fetch assigned GitHub issues for current user/repository context.
- [ ] Provide one-click conversion from assigned GitHub issue to dashboard issue.

## Validation
- [ ] Verify `My repositories` scope returns relevant issue/PR results for valid auth/scopes.
- [ ] Verify `All repositories` mode is either relevant and stable or removed.
- [ ] Verify recency sort + assigned-first ranking produce expected ordering.
- [ ] Verify fast incremental typing/number lookup remains responsive.
- [ ] Verify optional `Assigned Issues` section folds/unfolds and supports one-click conversion.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build`

## Completion Criteria
- [ ] GitHub search scopes produce relevant, predictable results.
- [ ] Ranking reflects both recency and assignment priority.
- [ ] Assigned-issues feed is usable and optionally visible for linked repositories.

---
Progress: 0/24 tasks complete
