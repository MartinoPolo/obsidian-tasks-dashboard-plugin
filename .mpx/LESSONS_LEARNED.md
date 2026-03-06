# Lessons Learned

## CM6 Virtualization & Issue Collapse

### How Obsidian Live Preview (CodeMirror 6) Renders Code Blocks

- CM6 uses **viewport-based rendering** — only visible lines + a small buffer are in the DOM
- `.cm-embed-block` elements (code block widgets) are **destroyed** when scrolled out and **re-created** when scrolled back in
- `document.querySelectorAll()` only finds currently-rendered blocks, not all blocks in the document
- There is **no CM6 API to iterate all code blocks** regardless of viewport

### How `registerMarkdownCodeBlockProcessor` Works

- Obsidian calls the processor callback each time CM6 creates a widget for a code block entering the viewport
- This means `render()` runs fresh every time a block scrolls into view — it's not a one-time setup
- The processor is the reliable entry point for applying per-block state

### Collapse Architecture (Settings as Source of Truth)

**Correct pattern:** Store collapse state in `plugin.settings.collapsedIssues`, not in DOM.

**Flow for individual toggle:**
1. User clicks chevron → toggle `plugin.settings.collapsedIssues[issueId]`
2. `saveSettings()` persists immediately
3. `setIssueCollapsed()` applies CSS classes to visible DOM (`.tdc-collapsed`, `.tdc-issue-content-collapsed`)
4. When block scrolls out and back in, `render()` reads settings → applies correct state

**Flow for Collapse All / Expand All:**
1. Parse dashboard markdown file to get ALL issue IDs (active + archived)
2. Update `plugin.settings.collapsedIssues` for every ID
3. `applyCollapseToControlBlocks()` — immediate CSS for visible blocks
4. `plugin.triggerDashboardRefresh()` — fires `tasks-dashboard:refresh` event
5. `ReactiveRenderChild` re-runs `render()` for all visible blocks with updated settings
6. Off-viewport blocks get correct state when CM6 re-creates them on scroll

### Failed Approach: MutationObserver with Timeout

Previously used a `MutationObserver` on the dashboard element to catch blocks entering the DOM after "Collapse All". Problems:
- **8-second timeout** — blocks scrolled into view after timeout were missed
- **Only worked for collapse**, not expand (no observer set up for expand)
- **Unnecessary** — CM6's widget re-creation already calls `render()` which reads settings

### CSS Sibling Rule for Quick-Hide

```css
.cm-embed-block:has(.tdc-collapsed)
  + .cm-embed-block:not(:has(.block-language-tasks-dashboard-controls)):not(:has(.tdc-assigned-issues-details)) {
  display: none !important;
}
```

- Provides instant visual hide of content block (next sibling) without waiting for JS
- Must exclude assigned issues section (`:not(:has(.tdc-assigned-issues-details))`) to prevent collapsing the last active issue from hiding the entire assigned issues section
- The JS walker (`collectIssueContentBlocks`) must also stop at assigned issues boundary

### Key Takeaway

**Don't fight CM6's virtualization — work with it.** Store state in plugin settings, apply it in `render()`, and trust CM6 to call `render()` when blocks enter the viewport. DOM-level hacks (MutationObservers, timeouts) are fragile and unnecessary when the render pipeline already reads from settings.

## Obsidian Tooltips

Use `setTooltip(el, text, { delay: 500 })` from `obsidian` for all tooltips. Never use `title` (ugly system tooltip) or raw `aria-label` (slow, no delay control). Using both causes dual tooltips. One tooltip mechanism per element.
