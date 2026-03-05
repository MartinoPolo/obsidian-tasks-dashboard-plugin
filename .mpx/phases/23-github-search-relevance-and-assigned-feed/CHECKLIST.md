# Phase 23: GitHub Search Relevance and Assigned Feed - Checklist

**Status:** In Progress
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
- [x] Fix repository-scoped search so `My repositories` returns issue/PR results when auth/scopes are valid.
- [ ] Add regression coverage for `My repositories` empty-result failure mode. (Pending: no automated test harness in this repository.)
- [ ] Evaluate `All repositories` relevance quality against query-term and identifier matching requirements. (Pending: `All repositories` removed; no archived evaluation artifact.)
- [x] If relevance quality is sufficient, repair ranking/filtering; otherwise remove `All repositories` scope cleanly.

### B. Ranking + Incremental Behavior
- [x] Sort offered issue/PR results by recency.
- [x] Apply assignment-aware boost so assigned-to-me items rank first.
- [x] Preserve incremental text search responsiveness.
- [x] Preserve incremental number/id search responsiveness.

### C. Assigned Issues Section (Optional)
- [x] Add optional foldable `Assigned Issues` dashboard section for linked repositories.
- [x] Fetch assigned GitHub issues for current user/repository context.
- [x] Provide one-click conversion from assigned GitHub issue to dashboard issue.

## Validation
- [ ] Verify `My repositories` scope returns relevant issue/PR results for valid auth/scopes. (Blocked: browser verification skipped per request.)
- [ ] Verify `All repositories` mode is either relevant and stable or removed. (Blocked: browser verification skipped per request.)
- [ ] Verify recency sort + assigned-first ranking produce expected ordering. (Blocked: browser verification skipped per request.)
- [ ] Verify fast incremental typing/number lookup remains responsive. (Blocked: browser verification skipped per request.)
- [ ] Verify optional `Assigned Issues` section folds/unfolds and supports one-click conversion. (Blocked: browser verification skipped per request.)
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm build`

## Completion Criteria
- [ ] GitHub search scopes produce relevant, predictable results. (Blocked on manual verification above.)
- [ ] Ranking reflects both recency and assignment priority. (Blocked on manual verification above.)
- [ ] Assigned-issues feed is usable and optionally visible for linked repositories. (Blocked on manual verification above.)

---
Progress: 12/24 tasks complete
