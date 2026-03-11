# Tasks Dashboard Plugin - SPEC

> Full feature spec and history: [epic1/SPEC.md](epics/epic1/SPEC.md)

# Epic 2

- [ ] Whenever a PR is closed and the branch is removed in origin, we still have the local branch and local worktree, which we like to remove. I would like to detect such a state and display it properly. Currently, the branch badge shows branch local only (not pushed yet). However, this is not correct. We already went through the whole life cycle of the associated remote branch. We should track that, whenever there already was a remote branch, the branch badge should never get to the local only state. It might be local only, but not with not pushed yet. It might be a state remote branch deleted or something similar. It should have a different style, maybe an orange one or any color that is not already occupied for branch badges, so we clearly see that the worktree is okay to be deleted.



## TODO

- [ ] Refactor large files; clean code sweep across the project
- [ ] Componentize standalone UI units (e.g., header badges) into isolated modules; analyze Obsidian Plugin componentization approach

