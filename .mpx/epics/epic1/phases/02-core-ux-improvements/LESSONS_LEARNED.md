# Lessons Learned

## Collapsing issue tasks in the dashboard

**Issue**
The issue collapse toggle only hid the progress UI and buttons. The Tasks query output remained visible in both Reading view and Live Preview. Attempts that relied on adjacent sibling selectors or scanning the markdown preview section failed because the Tasks plugin renders its output inside multiple wrapper nodes. The actual DOM sequence after the controls block includes a `.cm-embed-block` for the Tasks code fence, a `.block-language-tasks` wrapper, additional container divs, and a `ul.plugin-tasks-query-result`, followed by an `hr`.

**Resolution**
Use a sibling-based collapse scan that starts from the controls block (or its `.cm-embed-block` parent in Live Preview) and hides every subsequent sibling until the next `hr` or the next controls block. This reliably hides both the Tasks code fence and the rendered task list in both Reading and Live Preview, without needing to restructure the DOM or depend on fragile selectors. The collapse now toggles a `.tdc-issue-content-collapsed` class on those sibling blocks.

**Key takeaway**
Do not assume Tasks output is an immediate sibling of the controls block. Always handle the `.cm-embed-block` wrapper and the extra containers Tasks inserts in Live Preview when hiding or showing the tasks list.
