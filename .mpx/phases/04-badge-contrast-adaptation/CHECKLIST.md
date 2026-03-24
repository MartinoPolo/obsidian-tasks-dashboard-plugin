# Phase 4: Badge Contrast Adaptation

**Status:** Not Started
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

- [ ] Refactor badge background colors to use semi-transparent versions of semantic colors
      Currently `GitBadge.svelte` uses `color-mix(in srgb, var(--tdc-git-pr-open) 15%, transparent)` for backgrounds. This mixes the semantic color with transparent, which works on the default background but not on colored issue headers. Change the approach: use `rgba` or `color-mix` with a lower opacity so the issue header background bleeds through. For example, `background: color-mix(in srgb, var(--tdc-git-pr-open) 20%, transparent)` already partially does this. Verify the opacity level provides sufficient contrast for all semantic colors against all palette issue colors. Test with light and dark themes.

- [ ] Use the issue's text color as the badge border color
      The issue header sets a text color based on the issue color (contrast-aware). Pass this text color down to the badges. In `IssueHeader.svelte`, compute the issue's text color and pass it as a CSS custom property (e.g., `--tdc-issue-text-color`) on the badges container. In `GitBadge.svelte`, use `border-color: var(--tdc-issue-text-color, currentColor)` with appropriate opacity. This ensures badges have visible borders regardless of the issue background color.

- [ ] Verify contrast across all issue palette colors
      Test every color in the issue color palette (from `getThemeAwareIssueColorPalette()`) combined with every badge state (branch-active, pr-open, pr-merged, pr-closed, pr-draft, issue-open, issue-closed, etc.). Ensure WCAG AA contrast ratio (4.5:1 for text, 3:1 for large text/icons) between badge text and badge background. Document any edge cases.

### Completion Criteria

- [ ] Badge text remains readable on all issue header background colors
- [ ] Semantic badge colors (green for open, purple for merged, etc.) remain distinguishable
- [ ] Badge borders adapt to issue text color
- [ ] Works correctly in both light and dark Obsidian themes

---

Progress: 0/3 tasks complete

## Decisions

[Decisions made during execution, with reasoning]

## Blockers

None
