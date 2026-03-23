<script lang="ts">
  import type { IssueProgress, Priority, ProgressDisplayMode } from '../../types';

  interface Props {
    progress: IssueProgress;
    priority: Priority;
    displayMode: ProgressDisplayMode;
  }

  let { progress, priority, displayMode }: Props = $props();

  let percentage = $derived(progress.total > 0 ? (progress.done / progress.total) * 100 : 0);

  let progressText = $derived.by(() => {
    if (displayMode === 'number') {
      return `${progress.done}/${progress.total}`;
    }
    if (displayMode === 'percentage') {
      return `${progress.percentage}%`;
    }
    if (displayMode === 'number-percentage') {
      return `${progress.done}/${progress.total} (${progress.percentage}%)`;
    }
    if (displayMode === 'all') {
      return `${progress.percentage}% (${progress.done}/${progress.total})`;
    }
    return '';
  });

  let showBar = $derived(displayMode === 'bar' || displayMode === 'all');
</script>

<div class="tdc-progress">
  {#if showBar}
    <div class="tdc-progress-bar">
      <div
        class={['tdc-progress-fill', `tdc-progress-fill-${priority}`]}
        style:width="{percentage}%"
      ></div>
    </div>
  {/if}
  {#if progressText !== ''}
    <span class="tdc-progress-text">{progressText}</span>
  {/if}
</div>

<style>
.tdc-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  white-space: nowrap;
}

.tdc-progress-bar {
  width: 100px;
  height: 8px;
  background: var(--background-modifier-border);
  border-radius: var(--tdc-border-radius-sm);
  overflow: hidden;
}

.tdc-progress-fill {
  height: 100%;
  transition: width 0.2s ease;
  border-radius: var(--tdc-border-radius-sm);
  background-color: var(--tdc-priority-color);
}

.tdc-progress-text {
  font-size: 0.85em;
  color: var(--text-muted);
  min-width: 90px;
}
</style>
