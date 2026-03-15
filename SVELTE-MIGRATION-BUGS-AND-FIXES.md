# Issue creation workflow
- [ ] keyboard navigation in color picking step doesn't work. Pressing arrow keys doesn't change selected color.
    - [ ] There are tooltips for each color and also one weird one "Issue color presets" which should never appear. Please remove the color tooltips and the weird one as well.

## Tasks
### Issue card
#### Header
- [ ] By choosing an issue color we are not only choosing background color but also the text color. Previously before Svelte migration this only affected the title and issue info icon. Now we have backgrounds in that issue color for all buttons in the header and therefore I would like the text color to also affect the color of all icons in buttons in the header

## Bugs
### Issue card
- [ ] Issue color picker dropdown doesn't apper right below the color icon
![[Pasted image 20260314140625.png]]
- [ ] arrow key navigation doesn't work in color picker dropdown nor in issue creation workflow
- [ ] The strip for PR status was at the bottom border of an issue card header, now it seems it's on the left
- [ ] Github badges are very poorly visible
- [ ] The order of stuff in the Issue card header is not correct. It should be: Priority strip, collapse button, title (all aligned to the left), Github issue badge, branch badge, PR badge, Worktree icon, Issue info icon, Action buttons (all aligned to the right )
- [ ] The github badges should automatically collapse to icon only variant when they don't have enough space to be full size. (See how this was done before svelte migration)
![[Pasted image 20260314142706.png]]
- [ ] Issue card layout settings are completely wrong
![[Pasted image 20260315084801.png]]
### Plugin settings
- [ ] Collapse buttons not square, no spacing between button and first setting
![[Pasted image 20260314141638.png]]