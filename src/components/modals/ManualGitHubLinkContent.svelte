<script lang="ts">
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    title?: string;
    placeholder?: string;
    skipLabel?: string;
    confirmLabel?: string;
    onconfirm: (value: string | undefined) => void;
    oncancel: () => void;
  }

  let {
    title = 'GitHub Link (optional)',
    placeholder = 'https://github.com/... (or leave empty)',
    skipLabel = 'Skip',
    confirmLabel = 'Next',
    onconfirm,
    oncancel
  }: Props = $props();

  let value: string = $state('');
  let inputElement: HTMLInputElement | undefined = $state(undefined);

  $effect(() => {
    if (inputElement !== undefined) {
      inputElement.focus();
    }
  });

  function confirm(): void {
    const trimmed = value.trim();
    onconfirm(trimmed !== '' ? trimmed : undefined);
  }
</script>

<ModalLayout {title} onsubmit={confirm}>
  {#snippet children()}
    <input
      type="text"
      class="tdc-prompt-input"
      {placeholder}
      bind:value={value}
      bind:this={inputElement}
      onkeydown={(event) => { if (event.key === 'Backspace') { event.stopPropagation(); } }}
    />
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={oncancel}>
      {skipLabel} <kbd>Esc</kbd>
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={confirm}>
      {confirmLabel} <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>
