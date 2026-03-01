# CLAUDE.md

## Guidelines

- Follow `.mpx/REQUIREMENTS.md` for behavior and invariants.
- Follow `.mpx/ROADMAP.md` for planning state.
- Keep docs concise, imperative, and non-duplicative.
- When touching behavior, update docs that define source-of-truth expectations.

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

## Commands

- Use `package.json` scripts as the command source of truth.

## Project Invariants

- Dashboard section markers must remain compatible with parser/writer markers:
    - `%% TASKS-DASHBOARD:ACTIVE:START %%` / `%% TASKS-DASHBOARD:ACTIVE:END %%`
    - `%% TASKS-DASHBOARD:ARCHIVE:START %%` / `%% TASKS-DASHBOARD:ARCHIVE:END %%`
- Issue block markers must remain `%% ISSUE:{id}:START %%` / `%% ISSUE:{id}:END %%`.
- Per-issue folder keys are `dashboardId:issueId` in `settings.issueFolders`.
- Process launch paths must stay injection-safe (`spawn(..., { shell: false })`).

## MPX Project

- Roadmap: `.mpx/ROADMAP.md`
- Phase artifacts: `.mpx/phases/`
