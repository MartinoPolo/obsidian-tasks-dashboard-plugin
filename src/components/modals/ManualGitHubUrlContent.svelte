<script lang="ts">
  import { Notice } from 'obsidian';
  import { isGitHubWebUrl } from '../../utils/github';
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    title: string;
    placeholder: string;
    validate: (url: string) => boolean;
    onconfirm: (url: string) => void;
    oncancel: () => void;
  }

  let { title, placeholder, validate, onconfirm, oncancel }: Props = $props();

  let value: string = $state('');
  let inputElement: HTMLInputElement | undefined = $state(undefined);

  $effect(() => {
    if (inputElement !== undefined) {
      inputElement.focus();
    }
  });

  function confirm(): void {
    const trimmed = value.trim();
    if (!isGitHubWebUrl(trimmed)) {
      new Notice('Enter a valid GitHub URL.');
      return;
    }

    if (!validate(trimmed)) {
      new Notice('URL type does not match the selected assignment.');
      return;
    }

    onconfirm(trimmed);
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
      onkeydown={(event) => { if (event.key === 'Escape') { return; } event.stopPropagation(); }}
    />
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={oncancel}>
      Cancel <kbd>Esc</kbd>
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={confirm}>
      Save <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>
