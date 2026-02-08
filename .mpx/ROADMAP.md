# Implementation Roadmap

Project: Tasks Dashboard Plugin
Generated: 2026-02-08
Total Phases: 5

## Overview
Phased approach starting with critical bug fixes, then UX improvements, GitHub enhancements, new features, and finally polish. All existing features are preserved; phases focus exclusively on new work from CHECKLIST.md.

## Phase Summary

| Phase | Name | Status | Tasks | Dependencies |
|-------|------|--------|-------|--------------|
| 1 | Bug Fixes | Completed | 8 | None |
| 2 | Core UX Improvements | Completed | 16 | Phase 1 |
| 3 | GitHub Enhancements | Not Started | 14 | Phase 1 |
| 4 | New Features | Not Started | 10 | Phase 2 |
| 5 | Polish & Customization | Not Started | 7 | Phase 3, 4 |

## Dependency Graph
```
Phase 1 (Bug Fixes)
    ├──────────────┐
    ▼              ▼
Phase 2          Phase 3
(Core UX)        (GitHub)
    │              │
    ▼              │
Phase 4            │
(New Features)     │
    │              │
    ▼              ▼
Phase 5 (Polish & Customization)
```

## Phase Details

### Phase 1: Bug Fixes
**Goal:** Fix critical bugs — progress refresh, backlinks with spaces, shortcut registration, create files button
**Deliverables:** Working progress updates, correct backlinks, functional commands, idempotent create button
**Reqs:** 1, 2, 5, 11, 12

### Phase 2: Core UX Improvements
**Goal:** Improve daily workflow — collapsible issues, smart cursor, separate archive/delete, date sorting
**Deliverables:** Collapse/expand UI, cursor at ## Tasks, delete action, sort by date options
**Reqs:** 3, 4, 9, 10

### Phase 3: GitHub Enhancements
**Goal:** Level up GitHub integration — no-GitHub mode, repo picker, better links, multi-issue support, rate limits
**Deliverables:** Per-dashboard GitHub toggle, repo autocomplete, enter key fix, multiple GitHub links, rate limit display
**Reqs:** 6a-6j

### Phase 4: New Features
**Goal:** Add major new capabilities — project folder linking, existing note import
**Deliverables:** Project folder buttons (explorer/terminal), vault note import with autocomplete
**Reqs:** 7, 8

### Phase 5: Polish & Customization
**Goal:** Final polish — customizable colors, delete dashboard, rebuild improvements
**Deliverables:** Color settings, dashboard deletion with cleanup, GitHub card rebuild
**Reqs:** 13, 14
