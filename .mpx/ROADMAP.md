# Implementation Roadmap

Project: Tasks Dashboard Plugin
Updated: 2026-03-01

This file is the high-level planning source of truth.
Detailed task logs and phase-level decisions stay in `.mpx/phases/*/`.

## Current State

- Completed phases: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15.
- Remaining planned phases: 11.

## Future Work

### Phase 11 — Color Customization

- Status: In progress (`7/10`)
- Dependency: Phases 4, 5, 6, 8, 9 (already complete)
- Scope: adaptive color customization with one main issue color and derived controls/checklist backgrounds, plus per-dashboard Active/Notes/Archive section body colors
- Current focus: deliver checklist and controls background derivation first, then section body coloring and rebuild-safe metadata handling

## Unphased Backlog

- OAuth authentication (alternative to PAT)
- Dynamic priority levels (user-defined)

## Detail Location

- Phase checklists and per-phase decisions: `.mpx/phases/*/CHECKLIST.md` and optional `LESSONS_LEARNED.md` / `DECISIONS.md`
