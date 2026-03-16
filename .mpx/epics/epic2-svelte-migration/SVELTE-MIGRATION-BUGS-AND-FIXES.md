# Issue creation workflow
- [x] keyboard navigation in color picking step doesn't work. Pressing arrow keys doesn't change selected color.
    - [x] There are tooltips for each color and also one weird one "Issue color presets" which should never appear. Please remove the color tooltips and the weird one as well. Last attempt for fixing this looks like it only hides the tooltip behind the dropdown for color picking, The tooltips can still be visible if you hover over a color next to the edge. It is displayed behind the dropdown partially visible. Please remove it completely.

## Tasks
### Issue card
#### Header
- [x] By choosing an issue color we are not only choosing background color but also the text color. Previously before Svelte migration this only affected the title and issue info icon. Now we have backgrounds in that issue color for all buttons in the header and therefore I would like the text color to also affect the color of all icons in buttons in the header

## Bugs
### Issue card
- [x] Issue color picker dropdown doesn't apper right below the color icon
![[Pasted image 20260314140625.png]]
- [x] arrow key navigation doesn't work in color picker dropdown nor in issue creation workflow
    - [x] Arrow key navigation still doesn't work in the issue creation workflow.
- [x] The strip for PR status was at the bottom border of an issue card header, now it seems it's on the left
- [x] Github badges are very poorly visible
- [x] The order of stuff in the Issue card header is not correct. It should be: Priority strip, collapse button, title (all aligned to the left), Github issue badge, branch badge, PR badge, Worktree icon, Issue info icon, Action buttons (all aligned to the right )
- [x] The github badges should automatically collapse to icon only variant when they don't have enough space to be full size. (See how this was done before svelte migration)
![[Pasted image 20260314142706.png]]
- [x] Issue card layout settings are completely wrong
![[Pasted image 20260315084801.png]]
### Plugin settings
- [x] Collapse buttons not square, no spacing between button and first setting
![[Pasted image 20260314141638.png]]