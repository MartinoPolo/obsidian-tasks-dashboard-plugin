 1. Color of the issue info icon should be the same as text color of the header. It should
   change background on hover to slightly gray
  2. Worktree icon should be green in active state
  3. The distance between worktree icon/button and issue info icon should be the same as
  between the other header action buttons. It seems there is a larger gap now, make it
  smaller.
  4. I need the badges with branch and PR state to be directly inside the header next to
  the worktree icon. The name of the branch should be trimmed to 16 characters. I'd also
  like it to be responsive in a way that when there's not enough space for showing all the
  buttons, title, branch name, and PR badge, these badges should change to icon only,
  keeping the color and icon representing branch/PR state.
  5. The PR badge should be clickable with a link to the PR
  6. Right click to PR/branch badge should show context menu similar to the on that is
  opened after clicking on sort button. It should have 1 item = Refresh which refreshes
  status for this one github item (branch/PR)
  7. Remove Github issue card from the dashboard issue card. I want the dashboard issue
  card to include:
  - the header with buttons and badges
  - the control panel with progress and other action buttons
  - the task section
  The section in between control and task section should be removed completely. We should
  also add a badge for GitHub issue state next to the PR and branch badges. It should also
  represent the issue state and have appropriate GitHub icons
  The GitHub issue summary will still be inside the issue node itself. The issue badge in
  the header should also be clickable with refresh in the right-click context menu and with
   URL after left-clicking
  8. We added an indication as GitHub state strip to the issue card. I would like the strip
   to be at the bottom border of the issue header and not left
  9. Add a dashboard setting option to disable priorities. This will remove the priority
  strips from issue cards. It will skip the priority setting step for all issue creation
  workflows but it will automatically assign low priority to all issues. The issues still
  have priorities but it is not displayed in the UI. Sorting option by priority is also
  hidden
  10. In the active issue files or any issue file there is a "Back to dashboard" link, then
   a header with the name of the issue. Under that we have a link to a GitHub issue if it's
   assigned. We also have a whole section with much more information about the GitHub issue
   so we now don't need the link. Remove the link from the issue creation and Github issue
  linking workflows