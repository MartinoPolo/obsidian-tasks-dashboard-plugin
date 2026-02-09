# Phase 3: GitHub Enhancements - Specification

**Status:** Not Started
**Dependencies:** Phase 1

## Objective
Level up GitHub integration with per-dashboard toggle, repo picker, better link display, multi-issue support, enter key fix, rate limit display, repo linking, and quick-open button.

## Scope
- No-GitHub mode per dashboard (Req 6d)
- Repo picker from user's repos (Req 6c)
- Enter key fix in search modal (Req 6g)
- Better GitHub link display with number + title (Req 6h)
- Embedded GitHub view in issue notes (Req 6a)
- Add GitHub issue/PR after creation (Req 6b)
- Multiple GitHub issues per dashboard issue (Req 6i)
- Card type switching updates existing cards (Req 6e)
- Dashboard rebuild includes GitHub cards (Req 6f)
- Rate limit display (Req 6j)
- Link GitHub repository to dashboard issue (Req 6k)
- GitHub quick-open button in issue controls (Req 6l)

## Out of Scope
- OAuth authentication (listed as future/question in checklist)
- Core UX changes (Phase 2)

## Deliverables
- Per-dashboard GitHub toggle in settings
- Repo autocomplete from authenticated user's repos
- Fixed enter key behavior in search modal
- Issue links show `#123 - Title` format
- GitHub cards in issue note files
- "Add GitHub Issue" and "Add GitHub PR" buttons per issue
- Multiple GitHub links stored in frontmatter array
- Card mode switch triggers re-render
- Rebuild refreshes GitHub data
- Rate limit info in settings or status bar
- "Link Repository" option during issue creation GitHub step
- Repo link stored in frontmatter with type: "repo"
- GitHub quick-open button in issue controls (linked = normal, unlinked = faded)
- Quick-open prompt reuses GitHub search modal for issues/PRs/repos

## Notes
- GitHub features depend on PAT being configured; degrade gracefully
- Multiple GitHub links: store as array in frontmatter `github_links: [...]`
- Repo picker: use GitHub API to list user's repos, cache result
- Rate limit: available from GitHub API response headers
