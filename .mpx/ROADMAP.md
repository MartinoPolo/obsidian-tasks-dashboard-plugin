# Implementation Roadmap

Project: Tasks Dashboard Plugin
Updated: 2026-03-01

This file is the high-level planning source of truth.
Detailed execution tasks and decisions live in `.mpx/phases/*/CHECKLIST.md`.

## Current State

- Completed phases: 01-15.
- Planned phases from unchecked SPEC requirements: 16-18.

## Completed Phases (Concise)

- Phases 01-15 delivered core dashboard control, issue lifecycle, keyboard-first creation flow, GitHub integration, project-folder tooling, layout/access hardening, and settings UX collapse.

## Planned Work

### Phase 16 — Worktree Integration

- Status: Planned
- Dependency context: existing issue creation flow, GitHub link selection flow, and safe process launch invariant (`spawn(..., { shell: false })`).
- Source requirements: `Worktree Integration (Planned)` in `.mpx/SPEC.md`.
- Deliverables:
	- `Add issue in worktree` action with GitHub-action-aligned visibility behavior.
	- Keyboard-driven prompt flow: name, color (presets + custom), priority, GitHub association.
	- Shared add-issue flow extension to include color selection for standard and worktree-enabled creation.
	- Post-input worktree setup command execution via `C:\_MP_projects\mxp-claude-code\scripts\setup-worktree.sh`.
	- Archive/delete worktree-removal confirmation and optional execution via `C:\_MP_projects\mxp-claude-code\scripts\remove-worktree.sh`.

### Phase 17 — Optional Overflow UX Improvements

- Status: Planned (Optional / Non-blocking)
- Dependency context: Phase 14 overflow/settings layout system.
- Source requirements: `Optional (Non-Blocking) UX Improvements` in `.mpx/SPEC.md`.
- Deliverables:
	- Optional icon-only overflow action tooltips.
	- Optional one-click layout reset at dashboard scope.
	- Optional lightweight save confirmation toast.

### Phase 18 — Plugin-Wide Dashboard Hotkeys

- Status: Planned
- Dependency context: explicitly depends on completion of Phase 16 worktree integration, including global `Add issue in worktree` behavior.
- Source requirements: `Plugin-Wide Dashboard Hotkeys (Planned)` in `.mpx/SPEC.md`.
- Deliverables:
	- Plugin-wide commands for `Collapse all issues` and `Expand all issues`.
	- Native Obsidian hotkey registration for both commands so bindings are managed in global Hotkeys settings.
	- Execution targeting the active dashboard context when command/hotkey is invoked.

## Assumptions (Ambiguous SPEC Areas)

- `global dashboard actions and/or per-issue actions` for `Add issue in worktree` is interpreted as: implement in all placements where existing GitHub add/link action is currently surfaced.
- `same visibility logic as the existing GitHub action/button` is interpreted as reusing current enablement conditions (GitHub enabled/auth/no-GitHub mode constraints) without introducing new visibility flags.
- `pass the selected color to the script` is interpreted as extending existing safe spawn argument passing (no shell interpolation), with color represented as a normalized hex value.
- `apply to the active dashboard context` for plugin-wide hotkeys is interpreted as operating on the dashboard currently opened/focused by the user at invocation time.

## Unphased Backlog

- OAuth authentication (alternative to PAT)
- Dynamic priority levels (user-defined)
