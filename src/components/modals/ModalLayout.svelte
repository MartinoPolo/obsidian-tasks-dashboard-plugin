<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    children: Snippet;
    actions?: Snippet;
    onsubmit?: () => void;
    class?: string;
  }

  let { title, children, actions, onsubmit, class: className }: Props = $props();

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && onsubmit !== undefined) {
      const target = event.target;
      if (target instanceof HTMLButtonElement || target instanceof HTMLSelectElement) {
        return;
      }
      event.preventDefault();
      onsubmit();
    }
  }
</script>

<div class={['tdc-modal-content', className]}>
  <div class="tdc-prompt-title">{title}</div>
  <div class="tdc-modal-body">
    {@render children()}
  </div>
  {#if actions !== undefined}
    <div class="tdc-prompt-buttons">
      {@render actions()}
    </div>
  {/if}
</div>

<svelte:window onkeydown={handleKeydown} />
