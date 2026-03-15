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

<style>
.tdc-gh-state {
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  text-transform: capitalize;
}

.tdc-gh-state-open {
  background: color-mix(in srgb, var(--tdc-gh-open) 20%, transparent);
  color: var(--tdc-gh-open);
}

.tdc-gh-state-closed {
  background: color-mix(in srgb, var(--tdc-gh-closed) 20%, transparent);
  color: var(--tdc-gh-closed);
}

.tdc-gh-state-merged {
  background: color-mix(in srgb, var(--tdc-gh-merged) 20%, transparent);
  color: var(--tdc-gh-merged);
}

.tdc-gh-state-draft {
  background: color-mix(in srgb, var(--tdc-gh-draft) 20%, transparent);
  color: var(--tdc-gh-draft);
}
</style>
