# Tasks Dashboard Plugin - SPEC

> Full feature spec and history: [epic1/SPEC.md](epics/epic1/SPEC.md)

# Epic 2

- [ ] Whenever a PR is closed and the branch is removed in origin, we still have the local branch and local worktree, which we like to remove. I would like to detect such a state and display it properly. Currently, the branch badge shows branch local only (not pushed yet). However, this is not correct. We already went through the whole life cycle of the associated remote branch. We should track that, whenever there already was a remote branch, the branch badge should never get to the local only state. It might be local only, but not with not pushed yet. It might be a state remote branch deleted or something similar. It should have a different style, maybe an orange one or any color that is not already occupied for branch badges, so we clearly see that the worktree is okay to be deleted.

## github badge icons, texts, colors
- [ ] Currently when a PR is merged, it shows Closed state with red badge and an icon of a closed PR. We should detect the merged state correctly and show purple badge with correct merged icon and text. We can use the same purple color as for merged PRs in GitHub, so it is consistent with the platform.
- [ ] Let's improve branch state icons. Currently I think we have the same icon for all branch states. Let's investigate this. We should come up with proper icons representing each state of branch, issue and PR. If there is not one that can be copied from github, we should search for an appropriate one online. You can use any svg you find, this is not a commercial project. However free icons are prefered.
- [ ] Detect state when base branch has new commits and we should sync our changes in this branch with the base branch. This should be a separate branch state (remote branch behind base branch) with a different badge color and icon, so we can easily see that we need to sync our branch with the base branch. If we are able to actually detect possible merge conflicts whenever we attempt merging the base branch in this branch, I would also love to see that. This should be indicated by something like a sync icon.
- [ ] For the case when there is a state that the branch should be synced with the base branch, I would like to have an action to spawn a terminal with Claude Code inside triggering a specific skill which I currently have /mp-rebase (I'm planning to rename it to /mp-sync or /mp-gh-sync so please check the current state of the skill in C:\_MP_projects\mxp-claude-code\skills) Which ensures that the base branch is synced with the current branch and it also automatically resolves all conflicts. I would then like to see this action next to the branch badge as a sync button with a sync icon.
- [ ] There should also be a "Sync All Un-synced Branches" button which would be global for all active issues. Clicking that button would spawn a terminal window with Claude Code in that workspace related to the unsynced branch for each unsynced branch and resolve each syncing conflict

## Running dev environments
- [ ] I need to investigate the system where each issue knows if there is an associated dev server running for this issue. For example, usually we want to run frontend on localhost:3000 or on localhost:3001 if 3000 is occupied. I would like to be able to know which port, which instance belongs to which issue so that I can quickly test everything for that issue when I switch in between them. It would be nice to have a badge with localhost:3000 next to the GitHub badges if we are able to figure out which is assigned to this issue and if it's running.

Currently I'm running for example yarn frontend command in VSCode terminal so at least this way I have the assigned VSCode instance linked to that localhost number but I always have to go to the terminal scroll up and see the port number myself. Sometimes when there was a lot of hot reloading the scrolling is tedious and therefore I want to figure out a better system

## Prune worktrees
- [ ] Identify issues that have been closed, remote branch is removed, PR is merged. Remove all these worktrees and local branches automatically. We should have a new button: "Prune closed worktrees.". Clicking the button should spawn the automatic detection of which issues are assigned to these worktrees and it should ask the user if these worktrees are really about to be deleted so there should be a confirmation modal with a list of all the issues and worktrees to be removed after confirming it should spawn the remove worktree script with a parameter that ensures deletion of all these worktrees. Please inspect the script on how to instruct it with multiple worktrees. It should also archive all associated dashboard issues.


## TODO

- [ ] Refactor large files; clean code sweep across the project
- [ ] Componentize standalone UI units (e.g., header badges) into isolated modules; analyze Obsidian Plugin componentization approach

