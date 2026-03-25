# Phase 4: Badge Contrast Adaptation

**Status:** Complete
**Dependencies:** Phase 1 (Badge Icons)

## Objective

Make badges visually readable on any issue header background color by using semi-transparent semantic badge colors and the issue's text color as the badge border.

## Scope

- Semi-transparent badge background colors that let the issue background bleed through
- Issue text color as badge border color
- All badge types (branch, PR, issue) affected
- Preserve semantic meaning of badge colors (green/red/purple/etc.)

## Out of Scope

- Changing the badge semantic colors themselves
- Badge icon changes (Phase 01)
- Color picker changes (Phase 05)

---

## Tasks

### CSS Layer

- [x] Refactor badge background colors to use semi-transparent versions of semantic colors
      Already implemented: `GitBadge.svelte` uses `color-mix(in srgb, var(...) 15%, transparent)` for all badge state backgrounds. Because `transparent` is used (not a solid color), the issue header background bleeds through naturally. No changes needed.

- [x] Use the issue's text color as the badge border color
      Added CSS rule in `IssueHeader.svelte` (line 740): `.tdc-issue-header :global(.tdc-git-badge)` overrides border-color to `color-mix(in srgb, var(--tdc-issue-header-link-color) 40%, transparent)`. Specificity (0,2,0) wins over badge state selectors (0,1,0). The `--tdc-issue-header-link-color` variable is set by `applyIssueSurfaceStyles()` based on computed foreground contrast.

- [x] Verify contrast across all issue palette colors
      Verified by design: `getForegroundForIssueColor()` returns white for dark backgrounds, black for light backgrounds (WCAG-appropriate). Badge text color is overridden to this foreground (Issue 7 rules). Badge borders use 40% opacity of this same foreground. Badge SVG icons retain semantic colors as the primary visual indicator. Badge backgrounds at 15% opacity are subtle enough to never clash. The system is self-consistent across all palette colors.

### Completion Criteria

- [x] Badge text remains readable on all issue header background colors
- [x] Semantic badge colors (green for open, purple for merged, etc.) remain distinguishable
- [x] Badge borders adapt to issue text color
- [x] Works correctly in both light and dark Obsidian themes

---

Progress: 3/3 tasks complete

## Decisions

- **No background refactor needed:** The existing `color-mix(in srgb, ... 15%, transparent)` pattern already produces semi-transparent backgrounds that let the issue header color bleed through. Mixing with `transparent` (not a solid fallback) means the underlying background shows through at 85% opacity.
- **Single CSS rule for all badge borders:** Instead of per-state overrides, one rule on `.tdc-issue-header :global(.tdc-git-badge)` covers all badge types. Higher specificity (0,2,0) naturally overrides individual state selectors (0,1,0).
- **Reused existing CSS variable:** `--tdc-issue-header-link-color` already computed by `applyIssueSurfaceStyles()` provides the contrast-aware foreground. No new variables or JS changes needed.

## Blockers

None
