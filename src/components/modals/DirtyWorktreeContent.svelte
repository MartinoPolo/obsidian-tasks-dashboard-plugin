<script lang="ts">
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    branchName: string;
    onhandleyourself: () => void;
    onletclaudehandle: () => void;
  }

  let { branchName, onhandleyourself, onletclaudehandle }: Props = $props();
</script>

<ModalLayout title="Uncommitted Changes">
  {#snippet children()}
    <p class="tdc-dirty-worktree-message">
      The worktree for <strong>{branchName}</strong> has uncommitted changes.
      It must be clean before syncing.
    </p>
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={onhandleyourself}>
      Handle yourself
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={onletclaudehandle}>
      Let Claude Code handle it <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>
