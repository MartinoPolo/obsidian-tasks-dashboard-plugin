# Phase 4: GitHub Multi-Links - Checklist

**Status:** In Progress
**Dependencies:** Phase 3

## Objective
Support multiple GitHub issues/PRs per dashboard issue, card type switching, and dashboard rebuild with GitHub cards.

## Multiple GitHub Links (Req 6i)
- [x] Change frontmatter from single `github` to `github_links` array
- [x] Migrate existing single links to array format
- [x] Render multiple GitHub cards per issue
- [x] Each card independently refreshable

## Card Type Switching (Req 6e)
- [ ] Re-render all dashboard GitHub cards when display mode changes in settings

## Rebuild Includes GitHub (Req 6f)
- [ ] Dashboard rebuild button also refreshes GitHub card data

## Completion Criteria
- [ ] Multiple links stored and rendered correctly
- [ ] `pnpm build` passes

---
Progress: 4/8 tasks complete
