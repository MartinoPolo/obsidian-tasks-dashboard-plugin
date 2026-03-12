# Svelte Migration — Phase 4: Modal Components

## Context & Conventions

See `SVELTE-MIGRATION.md` for full migration plan. See `SVELTE_MIGRATION_GUIDELINES.md` for coding standards.

Key reminders:
- Svelte 5 Runes API: `$props()`, `$state()`, `$state.raw()`, `$derived()`, `$effect()`
- `{@attach fn}` for tooltip, resize observer, portal
- `onclick={handler}` native event attributes
- `{#snippet}` + `{@render}` instead of slots
- `class={['base', condition && 'active']}` clsx-style
- Modal pattern: `extends Modal` (Obsidian API), `onOpen()` mounts Svelte, `onClose()` unmounts
- ESLint `strict-boolean-expressions`: never truthy-check strings/arrays
- Import paths: `src/components/` imports types from `../types`, plugin from `../../main`

---

## Phase Summary

| Phase | Status | Description |
|-------|--------|-------------|
| 0 | ✅ Done | Infrastructure: deps, esbuild, tsconfig, eslint, svelte.d.ts, attach utils |
| 1 | ✅ Done | Shared components: icons, Icon, ActionButton, GitBadge, StatePill, LoadingIndicator, ErrorDisplay |
| 2 | ✅ Done | GitHub: GitHubCard, GitHubRepoCard, GitHubCardContainer, GitHubSearchContent, thin modal shell |
| 3 | Pending | Dashboard: IssueCard, IssueHeader, OverflowPanel, SortControls, ProgressBar, etc. |
| **4** | **🔄 Current** | **Modals: wizard, confirmation, color picker, priority selector, all modal content** |
| 5 | Pending | Settings: SettingsTab, DashboardSettings, GitHubSettings |
| 6 | Pending | CSS audit: verify global vs scoped, remove dead CSS |
| 7 | Pending | Cleanup: delete replaced files, dead imports, final verification |
| 8 | Pending | Testing: vitest, component tests, CI |

---

## Phase 4 Checklist

- [ ] 4.1 Create `ModalLayout.svelte`
- [ ] 4.2 Create `ConfirmationDialog.svelte`
- [ ] 4.3 Create `ColorPicker.svelte`
- [ ] 4.4 Create `PrioritySelector.svelte`
- [ ] 4.5 Create `IssueCreationWizard.svelte`
- [ ] 4.6 Create wizard sub-step components
- [ ] 4.7 Create `WorktreeRetryContent.svelte`
- [ ] 4.8 Create remaining modal content components
- [ ] 4.9 Convert modal shell files to thin wrappers
- [ ] 4.10 Delete files
- [ ] 4.11 Verify Phase 4

---

## Modal Pattern

Every modal keeps `extends Modal` (Obsidian API requirement). `onOpen()` mounts Svelte. `onClose()` unmounts.

```ts
import { mount, unmount } from 'svelte';
import Content from '../components/modals/Content.svelte';

class SomeModal extends Modal {
  private component: ReturnType<typeof mount> | undefined;

  onOpen() {
    this.component = mount(Content, {
      target: this.contentEl,
      props: { plugin: this.plugin, onclose: () => this.close() }
    });
  }

  onClose() {
    if (this.component) unmount(this.component);
    this.contentEl.empty();
  }
}
```

---

## 4.1 Create `src/components/modals/ModalLayout.svelte`

**Replaces**: `modal-helpers.ts` shared functions.

```
Props ($props):
  title: string
  children: Snippet
  actions?: Snippet
  onsubmit?: () => void
  class?: string

Template:
  <div class={['tdc-modal-content', className]}>
    <h2 class="tdc-modal-title">{title}</h2>
    <div class="tdc-modal-body">{@render children()}</div>
    {#if actions}
      <div class="tdc-modal-actions">{@render actions()}</div>
    {/if}
  </div>
  <svelte:window onkeydown={handleKeydown} />
```

## 4.2 Create `src/components/modals/ConfirmationDialog.svelte`

**Replaces**: `DeleteConfirmationModal`, `ArchiveConfirmationModal`, `DashboardDeleteConfirmationModal` DOM (~375 lines).

```
Props ($props):
  title: string
  message: string
  confirmLabel?: string       — default: 'Confirm'
  confirmClass?: string       — default: 'mod-warning'
  onconfirm: () => void
  oncancel: () => void
```

## 4.3 Create `src/components/modals/ColorPicker.svelte`

**Replaces**: `ColorPromptModal` from `issue-creation-modal.ts`.

```
Props: currentColor, colorOptions, onselect, oncancel
State: selectedColor = $state(currentColor), customColor = $state('')
Template: color grid + custom input + confirm/cancel
```

## 4.4 Create `src/components/modals/PrioritySelector.svelte`

**Replaces**: `PriorityPromptModal` + `PrioritySelectionModal`.

