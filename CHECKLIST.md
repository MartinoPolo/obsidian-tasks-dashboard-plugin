# Project Checklist

## Phase 1: Bug Fixes (11/11) — Complete
- [x] Fix progress refresh on task toggle (auto-refresh via `vault.on('modify')`)
- [x] Fix backlinks with spaces in dashboard names (`encodeURI()`)
- [x] Remove hardcoded hotkey, use Obsidian command API
- [x] Create Files button: no-op if files already exist
- [x] Add `show tree` to task queries for subtask hierarchy

## Phase 2: Core UX Improvements (16/16) — Complete
- [x] Collapse/expand toggle per issue with persistent state
- [x] Global collapse/expand all button
- [x] Smart cursor positioning at end of `## Tasks` section
- [x] Separate archive (box icon) and delete (trash icon) actions
- [x] Delete with confirmation modal, moves to Obsidian trash
- [x] Sort by created date and last edited date (newest/oldest)

## Phase 3: GitHub Core (23/23) — Complete
- [x] Per-dashboard `githubEnabled` toggle
- [x] Repo picker with searchable dropdown (name, description, visibility)
- [x] Search scope selector: Linked repo / My repos / All GitHub
- [x] Parallel org queries (capped at 5) with fallback
- [x] Enter key fix: no selection = skip GitHub link
- [x] Format links as `#123 - Issue Title`
- [x] Embedded GitHub cards in issue notes
- [x] "Add GitHub Issue" and "Add GitHub PR" buttons per issue

## Phase 4: GitHub Multi-Links (8/8) — Complete
- [x] Multiple GitHub links per issue (`github_links` array in frontmatter)
- [x] Migrate single link to array format
- [x] Card type switching re-renders all cards
- [x] Dashboard rebuild includes GitHub card refresh

## Phase 5: GitHub Repo & Rate Limits (8/8) — Complete
- [x] Rate limit display from API response headers
- [x] Link GitHub repository to issues (type: "repo" in frontmatter)
- [x] Repo card rendering via GitHubCardRenderer

## Phase 6: GitHub Quick-Open (7/7) — Complete
- [x] Quick-open button in issue controls
- [x] Normal style when link exists (opens URL); faded when not (opens add-link prompt)
- [x] Add-link prompt reuses GitHub search modal

## Phase 7: Issue UX (10/10) — Complete
- [x] Move issue to top/bottom buttons
- [x] Rename issue with full state migration (markers, file path, H1)
- [x] Per-issue header color picker with live preview

## Phase 8: Project Folder (13/13) — Complete
- [x] Global project folder per dashboard + per-issue independent folders
- [x] Folder button: left-click opens explorer / right-click reassigns
- [x] Faded style when no folder assigned
- [x] Terminal button (hidden when no folder): opens PowerShell/bash

## Phase 9: Note Import (0/7) — Not Started
- [ ] Add "Add existing issue" button to dashboard controls
- [ ] Create vault note suggest modal (SuggestModal with file autocomplete)
- [ ] Convert selected note: add frontmatter (priority, status, created)
- [ ] Add converted note entry to dashboard's Active Issues section
- [ ] Preserve original note content, add backlink to dashboard
- [ ] Note import preserves existing content
- [ ] `pnpm build` passes

## Phase 10: Dashboard Deletion (0/7) — Not Started
**Blocked by:** Phases 4-9
- [ ] Add delete button per dashboard in settings UI
- [ ] Show confirmation dialog before deletion
- [ ] Ask whether to remove associated files (dashboard.md, Issues folder)
- [ ] Clean up registered commands for deleted dashboard
- [ ] Remove dashboard from settings and save
- [ ] Dashboard deletion cleans up all artifacts
- [ ] `pnpm build` passes

## Phase 11: Color Customization (0/6) — Not Started
**Blocked by:** Phases 4-9
- [ ] Add color settings for each priority level border
- [ ] Add background color setting for dashboard sections
- [ ] Apply colors via CSS custom properties or inline styles
- [ ] Immediate re-render when colors change
- [ ] Custom colors persist and render correctly
- [ ] `pnpm build` passes

---

# Backlog (Not Assigned to Phases)

## GitHub — Future
- [ ] OAuth authentication (alternative to PAT)
- [ ] Show more metadata — status, tags, priority
- [ ] Embedded GitHub view in issue notes (richer than current cards)

## Dashboard UX — Future
- [ ] Rebuild button color (green or blue?)
- [ ] Dynamic priority levels (user-defined instead of fixed High/Medium/Low)

## Plugin Meta
- [ ] Better plugin name (expresses task grouping + dashboard view, starts with A or _ for sort)

## Research & Questions
- Learn how to use Obsidian keychain (secrets)
- Are there better tools/frameworks for building Obsidian plugins?
