# Phase 3: GitHub Core - Checklist

**Status:** Complete
**Dependencies:** Phase 1

## Objective
Core GitHub integration: per-dashboard toggle, repo picker with search scopes, enter key fix, link display, embedded cards in notes, add-after-creation flow.

## Decisions
- `githubEnabled` defaults to `true` for backward compatibility
- Search scope defaults: "Linked repository" when `githubRepo` set, "My repositories" otherwise
- Parallel org search queries capped at 5; fallback to global search + client-side filter
- Enter with no selection = skip GitHub link (create issue without it)

## No-GitHub Mode (Req 6d)
- [x] Add per-dashboard `githubEnabled` toggle in settings
- [x] Skip GitHub link prompt during issue creation when disabled
- [x] Hide GitHub-related UI elements when disabled for that dashboard

## Repository Picker + Search Scope (Req 6c)
- [x] Fetch user's repos via GitHub API (with caching)
- [x] Replace text input with searchable dropdown/suggest modal
- [x] Show repo name, description, and visibility in suggestions
- [x] Replace "Search all repositories" checkbox with dropdown scope selector
- [x] Implement three search scopes: Linked repository, My repositories, All GitHub
- [x] Fetch `/user` (username) and `/user/orgs` (org names), cache alongside repo cache
- [x] "My repositories" mode: parallel search queries (`user:{login}` + `org:{orgName}`), combine & dedupe, sort by updated
- [x] Cap parallel org queries at 5; if more, fall back to global search + client-side filter
- [x] Verify disabled checkbox UX bug is resolved (replaced by dropdown)

## Enter Key Fix (Req 6g)
- [x] Change enter key in GitHub search to confirm without auto-selecting first result
- [x] Only link a GitHub issue when user explicitly selects one
- [x] Enter with no selection = skip GitHub link (create issue without it)

## Better Link Display (Req 6h)
- [x] Format GitHub links as `#123 - Issue Title` instead of generic text
- [x] Update both dashboard cards and issue note links

## Embedded GitHub in Notes (Req 6a)
- [x] Render GitHub metadata card inside issue note files
- [x] Reuse existing GitHubCardRenderer for consistency

## Add GitHub After Creation (Req 6b)
- [x] Add "Add GitHub Issue" button to each issue's dashboard entry
- [x] Add "Add GitHub PR" button similarly
- [x] Clicking opens GitHub search modal, links result to existing issue
- [x] Update issue note frontmatter with new link

## Completion Criteria
- [x] All GitHub core features work with PAT auth
- [x] Graceful degradation when no PAT configured
- [x] Backward compatible with existing GitHub-linked issues
- [x] `pnpm build` passes
- [x] `pnpm lint` passes

---
Progress: 23/23 tasks complete
