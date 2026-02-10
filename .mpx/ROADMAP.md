# Implementation Roadmap

Project: Tasks Dashboard Plugin
Updated: 2026-02-10
Total Phases: 11

## Phase Summary

| # | Name | Status | Tasks | Dependencies |
|---|------|--------|-------|--------------|
| 1 | Bug Fixes | Complete | 11/11 | None |
| 2 | Core UX Improvements | Complete | 16/16 | Phase 1 |
| 3 | GitHub Core | Complete | 23/23 | Phase 1 |
| 4 | GitHub Multi-Links | Complete | 8/8 | Phase 3 |
| 5 | GitHub Repo & Rate Limits | Complete | 8/8 | Phase 3 |
| 6 | GitHub Quick-Open | Complete | 7/7 | Phase 3 (soft: 5) |
| 7 | Issue UX | Complete | 10/10 | Phase 2 |
| 8 | Project Folder | Not Started | 0/8 | Phase 2 |
| 9 | Note Import | Not Started | 0/7 | Phase 2 |
| 10 | Dashboard Deletion | Not Started | 0/7 | Phases 4–9 |
| 11 | Color Customization | Not Started | 0/6 | Phases 4–9 |

## Dependency Graph
```
Phase 1 ──┬── Phase 2 ──┬── Phase 7 (complete)
           │             ├── Phase 8 (project-folder)
           │             └── Phase 9 (note-import)
           │
           └── Phase 3 (complete) ──┬── Phase 4 (multi-links)
                                    ├── Phase 5 (repo/rate-limits)
                                    └── Phase 6 (quick-open, soft dep on 5)

Phases 4,5,6,8,9 → Phase 10 (dashboard-deletion)
Phases 4,5,6,8,9 → Phase 11 (color-customization)
```

## Phase Details

### Phase 1: Bug Fixes [Complete]
Fix critical bugs: progress refresh, backlinks with spaces, command registration, create files button, show tree.
**Reqs:** 1, 2, 5, 11, 12

### Phase 2: Core UX Improvements [Complete]
Collapsible issues, smart cursor, separate archive/delete, date sorting.
**Reqs:** 3, 4, 9, 10

### Phase 3: GitHub Core [Complete]
No-GitHub mode, repo picker + search scopes, enter key fix, better link display, embedded cards in notes, add-after-creation.
**Reqs:** 6a, 6b, 6c, 6d, 6g, 6h

### Phase 4: GitHub Multi-Links
Multiple GitHub issues/PRs per dashboard issue, card type switching, rebuild with GitHub cards.
**Reqs:** 6i, 6e, 6f

### Phase 5: GitHub Repo & Rate Limits [Complete]
Link GitHub repositories to issues, display API rate limits.
**Reqs:** 6j, 6k

### Phase 6: GitHub Quick-Open [Complete]
Quick-open button in issue controls for linked GitHub URLs.
**Reqs:** 6l

### Phase 7: Issue UX [Complete]
Move to top/bottom, rename with state migration, per-issue header color.
**Reqs:** 15, 16, 17

### Phase 8: Project Folder
Link on-disk project folder to dashboard with explorer/terminal buttons.
**Reqs:** 7

### Phase 9: Note Import
Import existing vault notes as dashboard issues with autocomplete.
**Reqs:** 8

### Phase 10: Dashboard Deletion
Delete dashboard from settings with confirmation and data cleanup.
**Reqs:** 13

### Phase 11: Color Customization
Customizable priority colors and dashboard section backgrounds.
**Reqs:** 14
