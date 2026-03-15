<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    message?: string;
    class?: string;
  }

  let { children, message, class: className }: Props = $props();
</script>

<div class={['tdc-gh-error', className]}>
  {#if children}
    {@render children()}
  {:else if message !== undefined}
    <span>{message}</span>
  {/if}
</div>

<style>
.tdc-gh-error {
  padding: 12px;
  color: var(--text-error);
  font-size: 0.9em;
}
</style>
