<script lang="ts">
  import type { Priority } from '../../types';
  import { getWrappedIndex } from '../../utils/array-utils';
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    title?: string;
    onselect: (priority: Priority) => void;
    oncancel: () => void;
    onback?: () => void;
    initialPriority?: Priority;
  }

  const PRIORITY_OPTIONS: Priority[] = ['low', 'medium', 'high', 'top'];

  let {
    title = 'Issue Priority',
    onselect,
    oncancel,
    onback,
    initialPriority = 'low'
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let selectedPriority: Priority = $state(initialPriority);

  function formatPriorityLabel(priority: Priority): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }

  function moveSelection(step: number): void {
    const currentIndex = PRIORITY_OPTIONS.indexOf(selectedPriority);
    const nextIndex = getWrappedIndex(currentIndex, step, PRIORITY_OPTIONS.length);
    selectedPriority = PRIORITY_OPTIONS[nextIndex];
  }

  function confirmSelection(): void {
    onselect(selectedPriority);
  }

  function handleKeydown(event: KeyboardEvent): void {
    const isNextKey =
      event.key === 'ArrowDown' || event.key === 'ArrowRight';
    if (isNextKey) {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    const isPreviousKey =
      event.key === 'ArrowUp' || event.key === 'ArrowLeft';
    if (isPreviousKey) {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === 'Backspace' && onback !== undefined) {
      event.preventDefault();
      event.stopPropagation();
      onback();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      oncancel();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      confirmSelection();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<ModalLayout {title}>
  {#snippet children()}
    <div class="tdc-selectable-option-list">
      {#each PRIORITY_OPTIONS as priority (priority)}
        {@const isSelected = priority === selectedPriority}
        <button
          class={['tdc-selectable-option-btn', isSelected && 'is-selected']}
          type="button"
          aria-pressed={isSelected}
          onclick={() => { selectedPriority = priority; }}
          onmouseup={(event) => {
            if (event.button !== 0) { return; }
            event.preventDefault();
            selectedPriority = priority;
            confirmSelection();
          }}
        >
          <div class="tdc-priority-suggestion">
            <span class={`tdc-priority-dot priority-${priority}`}></span>
            <span>{formatPriorityLabel(priority)}</span>
          </div>
        </button>
      {/each}
    </div>
  {/snippet}
  {#snippet actions()}
    {#if onback !== undefined}
      <button class="tdc-prompt-btn tdc-prompt-btn-secondary" onclick={onback}>
        Back <kbd>⟵</kbd>
      </button>
    {/if}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={oncancel}>
      Cancel <kbd>Esc</kbd>
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={confirmSelection}>
      Confirm <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>
