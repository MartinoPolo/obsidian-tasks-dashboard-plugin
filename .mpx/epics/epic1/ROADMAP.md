# Implementation Roadmap

Project: Tasks Dashboard Plugin
Updated: 2026-03-10

This file is the high-level planning source of truth.
Detailed execution tasks and decisions live in `.mpx/phases/*/CHECKLIST.md`.

## Current State

- Completed phases: 01-21, 28-29.
- In-progress phases from unchecked SPEC requirements: 22-27 (implemented with manual verification blockers).

## Completed Phases (Concise)

- Phases 01-15 delivered core dashboard control, issue lifecycle, keyboard-first creation flow, GitHub integration, project-folder tooling, layout/access hardening, and settings UX collapse.
- Phases 16-19 delivered worktree integration, plugin-wide collapse/expand hotkeys, optional overflow UX polish, and dashboard action visibility improvements.
- Phases 20-21 delivered note-entry-only cursor focus behavior and modal navigation/backspace propagation guards.
- Phase 28 delivered `eslint-plugin-obsidianmd` integration with pragmatic rule scoping in local lint workflow.
- Phase 29 delivered header badges (branch/PR/issue state), responsive badge compaction, right-click refresh, PR accent on header bottom border, removed embedded GitHub cards, priority toggle per dashboard, removed standalone GitHub links from issue notes.

## In-Progress Phases (From SPEC Unchecked Requirements)

### Worktrees

- Phase 22: worktree-state-metadata-and-recovery

### GitHub Integration

- Phase 23: github-search-relevance-and-assigned-feed

### Issue Creation Workflow

- Phase 24: issue-creation-flow-reorder-and-worktree-merge

### Issue Card / Layout

- Phase 25: issue-card-layout-and-tooltip-polish

### Colors

- Phase 26: theme-aware-color-allocation-and-picker-expansion

### Dashboard

- Phase 27: dashboard-howto-dedup-and-assigned-section



## Unphased Backlog

- OAuth authentication for github (alternative to PAT)
