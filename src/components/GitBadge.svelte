<script lang="ts">
  import { attachTooltip } from '../lib/attach-tooltip';
  import Icon from './Icon.svelte';
  import type { IconName } from './icons/index';

  interface Props {
    type: 'branch' | 'pr' | 'issue' | 'sync';
    icon: IconName;
    text: string;
    tooltip: string;
    class?: string;
    href?: string;
    onclick?: (event: MouseEvent) => void;
    oncontextmenu?: (event: MouseEvent) => void;
    secondaryIcon?: IconName;
    spinning?: boolean;
    disabled?: boolean;
  }

  let {
    type,
    icon,
    text,
    tooltip,
    class: className,
    href,
    onclick,
    oncontextmenu,
    secondaryIcon,
    spinning = false,
    disabled = false
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
    <Icon name={icon} size={14} /><span>{text}</span>
  </a>
{:else if onclick}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span
    class={['tdc-git-badge', 'tdc-git-badge-clickable', `tdc-git-badge-${type}`, spinning && 'tdc-badge-spinning', className]}
    role="button"
    tabindex={disabled ? -1 : 0}
    aria-disabled={disabled}
    onclick={(event) => { if (!disabled) { event.stopPropagation(); onclick(event); } }}
    onkeydown={(event) => { if (!disabled && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); onclick(event as unknown as MouseEvent); } }}
    {@attach attachTooltip(tooltip, 300)}
  >
    <Icon name={icon} size={14} />
    {#if secondaryIcon}
      <Icon name={secondaryIcon} size={14} />
    {/if}
    <span>{text}</span>
  </span>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <span
    class={['tdc-git-badge', `tdc-git-badge-${type}`, className]}
    {oncontextmenu}
    {@attach attachTooltip(tooltip, 300)}
  >
    <Icon name={icon} size={14} /><span>{text}</span>
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

a.tdc-git-badge,
.tdc-git-badge-clickable {
  cursor: pointer;
}

a.tdc-git-badge:hover,
.tdc-git-badge-clickable:hover:not([aria-disabled='true']) {
  text-decoration: none;
  filter: brightness(1.2);
}

.tdc-git-badge-clickable[aria-disabled='true'] {
  cursor: default;
  opacity: 0.7;
}

.tdc-badge-spinning :global(svg:first-child) {
  animation: tdc-spin 0.8s linear infinite;
}

/* Branch badges */
.tdc-git-badge-branch-active {
  color: var(--tdc-git-branch-active);
  background: color-mix(in srgb, var(--tdc-git-branch-active) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-branch-active) 40%, transparent);
}

.tdc-git-badge-branch-local {
  color: var(--tdc-git-branch-local);
  background: color-mix(in srgb, var(--tdc-git-branch-local) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-branch-local) 40%, transparent);
}

.tdc-git-badge-branch-remote-gone {
  color: var(--tdc-git-branch-remote-gone);
  background: color-mix(in srgb, var(--tdc-git-branch-remote-gone) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-branch-remote-gone) 40%, transparent);
}

.tdc-git-badge-branch-deleted {
  color: var(--tdc-git-branch-deleted);
  background: color-mix(in srgb, var(--tdc-git-branch-deleted) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-branch-deleted) 40%, transparent);
  text-decoration: line-through;
}

.tdc-git-badge-branch-unknown {
  color: var(--text-muted);
  background: color-mix(in srgb, var(--text-muted) 30%, transparent);
  border-color: color-mix(in srgb, var(--text-muted) 40%, transparent);
}

/* PR badges */
.tdc-git-badge-open {
  color: var(--tdc-git-pr-open);
  background: color-mix(in srgb, var(--tdc-git-pr-open) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-open) 40%, transparent);
}

.tdc-git-badge-merged {
  color: var(--tdc-git-pr-merged);
  background: color-mix(in srgb, var(--tdc-git-pr-merged) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-merged) 40%, transparent);
}

.tdc-git-badge-closed {
  color: var(--tdc-git-pr-closed);
  background: color-mix(in srgb, var(--tdc-git-pr-closed) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-closed) 40%, transparent);
}

.tdc-git-badge-draft {
  color: var(--tdc-git-pr-draft);
  background: color-mix(in srgb, var(--tdc-git-pr-draft) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-draft) 40%, transparent);
}

.tdc-git-badge-review {
  color: var(--tdc-git-pr-review);
  background: color-mix(in srgb, var(--tdc-git-pr-review) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-review) 40%, transparent);
}

/* Issue badges */
.tdc-git-badge-issue-open {
  color: var(--tdc-gh-open);
  background: color-mix(in srgb, var(--tdc-gh-open) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-gh-open) 40%, transparent);
}

.tdc-git-badge-issue-closed {
  color: var(--tdc-gh-closed);
  background: color-mix(in srgb, var(--tdc-gh-closed) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-gh-closed) 40%, transparent);
}

.tdc-git-badge-issue-not-planned {
  color: var(--text-muted);
  background: color-mix(in srgb, var(--text-muted) 30%, transparent);
  border-color: color-mix(in srgb, var(--text-muted) 40%, transparent);
}

/* Sync badges */
.tdc-git-badge-sync-behind {
  color: var(--tdc-git-sync-behind);
  background: color-mix(in srgb, var(--tdc-git-sync-behind) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-sync-behind) 40%, transparent);
}

.tdc-git-badge-merge-conflict {
  color: var(--tdc-git-merge-conflict);
  background: color-mix(in srgb, var(--tdc-git-merge-conflict) 30%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-merge-conflict) 40%, transparent);
}
</style>
