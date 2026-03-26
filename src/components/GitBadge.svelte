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
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-git-branch-active) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-branch-active) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-branch-active :global(svg) {
  color: color-mix(in srgb, var(--tdc-git-branch-active) 35%, var(--tdc-badge-icon-mix));
}

.tdc-git-badge-branch-local {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-git-branch-local) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-branch-local) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-branch-local :global(svg) {
  color: color-mix(in srgb, var(--tdc-git-branch-local) 35%, var(--tdc-badge-icon-mix));
}

.tdc-git-badge-branch-remote-gone {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-git-branch-remote-gone) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-branch-remote-gone) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-branch-remote-gone :global(svg) {
  color: color-mix(in srgb, var(--tdc-git-branch-remote-gone) 35%, var(--tdc-badge-icon-mix));
}

.tdc-git-badge-branch-deleted {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-git-branch-deleted) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-branch-deleted) 60%, var(--tdc-badge-border-mix));
  text-decoration: line-through;
}
.tdc-git-badge-branch-deleted :global(svg) {
  color: color-mix(in srgb, var(--tdc-git-branch-deleted) 35%, var(--tdc-badge-icon-mix));
}

.tdc-git-badge-branch-unknown {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--text-muted) 80%, transparent);
  border-color: color-mix(in srgb, var(--text-muted) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-branch-unknown :global(svg) {
  color: color-mix(in srgb, var(--text-muted) 35%, var(--tdc-badge-icon-mix));
}

/* PR badges */
.tdc-git-badge-open {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-git-pr-open) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-open) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-open :global(svg) {
  color: color-mix(in srgb, var(--tdc-git-pr-open) 35%, var(--tdc-badge-icon-mix));
}

.tdc-git-badge-merged {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-git-pr-merged) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-merged) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-merged :global(svg) {
  color: color-mix(in srgb, var(--tdc-git-pr-merged) 35%, var(--tdc-badge-icon-mix));
}

.tdc-git-badge-closed {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-git-pr-closed) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-closed) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-closed :global(svg) {
  color: color-mix(in srgb, var(--tdc-git-pr-closed) 35%, var(--tdc-badge-icon-mix));
}

.tdc-git-badge-draft {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-git-pr-draft) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-draft) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-draft :global(svg) {
  color: color-mix(in srgb, var(--tdc-git-pr-draft) 35%, var(--tdc-badge-icon-mix));
}

.tdc-git-badge-review {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-git-pr-review) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-pr-review) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-review :global(svg) {
  color: color-mix(in srgb, var(--tdc-git-pr-review) 35%, var(--tdc-badge-icon-mix));
}

/* Issue badges */
.tdc-git-badge-issue-open {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-gh-open) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-gh-open) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-issue-open :global(svg) {
  color: color-mix(in srgb, var(--tdc-gh-open) 35%, var(--tdc-badge-icon-mix));
}

.tdc-git-badge-issue-closed {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-gh-closed) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-gh-closed) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-issue-closed :global(svg) {
  color: color-mix(in srgb, var(--tdc-gh-closed) 35%, var(--tdc-badge-icon-mix));
}

.tdc-git-badge-issue-not-planned {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--text-muted) 80%, transparent);
  border-color: color-mix(in srgb, var(--text-muted) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-issue-not-planned :global(svg) {
  color: color-mix(in srgb, var(--text-muted) 35%, var(--tdc-badge-icon-mix));
}

/* Sync badges */
.tdc-git-badge-sync-behind {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-git-sync-behind) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-sync-behind) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-sync-behind :global(svg) {
  color: color-mix(in srgb, var(--tdc-git-sync-behind) 35%, var(--tdc-badge-icon-mix));
}

.tdc-git-badge-merge-conflict {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-git-merge-conflict) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-merge-conflict) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-merge-conflict :global(svg) {
  color: color-mix(in srgb, var(--tdc-git-merge-conflict) 35%, var(--tdc-badge-icon-mix));
}

.tdc-git-badge-push-behind {
  color: var(--tdc-badge-text);
  background: color-mix(in srgb, var(--tdc-git-push-behind) 80%, transparent);
  border-color: color-mix(in srgb, var(--tdc-git-push-behind) 60%, var(--tdc-badge-border-mix));
}
.tdc-git-badge-push-behind :global(svg) {
  color: color-mix(in srgb, var(--tdc-git-push-behind) 35%, var(--tdc-badge-icon-mix));
}
</style>
