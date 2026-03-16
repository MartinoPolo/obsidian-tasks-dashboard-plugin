<script lang="ts">
  import { attachAutofocus } from '../../lib/attach-autofocus';
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    title?: string;
    initialName?: string;
    onconfirm: (name: string) => void;
    oncancel: () => void;
    onsearchopen?: () => void;
    canOpenSearch?: boolean;
  }

  let {
    title = 'Issue Name',
    initialName = '',
    onconfirm,
    oncancel,
    onsearchopen,
    canOpenSearch = false
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let value: string = $state(initialName);
  let hasError: boolean = $state(false);
  let inputElement: HTMLInputElement | undefined = $state(undefined);

  function confirm(): void {
    const trimmed = value.trim();
    if (trimmed === '') {
      hasError = true;
      inputElement?.focus();
      return;
    }
    onconfirm(trimmed);
  }

  function handleInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      event.stopPropagation();
      return;
    }

    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && canOpenSearch) {
      const trimmed = value.trim();
      const shouldOpen = trimmed === '' || /^\d+$/.test(trimmed);
      if (shouldOpen && onsearchopen !== undefined) {
        event.preventDefault();
        event.stopPropagation();
        onsearchopen();
      }
    }
  }
</script>

<ModalLayout {title} onsubmit={confirm}>
  {#snippet children()}
    <input
      type="text"
      class={['tdc-prompt-input', hasError && 'tdc-input-error']}
      placeholder="Enter issue name..."
      bind:value={value}
      bind:this={inputElement}
      {@attach attachAutofocus({ cursorEnd: initialName !== '' })}
      onkeydown={handleInputKeydown}
      oninput={() => { hasError = false; }}
    />
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={oncancel}>
      Cancel <kbd>Esc</kbd>
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={confirm}>
      Confirm <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>
