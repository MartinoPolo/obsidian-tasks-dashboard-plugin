<script lang="ts">
  interface Props {
    showBackButton: boolean;
    showSkipButton: boolean;
    separateSkipAndCancelButtons: boolean;
    skipButtonLabel: string;
    enterButtonLabel: string;
    onback: () => void;
    onskip: () => void;
    oncancel: () => void;
    onconfirm: () => void;
  }

  let {
    showBackButton,
    showSkipButton,
    separateSkipAndCancelButtons,
    skipButtonLabel,
    enterButtonLabel,
    onback,
    onskip,
    oncancel,
    onconfirm
  }: Props = $props();
</script>

<div class="tdc-prompt-buttons">
  {#if showBackButton}
    <button class="tdc-prompt-btn tdc-prompt-btn-secondary" onclick={onback}>
      Back <kbd>&#x27F5;</kbd>
    </button>
  {/if}

  {#if separateSkipAndCancelButtons}
    {#if showSkipButton}
      <button class="tdc-prompt-btn tdc-prompt-btn-secondary" onclick={onskip}>
        {skipButtonLabel}
      </button>
    {/if}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={oncancel}>
      Cancel <kbd>Esc</kbd>
    </button>
  {:else}
    {#if showSkipButton}
      <button class="tdc-prompt-btn tdc-prompt-btn-secondary" onclick={onskip}>
        {skipButtonLabel} <kbd>Esc</kbd>
      </button>
    {/if}
  {/if}

  <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={onconfirm}>
    {enterButtonLabel} <kbd>&#x21B5;</kbd>
  </button>
</div>
