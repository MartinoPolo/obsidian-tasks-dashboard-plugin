# Svelte Migration — Phase 5: Settings Tab

## Context & Conventions

See `SVELTE-MIGRATION.md` for full migration plan. See `SVELTE_MIGRATION_GUIDELINES.md` for coding standards.

Key reminders:
- Svelte 5 Runes API: `$props()`, `$state()`, `$state.raw()`, `$derived()`, `$effect()`
- `{@attach fn}` for tooltip, resize observer, portal
- `onclick={handler}` native event attributes
- `{#snippet}` + `{@render}` instead of slots
- `class={['base', condition && 'active']}` clsx-style
- ESLint `strict-boolean-expressions`: never truthy-check strings/arrays
- Import paths: `src/components/` imports types from `../types`, plugin from `../../main`

### Hybrid Approach

Svelte manages section structure/layout. Individual settings use `new Setting(containerEl)` via `$effect` + `bind:this` — preserves Obsidian's native Setting component styling.

---

## Phase Summary

| Phase | Status | Description |
|-------|--------|-------------|
| 0 | ✅ Done | Infrastructure: deps, esbuild, tsconfig, eslint, svelte.d.ts, attach utils |
| 1 | ✅ Done | Shared components: icons, Icon, ActionButton, GitBadge, StatePill, LoadingIndicator, ErrorDisplay |
| 2 | ✅ Done | GitHub: GitHubCard, GitHubRepoCard, GitHubCardContainer, GitHubSearchContent, thin modal shell |
| 3 | Pending | Dashboard: IssueCard, IssueHeader, OverflowPanel, SortControls, ProgressBar, etc. |
| 4 | Pending | Modals: wizard, confirmation, color picker, priority selector, all modal content |
| **5** | **✅ Done** | **Settings: SettingsTab, DashboardSettings, GitHubSettings** |
| 6 | Pending | CSS audit: verify global vs scoped, remove dead CSS |
| 7 | Pending | Cleanup: delete replaced files, dead imports, final verification |
| 8 | Pending | Testing: vitest, component tests, CI |

---

## Phase 5 Checklist

- [x] 5.1 Create `SettingsTab.svelte`
- [x] 5.2 Create `DashboardSettings.svelte`
- [x] 5.3 Create `GitHubSettings.svelte`
- [x] 5.4 Modify `settings.ts`
- [x] 5.5 Delete `settings/github-settings-renderer.ts`
- [x] 5.6 Verify Phase 5

---

## 5.1 Create `src/components/settings/SettingsTab.svelte`

**Replaces**: `settings.ts` DOM logic (442 lines).

```
Props ($props):
  plugin: TasksDashboardPlugin

State:
  settings = $state(structuredClone(plugin.settings))

Derived:
  dashboards = $derived(Object.entries(settings.dashboards))

Template:
  <div class="tdc-settings">
    <div bind:this={globalSettingsEl}></div>
    {#each dashboards as [id, dashboard] (id)}
      <DashboardSettings {plugin} {dashboard} dashboardId={id} />
    {/each}
    <GitHubSettings {plugin} />
  </div>

Effects:
  $effect — populate globalSettingsEl with new Setting() calls
```

## 5.2 Create `src/components/settings/DashboardSettings.svelte`

Per-dashboard settings section. Uses `bind:this` + `$effect` to create `new Setting()` elements inside Svelte-managed containers.

## 5.3 Create `src/components/settings/GitHubSettings.svelte`

**Replaces**: `github-settings-renderer.ts` (229 lines).

GitHub configuration section: token input, repository management, API settings.

## 5.4 Modify `settings.ts`

`display()` mounts `SettingsTab.svelte`. Shrinks from 442 → ~30 lines.

```ts
import { mount, unmount } from 'svelte';
import SettingsTab from '../components/settings/SettingsTab.svelte';

class TasksDashboardSettingTab extends PluginSettingTab {
  private component: ReturnType<typeof mount> | undefined;

  display() {
    this.containerEl.empty();
    this.component = mount(SettingsTab, {
      target: this.containerEl,
      props: { plugin: this.plugin }
    });
  }

  hide() {
    if (this.component) unmount(this.component);
  }
}
```

## 5.5 Delete `settings/github-settings-renderer.ts`

229 lines replaced by `GitHubSettings.svelte`.

## 5.6 Verify Phase 5

- Settings tab opens, all settings render
- Changing settings persists correctly
- Dashboard-specific settings work
- GitHub settings: token input, repo management

---

## Files Created/Modified in Phase 5

```
src/components/settings/
  SettingsTab.svelte              — Settings tab layout
  DashboardSettings.svelte        — Per-dashboard settings
  GitHubSettings.svelte           — GitHub configuration

src/settings.ts                   — Shrinks to ~30 lines (mount orchestrator)

Deleted:
  src/settings/github-settings-renderer.ts
```
