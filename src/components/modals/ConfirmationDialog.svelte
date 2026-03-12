<script lang="ts">
  import type { Snippet } from 'svelte';
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    title: string;
    message: string;
    confirmLabel?: string;
    confirmClass?: string;
    onconfirm: () => void;
    oncancel: () => void;
    extras?: Snippet;
    warningText?: string;
    checkboxLabel?: string;
    checkboxChecked?: boolean;
    oncheckboxchange?: (checked: boolean) => void;
  }

  let {
    title,
    message,
    confirmLabel = 'Confirm',
    confirmClass = 'tdc-prompt-btn-confirm',
    onconfirm,
    oncancel,
    extras,
    warningText,
    checkboxLabel,
    checkboxChecked = false,
    oncheckboxchange
  }: Props = $props();

  // svelte-ignore state_referenced_locally
  let checked: boolean = $state(checkboxChecked);

  function handleCheckboxChange(): void {
    oncheckboxchange?.(checked);
  }
</script>

<ModalLayout {title} onsubmit={onconfirm}>
  {#snippet children()}
    <p class="tdc-delete-message">{message}</p>
    {#if warningText !== undefined}
      <p class="tdc-unfinished-tasks-warning">{warningText}</p>
    {/if}
    {#if checkboxLabel !== undefined}
      <div class="tdc-delete-checkbox-row">
        <input
          type="checkbox"
          id="tdc-confirm-checkbox"
          bind:checked={checked}
          onchange={handleCheckboxChange}
        />
        <label for="tdc-confirm-checkbox">{checkboxLabel}</label>
      </div>
    {/if}
    {#if extras !== undefined}
      {@render extras()}
    {/if}
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={oncancel}>
      Cancel <kbd>Esc</kbd>
    </button>
    <button class={['tdc-prompt-btn', confirmClass]} onclick={onconfirm}>
      {confirmLabel} <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>
