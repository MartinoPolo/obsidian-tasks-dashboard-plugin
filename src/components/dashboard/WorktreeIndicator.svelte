<script lang="ts">
  import { attachTooltip } from '../../lib/attach-tooltip';
  import ActionButton from '../ActionButton.svelte';
  import Icon from '../Icon.svelte';

  interface Props {
    isWorktreeClickable: boolean;
    isWorktreeActive: boolean;
    worktreeStatusStateClass: string;
    worktreeStatusText: string;
    worktreeLocationTooltip: string;
    onRetry: () => void;
    onRefresh: (event: MouseEvent) => void;
  }

  let {
    isWorktreeClickable,
    isWorktreeActive,
    worktreeStatusStateClass,
    worktreeStatusText,
    worktreeLocationTooltip,
    onRetry,
    onRefresh
  }: Props = $props();
</script>

{#if isWorktreeClickable}
  <ActionButton
    icon="worktree"
    label="Retry worktree setup"
    class="tdc-worktree-action tdc-worktree-action-retry tdc-worktree-status-failed"
    onclick={onRetry}
  />
{:else if isWorktreeActive}
  <button
    class={`tdc-worktree-action tdc-worktree-status tdc-worktree-status-${worktreeStatusStateClass}`}
    type="button"
    onclick={onRefresh}
    {@attach attachTooltip(worktreeLocationTooltip)}
  >
    <Icon name="worktree" size={16} />
  </button>
{:else}
  <span
    class={`tdc-worktree-action tdc-worktree-status tdc-worktree-status-${worktreeStatusStateClass}`}
    role="img"
    {@attach attachTooltip(worktreeStatusText)}
  >
    <Icon name="worktree" size={16} />
  </span>
{/if}

<style>
/* Worktree status styles */
:global(.tdc-worktree-action) {
  flex-shrink: 0;
}

:global(.tdc-worktree-status) {
  width: 24px;
  height: 24px;
  min-width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--tdc-border-radius-sm);
  background: transparent;
  color: var(--text-muted);
  flex-shrink: 0;
}

:global(.tdc-worktree-status) :global(svg) {
  width: 16px;
  height: 16px;
}

:global(.tdc-worktree-status-active) {
  color: var(--tdc-priority-low) !important;
}

:global(.tdc-worktree-status-pending) {
  color: var(--tdc-priority-medium) !important;
}

:global(.tdc-worktree-status-failed) {
  color: var(--tdc-priority-high) !important;
}

:global(.tdc-worktree-status-inactive) {
  color: var(--tdc-worktree-inactive) !important;
}

:global(.tdc-worktree-status):hover {
  background: color-mix(in srgb, var(--tdc-issue-header-link-color, var(--text-normal)) 15%, transparent);
}

:global(button.tdc-worktree-action-retry) {
  color: var(--tdc-priority-high);
}

:global(button.tdc-worktree-action-retry):hover {
  color: var(--tdc-worktree-failed-hover);
}

:global(button.tdc-worktree-status.tdc-worktree-status-active) {
  cursor: pointer;
  border: 0 !important;
  box-shadow: none !important;
  appearance: none;
  -webkit-appearance: none;
  background: transparent !important;
  padding: 0;
}

:global(button.tdc-worktree-status.tdc-worktree-status-active):hover {
  color: var(--tdc-worktree-active-hover) !important;
  background: color-mix(in srgb, var(--tdc-issue-header-link-color, var(--text-normal)) 15%, transparent) !important;
}
</style>
