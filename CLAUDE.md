# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Guidelines

- Always follow requirements.md and `.mpx/SPEC.md`
- After every task, update readme.md, claude.md, requirements.md, CHECKLIST.md as needed
- Keep docs concise and imperative

## Code Style

- Prefer functional programming over OOP; use factory functions with closures instead of classes (except for Obsidian-required base classes)
- Obsidian API classes (Plugin, Modal, PluginSettingTab, SuggestModal) MUST remain classes
- All service layer code (not extending Obsidian classes) should use functional programming patterns
- Use factory functions (createXxx) that return interface instances with closures
- Avoid `this` keyword outside Obsidian-required classes
- Naming: camelCase (variables/functions), PascalCase (types/interfaces), UPPER_SNAKE_CASE (constants), kebab-case (files/folders)
- Comments only for "why", not "what"
- Follow DRY principle; extract common logic
- Use verbose names, not abbreviations
- Prefer `undefined` over `null`; check explicitly with `=== undefined`
- Prefer early return over nested ifs
- Use readable if conditions with aptly-named variables
- Use `void funcThatReturnsPromise()` when promise is discarded
- Prefer `for (const item of items)` over `forEach`
- Top-level: `function name() {}`, scoped: `const name = () => {}`
- Always use brackets `{}` in if-else blocks

## TypeScript 5

- Use latest TypeScript 5 features
- Prefer interfaces over types for object shapes
- Run `pnpm lint` and `pnpm format` before committing

## Agent Behavior

- Broaden scope of inquiry to find unconventional solutions
- Red team your work before calling it done
- Reflect on tool results before proceeding

## Build Commands

```bash
pnpm install       # Install dependencies
pnpm build         # Type-check and build (outputs main.js)
pnpm dev           # Development build (watch mode)
pnpm lint          # Check for lint errors
pnpm lint:fix      # Auto-fix lint errors
pnpm format        # Format code with Prettier
```

## Architecture

Obsidian plugin for task dashboards with issue tracking. Uses custom markdown code blocks that render interactive controls.

### Entry Point

`main.ts` - Registers code block processors (`tasks-dashboard-controls`, `tasks-dashboard-sort`), listens to vault modifications in `/Issues/` folders, manages commands.

### Core Services (src/)

**Dashboard** (`src/dashboard/`):
- `DashboardParser.ts` - Pure functions to parse Dashboard.md using `%% ISSUE:id:START/END %%` markers
- `DashboardWriter.ts` - Factory function creates writer instance to modify Dashboard.md (add/archive/reorder issues)
- `DashboardRenderer.ts` - Factory function creates renderer instance for interactive HTML code blocks, includes GitHub card rendering, folder/terminal/VS Code buttons

**Issues** (`src/issues/`):
- `IssueManager.ts` - Factory function creates manager instance to create/archive issue files with YAML frontmatter
- `ProgressTracker.ts` - Factory function creates tracker instance with 5s cache closure

**GitHub** (`src/github/`):
- `GitHubService.ts` - Factory function creates GitHub API client with caching, handles auth validation, issue/PR fetching, and search
- `GitHubCardRenderer.ts` - Factory function creates renderer for GitHub metadata cards (minimal/compact/full modes)

**Modals** (`src/modals/`):
- `IssueModal.ts` - Three-step flow classes (Obsidian-required): Name → Priority → GitHub link
- `GitHubSearchModal.ts` - Rich search modal for finding GitHub issues/PRs when authenticated
- `FolderPathModal.ts` - Folder path input modal with optional `issueId` for per-issue vs global storage

**Utilities** (`src/utils/`):
- `platform.ts` - Factory function creates platform service for file explorer, terminal, VS Code, and folder picker

**Types** (`src/types.ts`): Priority levels, GitHub types, settings interfaces. `issueFolders` stores per-issue folders keyed by `dashboardId:issueId`.

### File Structure

```
{rootPath}/
├── Dashboard.md
└── Issues/
    ├── Active/
    └── Archive/
```

### Key Patterns

- Dashboard sections: `%% TASKS-DASHBOARD:ACTIVE/ARCHIVE:START/END %%`
- Issue blocks: `%% ISSUE:{id}:START/END %%`
- Progress regex: `/^[\s]*[-*]\s*\[([ xX])\]/gm`
- Issue IDs: slugified names (`src/utils/slugify.ts`)

## MPX Project
- Spec: `.mpx/SPEC.md`
- Roadmap: `.mpx/ROADMAP.md`
- Phases: `.mpx/phases/`
