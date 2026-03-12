<script lang="ts">
  import type { IconName } from './icons/index';
  import { attachTooltip } from '../lib/attach-tooltip';
  import Icon from './Icon.svelte';

  interface Props {
    type: 'branch' | 'pr' | 'issue';
    icon: IconName;
    text: string;
    tooltip: string;
    class?: string;
    href?: string;
    oncontextmenu?: (event: MouseEvent) => void;
  }

  let {
    type,
    icon,
    text,
    tooltip,
    class: className,
    href,
    oncontextmenu
  }: Props = $props();
</script>

{#if href}
  <a
    class={['tdc-git-badge', `tdc-git-badge-${type}`, className]}
    {href}
    target="_blank"
    rel="noopener noreferrer"
    {@attach attachTooltip(tooltip, 300)}
  >
    <Icon name={icon} size={14} /> {text}
  </a>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span
    class={['tdc-git-badge', `tdc-git-badge-${type}`, className]}
    {oncontextmenu}
    {@attach attachTooltip(tooltip, 300)}
  >
    <Icon name={icon} size={14} /> {text}
  </span>
{/if}

<style>
.tdc-git-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 10px;
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
  text-decoration: none;
  cursor: default;
  color: var(--text-muted);
  background: var(--background-modifier-border);
  border: 1px solid transparent;
}

.tdc-git-badge :global(svg) {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

a.tdc-git-badge {
  cursor: pointer;
}

a.tdc-git-badge:hover {
  text-decoration: none;
  filter: brightness(1.2);
}

/* Branch badges */
.tdc-git-badge-branch-active {
  color: var(--tdc-git-branch-active);
  background: color-mix(in srgb, var(--tdc-git-branch-active) 15%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-branch-active) 40%, transparent);
}

.tdc-git-badge-branch-local {
  color: var(--tdc-git-branch-local);
  background: color-mix(in srgb, var(--tdc-git-branch-local) 15%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-branch-local) 40%, transparent);
}

.tdc-git-badge-branch-remote-gone {
  color: var(--tdc-git-branch-remote-gone);
  background: color-mix(in srgb, var(--tdc-git-branch-remote-gone) 15%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-branch-remote-gone) 40%, transparent);
}

.tdc-git-badge-branch-deleted {
  color: var(--tdc-git-branch-deleted);
  background: color-mix(in srgb, var(--tdc-git-branch-deleted) 15%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-branch-deleted) 40%, transparent);
  text-decoration: line-through;
}

.tdc-git-badge-branch-unknown {
  color: var(--text-muted);
  background: var(--background-modifier-border);
}

/* PR badges */
.tdc-git-badge-open {
  color: var(--tdc-git-pr-open);
  background: color-mix(in srgb, var(--tdc-git-pr-open) 15%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-open) 40%, transparent);
}

.tdc-git-badge-merged {
  color: var(--tdc-git-pr-merged);
  background: color-mix(in srgb, var(--tdc-git-pr-merged) 15%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-merged) 40%, transparent);
}

.tdc-git-badge-closed {
  color: var(--tdc-git-pr-closed);
  background: color-mix(in srgb, var(--tdc-git-pr-closed) 15%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-closed) 40%, transparent);
}

.tdc-git-badge-draft {
  color: var(--tdc-git-pr-draft);
  background: color-mix(in srgb, var(--tdc-git-pr-draft) 15%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-draft) 40%, transparent);
}

.tdc-git-badge-review {
  color: var(--tdc-git-pr-review);
  background: color-mix(in srgb, var(--tdc-git-pr-review) 15%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-review) 40%, transparent);
}

/* Issue badges */
.tdc-git-badge-issue-open {
  color: var(--tdc-gh-open);
  background: color-mix(in srgb, var(--tdc-gh-open) 15%, transparent);
  border-color: color-mix(in srgb, var(--tdc-gh-open) 40%, transparent);
}

.tdc-git-badge-issue-closed {
  color: var(--tdc-gh-closed);
  background: color-mix(in srgb, var(--tdc-gh-closed) 15%, transparent);
  border-color: color-mix(in srgb, var(--tdc-gh-closed) 40%, transparent);
}

.tdc-git-badge-issue-not-planned {
  color: var(--text-muted);
  background: var(--background-modifier-border);
  border-color: color-mix(in srgb, var(--text-muted) 40%, transparent);
}
</style>
