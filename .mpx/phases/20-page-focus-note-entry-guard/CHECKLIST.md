# Phase 20: Page Focus Note-Entry Guard - Checklist

**Status:** Planned
**Dependencies:** Existing issue-note open/create flow, active file lifecycle handlers

## Objective
Restrict smart cursor repositioning to note-entry events so direct in-note clicks always preserve user cursor intent.

## Scope
- Gate auto-reposition to explicit note-entry/open events
- Prevent reposition when user clicks in an already-open issue note

## Tasks

### A. Event Source Gating
- [ ] Identify all smart cursor reposition entry points for issue notes.
- [ ] Introduce explicit event-source guard that allows reposition only for note-entry/open triggers.
- [ ] Keep fallback-to-end behavior intact for allowed note-entry events.

### B. Click Preservation
- [ ] Detect direct user click placement in already-open issue notes.
- [ ] Skip auto-reposition for click-driven cursor updates.
- [ ] Verify no delayed/re-entrant reposition runs after click placement.

## Validation
- [ ] Verify opening a newly created issue note still lands at end of `## Tasks` (fallback: end of file).
- [ ] Verify clicking inside an already-open issue note preserves clicked cursor location.
- [ ] Verify no regression in existing note-entry autofocus behavior.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build`

## Completion Criteria
- [ ] Smart reposition runs only on note-entry events.
- [ ] Direct clicks in open notes are never overridden by auto-focus logic.

---
Progress: 0/14 tasks complete
