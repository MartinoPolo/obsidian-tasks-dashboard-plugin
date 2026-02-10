# Phase 5: GitHub Repo & Rate Limits - Checklist

**Status:** Complete
**Dependencies:** Phase 3

## Objective
Link GitHub repositories to dashboard issues and display API rate limits.

## Rate Limit Display (Req 6j)
- [x] Parse rate limit from GitHub API response headers
- [x] Display remaining/total in settings page or dashboard footer

## Link GitHub Repository (Req 6k)
- [x] Add "Link Repository" option in GitHub link step during issue creation
- [x] Reuse repo picker (Req 6c) for repository selection
- [x] Store repo link in frontmatter (type: "repo" in github metadata)
- [x] Render repo card in dashboard (reuse GitHubCardRenderer)

## Completion Criteria
- [x] Rate limits visible to user
- [x] `pnpm build` passes

---
Progress: 8/8 tasks complete
