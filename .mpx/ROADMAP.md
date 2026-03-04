# Implementation Roadmap

Project: Tasks Dashboard Plugin
Updated: 2026-03-04

This file is the high-level planning source of truth.
Detailed execution tasks and decisions live in `.mpx/phases/*/CHECKLIST.md`.

## Current State

- Completed phases: 01-21, 28.
- Planned phases from unchecked SPEC requirements: 22-27.

## Completed Phases (Concise)

- Phases 01-15 delivered core dashboard control, issue lifecycle, keyboard-first creation flow, GitHub integration, project-folder tooling, layout/access hardening, and settings UX collapse.
- Phases 16-19 delivered worktree integration, plugin-wide collapse/expand hotkeys, optional overflow UX polish, and dashboard action visibility improvements.
- Phases 20-21 delivered note-entry-only cursor focus behavior and modal navigation/backspace propagation guards.
- Phase 28 delivered `eslint-plugin-obsidianmd` integration with pragmatic rule scoping in local lint workflow.

## Planned Phases (From SPEC Unchecked Requirements)

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
