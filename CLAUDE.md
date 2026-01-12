# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Guidelines

- Always follow requirements.md
- After every task, update readme.md, claude.md, requirements.md, ideas.md as needed
- Keep docs concise and imperative

## Code Style

- Prefer functional programming over OOP; remove classes if possible
- Prefer functions/closures over classes
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
- `DashboardParser.ts` - Parses Dashboard.md using `%% ISSUE:id:START/END %%` markers
- `DashboardWriter.ts` - Modifies Dashboard.md (add/archive/reorder issues)
- `DashboardRenderer.ts` - Renders interactive HTML for code blocks

**Issues** (`src/issues/`):
- `IssueManager.ts` - Creates/archives issue files with YAML frontmatter
- `ProgressTracker.ts` - Counts tasks with 5s caching

**Modals** (`src/modals/IssueModal.ts`): Three-step flow: Name → Priority → GitHub link

**Types** (`src/types.ts`): Priority levels (low/medium/high/top), settings interface

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
