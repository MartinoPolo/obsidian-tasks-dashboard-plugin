# Phase 1: Bug Fixes - Specification

**Status:** Not Started
**Dependencies:** None

## Objective
Fix critical bugs that affect daily usage: progress refresh, backlinks with spaces, command registration, create files button, and task query tree display.

## Scope
- Fix progress indicator not updating when tasks toggled from dashboard (Req 1)
- Fix backlink to dashboard breaking when name has spaces (Req 2)
- Fix per-dashboard command registration / hardcoded shortcuts (Req 5)
- Make "Create Files" button idempotent (Req 11)
- Add `show tree` to task queries for subtask display (Req 12)

## Out of Scope
- New features (collapsible, delete, etc.)
- GitHub enhancements
- UI/UX improvements beyond bug fixes

## Deliverables
- Progress updates correctly on task toggle from dashboard
- Backlinks work with spaces in dashboard names
- Per-dashboard commands register properly, no hardcoded shortcuts
- Create Files button is safe to click repeatedly
- Task queries show subtask hierarchy

## Notes
- Progress refresh is the highest-impact bug — affects core workflow
- Backlink fix likely in IssueManager.ts where links are generated
- Command registration issue likely in main.ts onload()
- `show tree` is a one-line addition to task query generation in DashboardWriter.ts
