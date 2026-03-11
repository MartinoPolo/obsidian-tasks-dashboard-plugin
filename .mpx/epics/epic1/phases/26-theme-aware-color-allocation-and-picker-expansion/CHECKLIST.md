# Phase 26: Theme-Aware Color Allocation and Picker Expansion - Checklist

**Status:** In Progress
**Dependencies:** Phase 11 (color customization), issue color persistence (`issueColors`), create/rename/archive/delete flows

## Objective
Introduce theme-aware color palettes and global color-allocation management so issue colors stay readable, unique-by-default, and correctly recycled.

## Scope
- Theme-aware light/dark palette variants
- Global used-color tracking and reservation/release lifecycle
- Next-available default color preselection
- Expanded grouped color palette (min 25 colors; optional 30 via 6x5)
- Theme-appropriate issue title/link text color
- Color-picker positioning and action-label rename

## Tasks

### A. Theme-Aware Palette + Text Contrast
- [x] Add explicit light/dark variants for issue color palette values.
- [x] Ensure selected colors remain balanced/readable in both themes.
- [x] Use theme-appropriate issue title/link text color (light text in dark mode, dark text in light mode).

### B. Global Color Allocation Lifecycle
- [x] Track globally used issue colors across vault dashboards/issues.
- [x] Disable already-assigned colors in creation color-picker step.
- [x] Auto-preselect next available unused color by default.
- [x] Release reserved color when issue is deleted.
- [x] Release reserved color when issue is archived.
- [x] On issue-card color change, release old color and reserve new color in allocation tracking.

### C. Picker UX + Labeling
- [x] Expand palette to grouped multi-column shades with at least 25 colors.
- [x] Optionally support 6x5 (30-color) layout when implementation permits.
- [x] Update color-picker grid layout for expanded palette.
- [x] Anchor header color picker as dropdown from issue-header color button (preferred).
- [x] Keep centered/fallback placement only when anchored placement is unavailable.
- [x] Rename color-action tooltip/title from `Header color` to `Issue color`.

## Validation
- [ ] Verify palette/colors are readable and balanced in both light and dark themes. _(Blocked: Manual browser verification skipped per request.)_
- [ ] Verify used colors are disabled and next unused color is auto-preselected in create flow. _(Blocked: Manual browser verification skipped per request.)_
- [ ] Verify delete/archive/color-change flows correctly release/reserve colors. _(Blocked: Manual browser verification skipped per request.)_
- [ ] Verify expanded palette count/layout requirements are met. _(Blocked: Manual browser verification skipped per request.)_
- [ ] Verify color picker opens anchored to header color action when possible and avoids off-screen placement. _(Blocked: Manual browser verification skipped per request.)_
- [ ] Verify tooltip/title label shows `Issue color`. _(Blocked: Manual browser verification skipped per request.)_
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm build`

## Completion Criteria
- [ ] Color system is theme-aware, allocation-safe, and lifecycle-consistent. _(Blocked: Manual browser verification skipped per request.)_
- [ ] Expanded picker is usable and properly positioned. _(Blocked: Manual browser verification skipped per request.)_
- [ ] Color action labeling and text-contrast behavior match requirements. _(Blocked: Manual browser verification skipped per request.)_

---
Progress: 18/27 tasks complete
