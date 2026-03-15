<script lang="ts">
  import ModalLayout from './ModalLayout.svelte';

  type WorktreeChoice = 'yes' | 'no';

  interface Props {
    onconfirm: (createWorktree: boolean) => void;
    oncancel: () => void;
    onback: () => void;
  }

  let { onconfirm, oncancel, onback }: Props = $props();

  let selectedChoice: WorktreeChoice = $state('no');

  const CHOICES: WorktreeChoice[] = ['no', 'yes'];

  function getWrappedIndex(current: number, step: number, length: number): number {
    if (length === 0) {
      return 0;
    }
    const safe = current >= 0 ? current : 0;
    return (((safe + step) % length) + length) % length;
  }

  function moveSelection(step: number): void {
    const currentIndex = CHOICES.indexOf(selectedChoice);
    const nextIndex = getWrappedIndex(currentIndex, step, CHOICES.length);
    selectedChoice = CHOICES[nextIndex];
  }

  function confirmSelection(): void {
    onconfirm(selectedChoice === 'yes');
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveSelection(1);
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      moveSelection(-1);
      return;
    }
    if (event.key === 'Backspace') {
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

<ModalLayout title="Create in worktree?">
  {#snippet children()}
    <div class="tdc-selectable-option-list">
      <button
        class={['tdc-selectable-option-btn tdc-worktree-decision-no', selectedChoice === 'no' && 'is-selected']}
        type="button"
        aria-pressed={selectedChoice === 'no'}
        onclick={() => { selectedChoice = 'no'; }}
        onmouseup={(event) => {
          if (event.button !== 0) { return; }
          event.preventDefault();
          selectedChoice = 'no';
          confirmSelection();
        }}
      >
        <div class="tdc-link-type-suggestion">
          <div class="tdc-link-type-label">No</div>
          <div class="tdc-link-type-description">Create as regular issue</div>
        </div>
      </button>
      <button
        class={['tdc-selectable-option-btn tdc-worktree-decision-yes', selectedChoice === 'yes' && 'is-selected']}
        type="button"
        aria-pressed={selectedChoice === 'yes'}
        onclick={() => { selectedChoice = 'yes'; }}
        onmouseup={(event) => {
          if (event.button !== 0) { return; }
          event.preventDefault();
          selectedChoice = 'yes';
          confirmSelection();
        }}
      >
        <div class="tdc-link-type-suggestion">
          <div class="tdc-link-type-label">Yes</div>
          <div class="tdc-link-type-description">Create in worktree</div>
        </div>
      </button>
    </div>
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-secondary" onclick={onback}>
      Back <kbd>⟵</kbd>
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={oncancel}>
      Cancel <kbd>Esc</kbd>
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={confirmSelection}>
      Confirm <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>
