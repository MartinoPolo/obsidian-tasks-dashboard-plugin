# Phase 2: Core UX Improvements - State

Last Updated: 2026-02-08

## Status
Not Started

## Progress
0/10 tasks complete (0%)

## Decisions Made
None yet

## Blockers
Phase 1 must complete first

---

## Session Handoff

### 2026-02-08
**Progress This Session:**
- Phase created

**Key Decisions:**
- None yet

**Issues Encountered:**
- What went wrong: N/A
- What NOT to do: N/A
- What we tried: N/A
- How we handled it: N/A

**Next Steps:**
1. Start after Phase 1 complete
2. Begin with collapsible issues (most visible improvement)

**Critical Files:**
- `src/dashboard/DashboardRenderer.ts` — collapse UI, delete button
- `main.ts` — file-open handler for cursor positioning
- `src/dashboard/DashboardWriter.ts` — sort logic, delete method
- `src/issues/IssueManager.ts` — delete file method

**Working Memory:**
- Collapsed state in data.json keyed by issue ID slug
- Archive icon: box-arrow-down; Delete icon: trash
