<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children?: Snippet;
    class?: string;
  }

  let { children, class: className }: Props = $props();
</script>

<div class={['tdc-gh-loading', className]}>
  {#if children}
    {@render children()}
  {:else}
    <span>Loading...</span>
  {/if}
</div>

<style>
.tdc-gh-loading {
  padding: 12px;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
}
</style>