```
Props: currentPriority, priorities, onselect, oncancel
State: selectedIndex = $state(...)
Keyboard: <svelte:window onkeydown={...} /> — ArrowUp/Down, Enter, Escape
```

## 4.5 Create `src/components/modals/IssueCreationWizard.svelte`

**Replaces**: 5 chained modal classes from `issue-creation-modal.ts` (1396 lines). Single multi-step wizard.

```
Props ($props):
  plugin: TasksDashboardPlugin
  dashboard: DashboardData
  onclose: () => void
  oncreate: (issueData: NewIssueData) => void

State:
  step = $state<'name' | 'github' | 'worktree' | 'color' | 'priority'>('name')
  issueData = $state<Partial<NewIssueData>>({})

Template:
  {#if step === 'name'}
    <NameStep bind:name={issueData.name} onnext={() => step = 'github'} />
  {:else if step === 'github'}
    <GitHubStep {plugin} {dashboard} bind:githubLink={issueData.githubLink}
                onnext={() => step = 'worktree'} onback={() => step = 'name'} />
  {:else if step === 'worktree'}
    <WorktreeStep {plugin} bind:worktree={issueData.worktree}
                  onnext={() => step = 'color'} onback={() => step = 'github'} />
  {:else if step === 'color'}
    <ColorPicker ... onselect={(c) => { issueData.color = c; step = 'priority'; }} />
  {:else if step === 'priority'}
    <PrioritySelector ... onselect={(p) => { issueData.priority = p; oncreate(...); }} />
  {/if}

Keyboard:
  <svelte:window onkeydown={handleKeydown} />
  Escape → go back one step or close
  Backspace (when input not focused) → go back
```

## 4.6 Create wizard sub-step components

| Component | Purpose |
|---|---|
| `NameStep.svelte` | Issue name input + validation |
| `GitHubStep.svelte` | GitHub linking: search, manual URL, or skip |
| `WorktreeStep.svelte` | Worktree creation toggle + path selection |

## 4.7 Create `src/components/modals/WorktreeRetryContent.svelte`

**Replaces**: `worktree-retry-modal.ts` DOM (257 lines).

## 4.8 Create remaining modal content components

| Component | Replaces | Lines |
|---|---|---|
| `GitHubLinksContent.svelte` | `github-links-modal.ts` | 455 |
| `FolderPathContent.svelte` | `FolderPathModal.ts` | 188 |
| `NoteImportContent.svelte` | `note-import-modal.ts` | 192 |
| `RepositoryLinkerContent.svelte` | `RepositoryLinkerModal.ts` | 243 |
| `RenameIssueContent.svelte` | `rename-issue-modal.ts` | 84 |

## 4.9 Convert modal shell files to thin wrappers

All modal files in `src/modals/` become thin shells:

| File | Before | After |
|---|---|---|
| `issue-creation-modal.ts` | 1,396 | ~80 |
| `github-links-modal.ts` | 455 | ~50 |
| `worktree-retry-modal.ts` | 257 | ~30 |
| `FolderPathModal.ts` | 188 | ~30 |
| `note-import-modal.ts` | 192 | ~30 |
| `RepositoryLinkerModal.ts` | 243 | ~30 |
| `rename-issue-modal.ts` | 84 | ~25 |
| `delete-confirmation-modal.ts` | 135 | ~25 |
| `archive-confirmation-modal.ts` | 128 | ~25 |
| `dashboard-delete-modal.ts` | 112 | ~25 |

## 4.10 Delete files

- `src/modals/modal-helpers.ts` (196 lines)
- `src/modals/modal-keyboard-helpers.ts` (75 lines)

## 4.11 Verify Phase 4

- `pnpm build` + `pnpm typecheck`
- Issue creation wizard: all 5 steps, back navigation, keyboard nav
- Color picker: grid selection, custom color input
- Priority selector: keyboard navigation, visual selection
- All confirmation dialogs: confirm/cancel, keyboard Escape
- All other modals: open/close without memory leaks, keyboard accessible

---

## Files Created/Modified in Phase 4

```
src/components/modals/
  ModalLayout.svelte              — Shared modal layout
  ConfirmationDialog.svelte       — Generic confirm/cancel
  ColorPicker.svelte              — Color selection grid
  PrioritySelector.svelte         — Priority selection list
  IssueCreationWizard.svelte      — Multi-step wizard
  NameStep.svelte                 — Wizard: name input
  GitHubStep.svelte               — Wizard: GitHub linking
  WorktreeStep.svelte             — Wizard: worktree decision
  WorktreeRetryContent.svelte     — Worktree error retry
  GitHubLinksContent.svelte       — Link/unlink GitHub items
  FolderPathContent.svelte        — Folder path browser
  NoteImportContent.svelte        — Note import dialog
  RepositoryLinkerContent.svelte  — Repository linking
  RenameIssueContent.svelte       — Issue rename input

src/modals/                       — All become thin Modal shells (~25-80 lines each)

Deleted:
  src/modals/modal-helpers.ts
  src/modals/modal-keyboard-helpers.ts
```
