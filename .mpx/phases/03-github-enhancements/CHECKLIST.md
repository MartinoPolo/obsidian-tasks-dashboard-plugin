# Phase 3: GitHub Enhancements - Checklist

## No-GitHub Mode (Req 6d)
- [ ] Add per-dashboard `githubEnabled` toggle in settings
- [ ] Skip GitHub link prompt during issue creation when disabled
- [ ] Hide GitHub-related UI elements when disabled for that dashboard

## Repository Picker (Req 6c)
- [ ] Fetch user's repos via GitHub API (with caching)
- [ ] Replace text input with searchable dropdown/suggest modal
- [ ] Show repo name, description, and visibility in suggestions

## Enter Key Fix (Req 6g)
- [ ] Change enter key in GitHub search to confirm without auto-selecting first result
- [ ] Only link a GitHub issue when user explicitly selects one
- [ ] Enter with no selection = skip GitHub link (create issue without it)

## Better Link Display (Req 6h)
- [ ] Format GitHub links as `#123 - Issue Title` instead of generic text
- [ ] Update both dashboard cards and issue note links

## Embedded GitHub in Notes (Req 6a)
- [ ] Render GitHub metadata card inside issue note files
- [ ] Reuse existing GitHubCardRenderer for consistency

## Add GitHub After Creation (Req 6b)
- [ ] Add "Add GitHub Issue" button to each issue's dashboard entry
- [ ] Add "Add GitHub PR" button similarly
- [ ] Clicking opens GitHub search modal, links result to existing issue
- [ ] Update issue note frontmatter with new link

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

## Completion Criteria
- [ ] All GitHub features work with PAT auth
- [ ] Graceful degradation when no PAT configured
- [ ] Backward compatible with existing GitHub-linked issues
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes

---
Progress: 0/14 tasks complete
