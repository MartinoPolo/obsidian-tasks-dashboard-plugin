# Top Priority Features

## Backlink to dashboard might be corrupted
- [ ] Check and fix the backlink to dashboard from issue notes. Actually the issue is when there is a space in the dashboard name. Figure out a better system to create the backlink.

## Add option to collapse issue in dashboard
- [ ] Add a button to collapse/expand issue details in the dashboard view.
- [ ] Remember collapsed state per issue.
- [ ] Add a global button to collapse/expand all issues at once.

## Don't jump to the end of the note files when opening
- In long files, this is annoying.
- [ ] Instead jump to the end of "## Tasks" section

## Shortcut to create issue in selected dashboard
- [ ] We already have a command for "Create issue (selected dashboard)". However it doesn't work. It should open popup to select dashboard and then create issue in that dashboard.
- [ ] Actually it already works with ctrl + shift + E. Just the assigned shortcut and probably command don't work. It's probably hardcoded somewhere. Fix that. Keep the default shortcut but allow remapping it.

## GitHub Integration
- [x] Per-vault GitHub authentication using Personal Access Tokens
- [x] Embedded GitHub info cards showing issue/PR metadata
- [x] Rich search modal for finding and linking GitHub issues
- [x] Configurable display modes (Minimal/Compact/Full)
- [x] Per-dashboard repository linking for filtered suggestions

- [ ] Embedded github view in note as well
- [ ] Ability to add issue and/or PR later
- [ ] OAuth?
- [ ] Show more metadata - status, tags, priority...
- [ ] Choosing repository from a list of my repos instead of typing full name, suggestions
- [ ] If no repository is selected for the dashboard, suggest from all repos. That applies to all github features in the plugin.
- [ ] Display rate limit somewhere
- [ ] Option to use dashboard completely without github é even turn of the 3rd prompt for github link
- [ ] Switching github card type should change current dashboard cards as well
- [ ] Dashboard rebuild button should include github cards
- [ ] Enter in the last step of prompting should confirm and create the issue but not with the first suggested github issue. It should not add the issue unless it's intentionally selected
- [ ] Add button "Add github issue" to content of each issue in dashboard (added during issue creation).
- [ ] The link to github issue should include issue number as well as title. Now it's just a generic text
- [ ] User is able to add multiple github issues to one dashboard issue. During issue creation, after selecting one github issue, user is NOT asked to select another one. Other issues can be added later using the "Add github issue" button mentioned above.
- [ ] Add "Add github PR" button as well, same way as "Add github issue"

- [ ] Each dashboard should be able to disable github integration

## Link to project folder
- [ ] Add option to link a project folder (path on disc) to the dashboard. This way user can quickly open the project folder from the dashboard.
- [ ] Add button "Open project folder" to dashboard header that opens the linked folder in
    - [ ] Pressing the button when the folder is not linked should open a prompt to select the folder
    - [ ] Pressing the button when the folder is linked should open the folder in system
    - [ ] Button style should indicate whether the folder is linked or not (different color/icon)
- [ ] Add links to open bash/powerhsell in the project folder as well


## Allow adding foreign issues to dashboard
- This means an issue as a note from obsidian. Basically a file that already has some tasks. Let's convert such a file to a note created by this plugin (give it priority, format etc) and add it to the dashboard.
- [ ] Add "Add existing issue" button to dashboard
- [ ] It opens an input  where user can insert issue/obsidian file link
- [ ] The input should offer autocomplete/suggestions based on existing notes in vault
- [ ] Once user confirms, the note is converted to a dashboard issue and added to the dashboard
- [ ] The original note remains in the vault but is now also represented in the dashboard
- [ ] The converted note should have all the features of a regular dashboard issue (priority, github link, subtasks, etc)

## Fix the "create files"/"open dashboard" button
- [ ] If the button in settings can't really be dynamic based on other settings, just leave it as "Create files". Don't do anything if the files already exist.

## Přidat "show tree" do všech dashboard task queries - díky tomu se dobře zobrazují podúkoly

## Archive and delele should be 2 separate things
We have an archive feature with a button (trash can icon). This puts the issue note into the archive folder and into archive section of the dashboard
- [ ] Let's also add a delete button (use trash can icon and figure out a better icon for archive action) that will permanently delete the issue note from vault, deletes the record in dashboard. User should be asked to confirm before deleting.
- [ ] Deleted task could still be recoverable from Obsidian's trash if needed or they could stay in issues/deleted but be invisible for obsidian.

## Sort by created date
- [ ] Add option to sort issues by created date (both newest first/oldest first)

## Sort by last edited date
- [ ] Add option to sort issues by last edited date (both newest first/oldest first)
- [ ] Add option to show last edited date in issue cards. It should be a prop

## Rebuild button should be green or blue?

## Delete dashboard
- should ask before deleting
- should ask if it should remove all associated data

## Changing colors
- Is it possible to change background colors of dashboard?



## Change plugin name
- Suggest a better name. It should express it's a simple obsidian plugin and basically just a different view of groups of tasks. It has github integration but that's not the main feature. Works with tasks in general. Groups task in issues and displays them in a dashboard.
- Starting with A or _ to be at the top of lists


# Research & Questions
## Learn how to use obsidian keychain (secrets)

## Tools to Build Obsidian Plugin
- Is my setup good for building obsidian plugin?
- Are there any better tools or frameworks to build obsidian plugins?

# Nice to Have Features

## Dynamic Priorities List
- Allow users to define their own priority levels instead of fixed ones like High, Medium, Low.
