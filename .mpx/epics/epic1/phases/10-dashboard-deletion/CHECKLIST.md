# Phase 10: Dashboard Deletion - Checklist

**Status:** Complete
**Dependencies:** Phases 4, 5, 6, 8, 9

## Objective
Delete dashboard from settings with confirmation and optional data cleanup.

## Delete Dashboard (Req 13)
- [x] Add delete button per dashboard in settings UI
- [x] Show confirmation dialog before deletion
- [x] Ask whether to remove associated files (dashboard.md, Issues folder)
- [x] Clean up registered commands for deleted dashboard
- [x] Remove dashboard from settings and save

## Completion Criteria
- [x] Dashboard deletion cleans up all artifacts
- [x] `pnpm build` passes

---
Progress: 7/7 tasks complete

## Decisions
- Created `DashboardDeleteConfirmationModal` as a new modal class (extends Obsidian Modal base class) rather than adapting the existing `DeleteConfirmationModal`, since the dashboard modal needs a checkbox toggle that the issue modal doesn't have
- File deletion uses `app.vault.trash(file, true)` to send to system trash for recoverability
- Issue ID collection reads and parses the dashboard file async before deletion; gracefully returns empty array if file doesn't exist
- `issueFolders` cleanup uses prefix matching (`dashboardId:*`), while `collapsedIssues` and `issueColors` cleanup uses exact issue IDs parsed from the dashboard file
