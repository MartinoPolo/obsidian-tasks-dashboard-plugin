# Implementation Roadmap

Project: Tasks Dashboard Plugin
Updated: 2026-02-14
Total Phases: 13

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
| 8 | Project Folder | Complete | 13/13 | Phase 2 |
| 9 | Note Import | Complete | 7/7 | Phase 2 |
| 10 | Dashboard Deletion | Complete | 7/7 | Phases 4–9 |
| 11 | Color Customization | Skipped | 0/6 | Phases 4–9 |
| 12 | Code Quality Refactoring | Complete | 40/40 | None |
| 13 | Code Hardening | Complete | 24/24 | Phase 12 |

## Dependency Graph
```
Phase 1 ──┬── Phase 2 ──┬── Phase 7 (complete)
           │             ├── Phase 8 (complete)
           │             └── Phase 9 (complete)
           │
           └── Phase 3 (complete) ──┬── Phase 4 (multi-links)
                                    ├── Phase 5 (complete)
                                    └── Phase 6 (complete)

Phases 4,5,6,8,9 → Phase 10 (complete)
Phases 4,5,6,8,9 → Phase 11 (skipped)

Phase 12 (code-quality-refactoring) — independent, no deps

Phase 12 → Phase 13 (code-hardening)
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

### Phase 8: Project Folder [Complete]
Link on-disk project folder to dashboard with explorer/terminal buttons.
**Reqs:** 7

### Phase 9: Note Import [Complete]
Import existing vault notes as dashboard issues with autocomplete.
**Reqs:** 8

### Phase 10: Dashboard Deletion [Complete]
Delete dashboard from settings with confirmation and data cleanup.
**Reqs:** 13

### Phase 11: Color Customization [Skipped]
Customizable priority colors and dashboard section backgrounds. Per-issue color picker covers the use case.
**Reqs:** 14

### Phase 12: Code Quality Refactoring [Complete]
Eliminate ~800 lines of duplication across 8 groups. Extract shared utilities (GitHub URL parsing, dashboard paths, display helpers), unify duplicate patterns (search, move operations, YAML building, button creation), split oversized files (DashboardRenderer 989→~500 lines, IssueModal 570→3 files). No functional changes.
**Reqs:** 18

### Phase 13: Code Hardening [Complete]
Security fixes (command injection, prototype pollution, URL validation), performance (parallel I/O, memory leaks, async render, LRU cache, debounce), error handling (TFile guards, typed API errors, race conditions, spawn failures, loadData validation, onload safety), code quality (split long functions, unify sort logic, extract constants, convention fixes). 24 tasks across 4 groups.
**Reqs:** 19
