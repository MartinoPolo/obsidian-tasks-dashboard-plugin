# Phase 3: GitHub Enhancements - Checklist

## No-GitHub Mode (Req 6d)
- [x] Add per-dashboard `githubEnabled` toggle in settings
- [x] Skip GitHub link prompt during issue creation when disabled
- [x] Hide GitHub-related UI elements when disabled for that dashboard

## Repository Picker (Req 6c)
- [x] Fetch user's repos via GitHub API (with caching)
- [x] Replace text input with searchable dropdown/suggest modal
- [x] Show repo name, description, and visibility in suggestions

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

## Multiple GitHub Links (Req 6i)
- [ ] Change frontmatter from single `github` to `github_links` array
- [ ] Migrate existing single links to array format
- [ ] Render multiple GitHub cards per issue
- [ ] Each card independently refreshable

## Card Type Switching (Req 6e)
- [ ] Re-render all dashboard GitHub cards when display mode changes in settings

## Rebuild Includes GitHub (Req 6f)
- [ ] Dashboard rebuild button also refreshes GitHub card data

## Rate Limit Display (Req 6j)
- [ ] Parse rate limit from GitHub API response headers
- [ ] Display remaining/total in settings page or dashboard footer

## Link GitHub Repository (Req 6k)
- [ ] Add "Link Repository" option in GitHub link step during issue creation
- [ ] Reuse repo picker (Req 6c) for repository selection
- [ ] Store repo link in frontmatter (type: "repo" in github metadata)
- [ ] Render repo card in dashboard (reuse GitHubCardRenderer)

## GitHub Quick-Open Button (Req 6l)
- [ ] Add GitHub quick-open button to issue controls in DashboardRenderer
- [ ] Normal style when GitHub link exists; opens URL in default browser on click
- [ ] Faded/disabled style when no GitHub link; opens add-link prompt on click
- [ ] Add-link prompt reuses GitHub search modal (issues/PRs/repos)
- [ ] Update frontmatter after linking from prompt

## Completion Criteria
- [ ] All GitHub features work with PAT auth
- [ ] Graceful degradation when no PAT configured
- [ ] Backward compatible with existing GitHub-linked issues
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes

---
Progress: 17/23 tasks complete
