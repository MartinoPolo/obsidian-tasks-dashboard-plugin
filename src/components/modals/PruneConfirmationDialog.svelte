<script lang="ts">
  import type { PrunableIssueInfo } from '../../modals/prune-confirmation-modal';
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    prunableIssues: PrunableIssueInfo[];
    onconfirm: () => void;
    oncancel: () => void;
  }

  let { prunableIssues, onconfirm, oncancel }: Props = $props();

  let issueCount = $derived(prunableIssues.length);
</script>

<ModalLayout title="Prune Closed Worktrees" onsubmit={onconfirm}>
  {#snippet children()}
    <p class="tdc-delete-message">
      Remove {issueCount} closed worktree{issueCount === 1 ? '' : 's'} and archive {issueCount === 1 ? 'its' : 'their'} dashboard issue{issueCount === 1 ? '' : 's'}?
    </p>
    <ul class="tdc-prune-list">
      {#each prunableIssues as item (item.issueId)}
        <li class="tdc-prune-list-item">
          <span class="tdc-prune-issue-name">{item.issueName}</span>
          <span class="tdc-prune-branch-name">{item.branchName}</span>
        </li>
      {/each}
    </ul>
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={oncancel}>
      Cancel <kbd>Esc</kbd>
    </button>
    <button class="tdc-prompt-btn tdc-prompt-btn-confirm" onclick={onconfirm}>
      Prune <kbd>↵</kbd>
    </button>
  {/snippet}
</ModalLayout>

<style>
.tdc-prune-list {
  list-style: none;
  padding: 0;
  margin: 8px 0;
  max-height: 240px;
  overflow-y: auto;
}

.tdc-prune-list-item {
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  border-radius: 4px;
  background: var(--background-modifier-hover);
  margin-bottom: 4px;
}

.tdc-prune-issue-name {
  font-weight: 600;
  font-size: 0.9em;
}

.tdc-prune-branch-name {
  font-size: 0.8em;
  color: var(--text-muted);
  font-family: var(--font-monospace);
}
</style>
