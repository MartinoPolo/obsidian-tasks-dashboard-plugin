# Phase 11: Color Customization - Checklist

**Status:** In progress
**Dependencies:** Phases 4, 5, 6, 8, 9

## Objective
Implement adaptive issue-card color customization with a single main issue color that derives readable controls/checklist surfaces.

## Scope
- Reading and Live Preview support for color rendering
- Per-issue derived backgrounds for checklist and controls from one main color
- Preserve parser/writer marker invariants

## Implementation Tasks
- [x] Add color derivation utilities for theme-aware surfaces (header, controls, checklist)
- [x] Extend settings/types with per-issue color fields
- [x] Apply issue-level style variables/hooks in renderer and CSS
- [x] Remove section-level color settings and rendering hooks (Active/Notes/Archive)
- [ ] Preserve frontmatter/style metadata during dashboard rebuild where required
- [ ] Document color behavior and configuration in README

## Validation
- [x] `pnpm typecheck`
- [ ] `pnpm lint`
- [x] `pnpm build`

## Completion Criteria
- [ ] One main issue color reliably derives readable checklist and controls backgrounds in light/dark themes
- [ ] Rebuild flow does not break section markers or issue markers

---
Progress: 6/10 tasks complete
