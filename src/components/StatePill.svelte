<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    stateClass: string;
    class?: string;
    children: Snippet;
  }

  let { stateClass, class: className, children }: Props = $props();
</script>

<span class={[`tdc-gh-state tdc-gh-state-${stateClass}`, className]}>{@render children()}</span>
