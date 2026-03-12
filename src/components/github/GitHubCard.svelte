<script lang="ts">
  import type { GitHubDisplayMode, GitHubIssueMetadata, GitHubLabel } from '../../types';
  import {
    formatRelativeDate,
    getContrastColor,
    getStateClass,
    getStateText,
    truncateText
  } from '../../utils/github-helpers';
  import { attachTooltip } from '../../lib/attach-tooltip';
  import Icon from '../Icon.svelte';

  interface Props {
    metadata: GitHubIssueMetadata;
    displayMode: GitHubDisplayMode;
    onrefresh: () => void;
    onunlink?: () => void;
  }

  let { metadata, displayMode, onrefresh, onunlink }: Props = $props();

  let stateClass = $derived(getStateClass(metadata));
  let stateText = $derived(getStateText(metadata));
  let iconName = $derived(metadata.isPR ? 'pr' as const : 'issue' as const);

  let hasBody = $derived(metadata.body !== undefined && metadata.body !== '');

  function handleRefreshClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    onrefresh();
  }

  function handleUnlinkClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    onunlink?.();
  }

  function formatStarCount(count: number): string {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  }
</script>

{#snippet cardActions(parent?: 'header')}
  <button class="tdc-gh-refresh" onclick={handleRefreshClick} {@attach attachTooltip('Refresh GitHub data')}>
    <Icon name="refreshCard" size={16} />
  </button>
  {#if onunlink !== undefined}
    <button class="tdc-gh-unlink" onclick={handleUnlinkClick} {@attach attachTooltip('Remove GitHub link')}>
      <Icon name="unlink" size={16} />
    </button>
  {/if}
{/snippet}

{#snippet labels(labelList: GitHubLabel[], maxCount?: number)}
  {#if labelList.length > 0}
    {@const displayLabels = maxCount !== undefined ? labelList.slice(0, maxCount) : labelList}
    <div class="tdc-gh-labels">
      {#each displayLabels as label (label.name)}
        <span
          class="tdc-gh-label"
          style:background-color={`#${label.color}`}
          style:color={getContrastColor(label.color)}
        >{label.name}</span>
      {/each}
      {#if maxCount !== undefined && labelList.length > maxCount}
        <span class="tdc-gh-label-more">+{labelList.length - maxCount}</span>
      {/if}
    </div>
  {/if}
{/snippet}

{#if displayMode === 'minimal'}
  <div class="tdc-gh-card tdc-gh-card-minimal">
    <a class="tdc-gh-link" href={metadata.url} target="_blank">
      <Icon name={iconName} size={16} />
      <span>#{metadata.number}</span>
    </a>
    <span class={`tdc-gh-state tdc-gh-state-${stateClass}`}>{stateText}</span>
    {@render cardActions()}
  </div>
{:else if displayMode === 'compact'}
  <div class="tdc-gh-card tdc-gh-card-compact">
    <div class="tdc-gh-header">
      <a class="tdc-gh-link" href={metadata.url} target="_blank">
        <Icon name={iconName} size={16} />
        <span class="tdc-gh-number">#{metadata.number}</span>
      </a>
      <span class="tdc-gh-title">{truncateText(metadata.title, 60)}</span>
      <span class={`tdc-gh-state tdc-gh-state-${stateClass}`}>{stateText}</span>
      {@render cardActions()}
    </div>
    {@render labels(metadata.labels, 5)}
    {#if hasBody}
      <div class="tdc-gh-preview">{truncateText(metadata.body!.replace(/\r?\n/g, ' '), 100)}</div>
    {/if}
  </div>
{:else}
  <div class="tdc-gh-card tdc-gh-card-full">
    <div class="tdc-gh-header">
      <a class="tdc-gh-link" href={metadata.url} target="_blank">
        <Icon name={iconName} size={16} />
        <span class="tdc-gh-number">#{metadata.number}</span>
      </a>
      <span class="tdc-gh-title">{metadata.title}</span>
      <span class={`tdc-gh-state tdc-gh-state-${stateClass}`}>{stateText}</span>
      {@render cardActions()}
    </div>
    {@render labels(metadata.labels)}
    {#if metadata.assignees.length > 0}
      <div class="tdc-gh-assignees">
        <span class="tdc-gh-assignees-label">Assignees: </span>
        <span>{metadata.assignees.map((a) => `@${a}`).join(', ')}</span>
      </div>
    {/if}
    {#if hasBody}
      <div class="tdc-gh-body">{truncateText(metadata.body!.replace(/\r?\n/g, ' '), 200)}</div>
    {/if}
    <div class="tdc-gh-footer">
      <span class="tdc-gh-repo">{metadata.repository}</span>
      <span class="tdc-gh-date">Updated {formatRelativeDate(metadata.updatedAt)}</span>
    </div>
  </div>
{/if}

<style>
.tdc-gh-card {
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--tdc-border-radius);
  padding: 10px 12px;
  background: var(--background-secondary);
}

.tdc-gh-card-minimal {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
}

.tdc-gh-card-compact .tdc-gh-header,
.tdc-gh-card-full .tdc-gh-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tdc-gh-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-accent);
  text-decoration: none;
  font-weight: 500;
}

.tdc-gh-link:hover {
  text-decoration: underline;
}

.tdc-gh-link :global(svg) {
  width: 16px;
  height: 16px;
}

.tdc-gh-number {
  font-weight: 600;
}

.tdc-gh-title {
  flex: 1;
  color: var(--text-normal);
  font-weight: 500;
}

.tdc-gh-state,
.tdc-gh-label {
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 12px;
}

.tdc-gh-state {
  font-size: 0.8em;
  text-transform: capitalize;
}

.tdc-gh-state-open {
  background: color-mix(in srgb, var(--tdc-gh-open) 20%, transparent);
  color: var(--tdc-gh-open);
}

.tdc-gh-state-closed {
  background: color-mix(in srgb, var(--tdc-gh-closed) 20%, transparent);
  color: var(--tdc-gh-closed);
}

.tdc-gh-state-merged {
  background: color-mix(in srgb, var(--tdc-gh-merged) 20%, transparent);
  color: var(--tdc-gh-merged);
}

.tdc-gh-state-draft {
  background: color-mix(in srgb, var(--tdc-gh-draft) 20%, transparent);
  color: var(--tdc-gh-draft);
}

.tdc-gh-refresh,
.tdc-gh-unlink {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--tdc-border-radius-sm);
  transition: var(--tdc-transition-fast);
}

.tdc-gh-refresh {
  margin-left: auto;
}

.tdc-gh-refresh:hover {
  background: var(--background-modifier-hover);
  color: var(--text-normal);
}

.tdc-gh-unlink:hover {
  background: color-mix(in srgb, var(--tdc-priority-high) 20%, transparent);
  color: var(--tdc-priority-high);
}

.tdc-gh-refresh :global(svg),
.tdc-gh-unlink :global(svg) {
  width: 14px;
  height: 14px;
  stroke: currentColor;
}

.tdc-gh-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.tdc-gh-label {
  font-size: 0.75em;
}

.tdc-gh-label-more {
  font-size: 0.75em;
  color: var(--text-muted);
  padding: 2px 4px;
}

.tdc-gh-preview {
  margin-top: 8px;
  font-size: 0.9em;
  color: var(--text-muted);
  font-style: italic;
}

.tdc-gh-assignees {
  margin-top: 6px;
  font-size: 0.85em;
  color: var(--text-muted);
}

.tdc-gh-assignees-label {
  font-weight: 500;
}

.tdc-gh-body,
.tdc-gh-footer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--background-modifier-border);
  color: var(--text-muted);
}

.tdc-gh-body {
  font-size: 0.9em;
  line-height: 1.5;
}

.tdc-gh-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.8em;
}

.tdc-gh-repo {
  font-family: monospace;
}
</style>
