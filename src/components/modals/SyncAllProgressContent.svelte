<script lang="ts">
  import type { BranchSyncLine, BranchSyncStatus } from '../../git-status/sync-types';
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    branches: BranchSyncLine[];
    isComplete: boolean;
    onclose: () => void;
    onclaudehandle?: (branchName: string) => void;
  }

  let { branches, isComplete, onclose, onclaudehandle }: Props = $props();

  const STATUS_LABELS: Record<BranchSyncStatus, string> = {
    pending: 'Waiting...',
    fetching: 'Fetching...',
    checking: 'Checking...',
    merging: 'Merging...',
    pushing: 'Pushing...',
    done: 'Synced',
    dirty: 'Dirty — needs manual handling',
    conflicts: 'Conflicts — needs manual handling',
    'no-upstream': 'No upstream — push manually',
    failed: 'Failed'
  };

  const STATUS_ICONS: Record<BranchSyncStatus, string> = {
    pending: '○',
    fetching: '◉',
    checking: '◉',
    merging: '◉',
    pushing: '◉',
    done: '✓',
    dirty: '⚠',
    conflicts: '⚠',
    'no-upstream': '⚠',
    failed: '✗'
  };

  let needsClaudeCode = $derived(
    branches.filter((b) => b.status === 'dirty' || b.status === 'conflicts' || b.status === 'no-upstream')
  );

  let completedCount = $derived(
    branches.filter((b) => b.status === 'done').length
  );
</script>

<ModalLayout title="Sync All Branches">
  {#snippet children()}
    <div class="tdc-sync-all-branches">
      {#each branches as branch}
        <div class="tdc-sync-branch-line tdc-sync-branch-{branch.status}">
          <span class="tdc-sync-branch-icon">{STATUS_ICONS[branch.status]}</span>
          <span class="tdc-sync-branch-name">{branch.branchName}</span>
          <span class="tdc-sync-branch-status">{STATUS_LABELS[branch.status]}</span>
        </div>
        {#if branch.errorMessage !== undefined}
          <div class="tdc-sync-branch-error">{branch.errorMessage}</div>
        {/if}
      {/each}
    </div>

    {#if isComplete}
      <div class="tdc-sync-all-summary">
        <p>{completedCount} of {branches.length} branch{branches.length === 1 ? '' : 'es'} synced.</p>
      </div>

      {#if needsClaudeCode.length > 0}
        <div class="tdc-sync-all-fallback">
          <p class="tdc-sync-fallback-title">Branches needing manual handling:</p>
          {#each needsClaudeCode as branch}
            <div class="tdc-sync-fallback-row">
              <span>{branch.branchName} — {branch.status === 'dirty' ? 'uncommitted changes' : branch.status === 'conflicts' ? 'merge conflicts' : 'no upstream tracking'}</span>
              {#if onclaudehandle !== undefined}
                <button class="tdc-prompt-btn tdc-prompt-btn-secondary tdc-sync-fallback-btn" onclick={() => onclaudehandle(branch.branchName)}>
                  Let Claude Code handle
                </button>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={onclose}>
      Close
    </button>
  {/snippet}
</ModalLayout>

<style>
.tdc-sync-all-branches {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0;
  max-height: 300px;
  overflow-y: auto;
}

.tdc-sync-branch-line {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  padding: 4px 0;
}

.tdc-sync-branch-icon {
  flex-shrink: 0;
  width: 18px;
  text-align: center;
  font-weight: 600;
}

.tdc-sync-branch-name {
  font-weight: 500;
  flex-shrink: 0;
}

.tdc-sync-branch-status {
  color: var(--text-muted);
  flex: 1;
  text-align: right;
}

.tdc-sync-branch-pending { color: var(--text-muted); }
.tdc-sync-branch-fetching,
.tdc-sync-branch-checking,
.tdc-sync-branch-merging,
.tdc-sync-branch-pushing { color: var(--interactive-accent); }
.tdc-sync-branch-fetching .tdc-sync-branch-icon,
.tdc-sync-branch-checking .tdc-sync-branch-icon,
.tdc-sync-branch-merging .tdc-sync-branch-icon,
.tdc-sync-branch-pushing .tdc-sync-branch-icon {
  animation: tdc-sync-pulse 1s ease-in-out infinite;
}
.tdc-sync-branch-done { color: var(--tdc-git-branch-active, #3fb950); }
.tdc-sync-branch-dirty,
.tdc-sync-branch-conflicts,
.tdc-sync-branch-no-upstream { color: var(--tdc-git-sync-behind, #d29922); }
.tdc-sync-branch-failed { color: var(--tdc-priority-high, #f85149); }

.tdc-sync-branch-error {
  font-size: 0.8em;
  color: var(--tdc-priority-high, #f85149);
  padding-left: 26px;
}

.tdc-sync-all-summary {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--background-modifier-border);
  font-size: 0.9em;
  color: var(--text-muted);
}

.tdc-sync-all-fallback {
  margin-top: 8px;
}

.tdc-sync-fallback-title {
  font-size: 0.85em;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.tdc-sync-fallback-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
  font-size: 0.85em;
}

.tdc-sync-fallback-btn {
  flex-shrink: 0;
  font-size: 0.85em;
  padding: 4px 10px;
}

@keyframes tdc-sync-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
