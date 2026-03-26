<script lang="ts">
  import type { SyncStep } from '../../git-status/sync-types';
  import ModalLayout from './ModalLayout.svelte';

  interface Props {
    baseBranch: string;
    steps: SyncStep[];
    onclose: () => void;
  }

  let { baseBranch, steps, onclose }: Props = $props();

  const STATUS_ICONS: Record<string, string> = {
    pending: '○',
    active: '◉',
    complete: '✓',
    failed: '✗'
  };
</script>

<ModalLayout title="Syncing with origin/{baseBranch}">
  {#snippet children()}
    <div class="tdc-sync-steps">
      {#each steps as step}
        <div class="tdc-sync-step tdc-sync-step-{step.status}">
          <span class="tdc-sync-step-icon">{STATUS_ICONS[step.status] ?? '○'}</span>
          <span class="tdc-sync-step-label">{step.label}</span>
          {#if step.errorMessage !== undefined}
            <div class="tdc-sync-step-error">{step.errorMessage}</div>
          {/if}
        </div>
      {/each}
    </div>
  {/snippet}
  {#snippet actions()}
    <button class="tdc-prompt-btn tdc-prompt-btn-cancel" onclick={onclose}>
      Close
    </button>
  {/snippet}
</ModalLayout>

<style>
.tdc-sync-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.tdc-sync-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.95em;
}

.tdc-sync-step-icon {
  flex-shrink: 0;
  width: 20px;
  text-align: center;
  font-weight: 600;
}

.tdc-sync-step-pending {
  color: var(--text-muted);
}

.tdc-sync-step-active {
  color: var(--interactive-accent);
}

.tdc-sync-step-active .tdc-sync-step-icon {
  animation: tdc-sync-pulse 1s ease-in-out infinite;
}

@keyframes tdc-sync-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.tdc-sync-step-complete {
  color: var(--tdc-git-branch-active, #3fb950);
}

.tdc-sync-step-failed {
  color: var(--tdc-priority-high, #f85149);
}

.tdc-sync-step-error {
  font-size: 0.85em;
  color: var(--tdc-priority-high, #f85149);
  margin-top: 2px;
  padding-left: 28px;
}

.tdc-sync-step-label {
  flex: 1;
}
</style>
