<script lang="ts">
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    branchName: string;
    oncancel: () => void;
    onclaudehandle: () => void;
    onpushsetupstream: () => void;
  }

  let { branchName, oncancel, onclaudehandle, onpushsetupstream }: Props = $props();
</script>

<ModalLayout title="No Remote Tracking" onsubmit={onpushsetupstream}>
  {#snippet children()}
    <p class="tdc-dirty-worktree-message">
      Branch <strong>{branchName}</strong> has no remote tracking configured.
    </p>
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={oncancel}>
      Cancel
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-secondary" onclick={onclaudehandle}>
      Let Claude Code handle
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={onpushsetupstream}>
      Push & set upstream <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>
