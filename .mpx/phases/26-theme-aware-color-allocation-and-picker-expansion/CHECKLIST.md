# Phase 26: Theme-Aware Color Allocation and Picker Expansion - Checklist

**Status:** Planned
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
- [ ] Add explicit light/dark variants for issue color palette values.
- [ ] Ensure selected colors remain balanced/readable in both themes.
- [ ] Use theme-appropriate issue title/link text color (light text in dark mode, dark text in light mode).

### B. Global Color Allocation Lifecycle
- [ ] Track globally used issue colors across vault dashboards/issues.
- [ ] Disable already-assigned colors in creation color-picker step.
- [ ] Auto-preselect next available unused color by default.
- [ ] Release reserved color when issue is deleted.
- [ ] Release reserved color when issue is archived.
- [ ] On issue-card color change, release old color and reserve new color in allocation tracking.

### C. Picker UX + Labeling
- [ ] Expand palette to grouped multi-column shades with at least 25 colors.
- [ ] Optionally support 6x5 (30-color) layout when implementation permits.
- [ ] Update color-picker grid layout for expanded palette.
- [ ] Anchor header color picker as dropdown from issue-header color button (preferred).
- [ ] Keep centered/fallback placement only when anchored placement is unavailable.
- [ ] Rename color-action tooltip/title from `Header color` to `Issue color`.

## Validation
- [ ] Verify palette/colors are readable and balanced in both light and dark themes.
- [ ] Verify used colors are disabled and next unused color is auto-preselected in create flow.
- [ ] Verify delete/archive/color-change flows correctly release/reserve colors.
- [ ] Verify expanded palette count/layout requirements are met.
- [ ] Verify color picker opens anchored to header color action when possible and avoids off-screen placement.
- [ ] Verify tooltip/title label shows `Issue color`.
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build`

## Completion Criteria
- [ ] Color system is theme-aware, allocation-safe, and lifecycle-consistent.
- [ ] Expanded picker is usable and properly positioned.
- [ ] Color action labeling and text-contrast behavior match requirements.

---
Progress: 0/27 tasks complete
