## Coding Guidelines

### Svelte 5 Component Structure

Order `<script>` sections consistently: imports, props, state, derived, effects, functions.

```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import { attachTooltip } from '$lib/attach-tooltip';

  interface Props {
    title: string;
    count?: number;
    onclick?: (value: number) => void;
  }

  let { title, count = 0, onclick }: Props = $props();

  let isOpen: boolean = $state(false);
  let filtered = $derived(items.filter(x => x.active));
  let computed = $derived.by(() => { /* complex logic */ });

  $effect(() => {
    console.log('count changed:', count);
    return () => { /* cleanup */ };
  });

  function toggle() {
    isOpen = !isOpen;
  }
</script>

<!-- template -->

<style>
  /* scoped CSS */
</style>
```

### Runes

- **`$state()`** for reactive values. Prefer explicit type on the left: `let value: string = $state('')` over `$state<string>('')`.
- **`$state.raw()`** for large objects that are only reassigned (not mutated). Use for API responses, git status results, parsed data. Avoids deep proxy overhead.
- **`$derived()`** for simple computed values, `$derived.by()` for multi-statement logic. Never use `$effect` to derive state.
- **`$effect()`** for side effects only. Return a cleanup function when needed. Escape hatch — avoid when possible:
  - Sync to external library → use `{@attach}`
  - Respond to user interaction → use event handler directly
  - Debug logging → use `$inspect`
- **`$props()`** with destructuring for all component props. Define a `Props` interface above the destructuring.
- **`$bindable()`** only when two-way binding is explicitly needed.
- Do not use deeply reactive `$state` for objects passed as props — use `$state.raw()` for read-only data.

### Attach Functions (replaces `use:action`)

Use `{@attach fn}` instead of `use:action`. Attach functions receive the element and return an optional cleanup function.

```svelte
<!-- Tooltip -->
<button {@attach attachTooltip('Click me')}>...</button>

<!-- Resize observer -->
<div {@attach attachResizeObserver(handleResize)}>...</div>

<!-- Portal (append to document.body) -->
<div {@attach attachPortal('tdc-overlay')}>...</div>

<!-- Inline attach -->
<div {@attach (node) => {
  const handler = () => console.log('clicked');
  node.addEventListener('click', handler);
  return () => node.removeEventListener('click', handler);
}}>
```

Attach function signature:
```ts
function attachSomething(param: string) {
  return (node: HTMLElement) => {
    // setup
    return () => { /* cleanup */ };
  };
}
```

### Events and Callbacks

- Use native event attributes: `onclick`, `onchange`, `oninput` — not `on:click`.
- Pass callback props instead of `createEventDispatcher`. Name them `onxxx` (e.g., `onselect`, `oncancel`).
- Handle modifiers imperatively: `(e) => { e.preventDefault(); ... }`.
- Use `<svelte:window onkeydown={...} />` for window/document events — not `onMount`/`$effect`.

### Templates

- Use `{#if}` / `{:else if}` / `{:else}` for conditionals.
- Use `{#each items as item (item.id)}` with keyed expressions for lists. Key must uniquely identify the object — never use index.
- Use `{#snippet name(params)}` + `{@render name(args)}` instead of slots.
- Use `{@html svgString}` for trusted SVG icon injection (sanitized constant data — no DOMPurify needed).
- Avoid destructuring in `{#each}` if you need to mutate the item.

### Styling

- Use `<style>` blocks for component-scoped CSS. Svelte scopes automatically.
- Use clsx-style arrays/objects in `class` attributes instead of `class:` directive:
  ```svelte
  <!-- Do this -->
  <div class={['tdc-header', isCollapsed && 'tdc-collapsed', isCompact && 'tdc-compact']}>

  <!-- Not this -->
  <div class="tdc-header" class:tdc-collapsed={isCollapsed} class:tdc-compact={isCompact}>
  ```
- Use `style:prop={value}` directive for dynamic inline styles.
- Use `style:--custom-prop={value}` to pass JS variables to CSS:
  ```svelte
  <div style:--columns={columns}>...</div>
  <style>
    div { grid-template-columns: repeat(var(--columns), 1fr); }
  </style>
  ```
- Use `:global(.tdc-xxx)` to target elements outside the component boundary.
- Keep global styles in `styles.css`: CSS custom properties, priority colors, Obsidian overrides.
- `css: 'injected'` in esbuild config embeds component CSS into the JS bundle — no separate CSS file per component.
- Style child components via CSS custom properties (`<Child --color="red" />`), not `:global` unless unavoidable.
- **Every component owns its styles** — add a `<style>` block to every `.svelte` file. No naked styled divs.
- **Wrapper components for repeated patterns** — extract reusable styled wrappers (`StatePill`, `LoadingIndicator`, `ErrorDisplay`) instead of duplicating styled markup.
- **CSS migration is per-phase** — move CSS from `styles.css` into component `<style>` blocks when the component is created, not in a separate phase.
- Use `:global()` for child SVG selectors: `.my-class :global(svg) { ... }` — Svelte scoping doesn't reach into child component output.

### Imperative Mounting (Obsidian Integration)

Modal classes keep `extends Modal`. Mount Svelte inside `onOpen()`:
```ts
import { mount, unmount } from 'svelte';
import Content from './Content.svelte';

onOpen() {
  this.component = mount(Content, {
    target: this.contentEl,
    props: { plugin: this.plugin, onclose: () => this.close() }
  });
}

onClose() {
  if (this.component) { unmount(this.component); }
}
```
Effects (including `onMount`) do not run synchronously during `mount()` — call `flushSync()` only if immediate execution is needed (e.g., tests).

### Icon Pattern

Per-icon Svelte components in `src/components/icons/`. Each icon imports `IconBase.svelte` and passes SVG paths as `children` snippet.

```svelte
<!-- Usage — same API as before -->
<Icon name="trash" size={16} />
<Icon name="gitPrOpen" size={14} class="tdc-badge-icon" />
```

`Icon.svelte` is a dispatcher — resolves `name` to the per-icon component via `ICON_COMPONENTS` map. Direct icon imports are also available:

```svelte
import { TrashIcon, GitPrOpenIcon } from './icons/index';
<TrashIcon size={16} />
```

Never use `DOMParser` for SVG rendering. Never use `innerHTML` for icons. Always go through `Icon.svelte` or direct icon component imports.

### TypeScript

- Use latest TypeScript 5 features.
- Prefer `interface` over `type` for object shapes.
- Use `readonly` on interface properties for configuration and input data.

### General Conventions

- Early return over nested ifs.
- `void asyncFunc()` when the promise is intentionally discarded.
- Top-level: `function name() {}`. Scoped: `const name = () => {}`.
- DRY: extract common logic, types, constants... but don't extract single-use code.
