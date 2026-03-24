# Phase 5: Color Picker Improvements + Closed Issue Appearance

**Status:** Not Started
**Dependencies:** Phase 1 (Badge Icons -- for closed-issue state detection)

## Objective

Improve the color picker UX (rename label, add preview) and apply a visual overlay to fully-closed issues without modifying stored colors.

## Scope

- Rename "Text color" picker label to "Custom color"
- Add letter "A" preview rendered in the selected custom color
- CSS grayscale overlay for closed issues (merged PR + remote deleted + GitHub issue closed)
- Preserved stored color for reopening

## Out of Scope

- Modifying the color palette itself
- Badge contrast adaptation (Phase 04)
- Color picker responsive layout

---

## Tasks

### Color Picker

- [ ] Rename "Text color" picker label to "Custom color"
      In `dashboard-issue-color-dropdown.ts`, locate the text input label for the custom color picker. Change the label text from "Text color" (or whatever the current label is) to "Custom color". This is a string-only change.

- [ ] Add letter "A" preview in the custom color picker input area
      Render a letter "A" next to or inside the custom color input field. The "A" is rendered in the currently selected custom color value (from the text input). Update the "A" color reactively as the user types/selects a new color. This gives immediate visual feedback of how the text color looks against the issue background. Place the preview inside the color input area so it is contextually obvious.

### Closed Issue Appearance

- [ ] Detect "fully closed" issue state from git status
      An issue is "fully closed" when all three conditions are met: (1) `aggregatePrState === 'merged'` or `aggregatePrState === 'closed'`, (2) `branchStatus === 'remote-gone'` or `branchStatus === 'deleted'`, (3) at least one linked GitHub issue has `state === 'closed'`. Compute this as a derived boolean (`isFullyClosed`) in `IssueHeader.svelte` from `gitStatus`. If there are no linked GitHub issues, the issue is not considered fully closed (condition 3 requires at least one closed issue).

- [ ] Apply CSS grayscale overlay to fully-closed issues
      When `isFullyClosed === true`, apply `filter: grayscale(0.8) opacity(0.7)` to the issue card container. Do NOT modify `plugin.settings.issueColors[issueId]` -- the stored color must be preserved so reopening restores the original appearance. Apply the filter via a CSS class (e.g., `tdc-issue-fully-closed`) toggled on the issue surface element. The filter should affect the entire issue card (header + body), not just the header.

### Completion Criteria

- [ ] Color picker label reads "Custom color" instead of "Text color"
- [ ] Letter "A" preview shows in the picker, rendered in the selected color
- [ ] Fully-closed issues appear grayed out with `grayscale(0.8) opacity(0.7)`
- [ ] Stored issue color is not modified by the overlay
- [ ] Reopening an issue (removing any closed condition) restores full color

---

Progress: 0/4 tasks complete

## Decisions

[Decisions made during execution, with reasoning]

## Blockers

None
