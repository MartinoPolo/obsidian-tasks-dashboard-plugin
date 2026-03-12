<script lang="ts">
  import type { GitHubDisplayMode, GitHubRepoMetadata } from '../../types';
  import { formatRelativeDate, truncateText } from '../../utils/github-helpers';
  import { attachTooltip } from '../../lib/attach-tooltip';
  import Icon from '../Icon.svelte';

  interface Props {
    metadata: GitHubRepoMetadata;
    displayMode: GitHubDisplayMode;
    onrefresh: () => void;
    onunlink?: () => void;
  }

  let { metadata, displayMode, onrefresh, onunlink }: Props = $props();

  let visibilityStateClass = $derived(metadata.isPrivate ? 'tdc-gh-state-closed' : 'tdc-gh-state-open');
  let visibilityText = $derived(metadata.isPrivate ? 'Private' : 'Public');
  let hasDescription = $derived(metadata.description !== '');

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

{#snippet cardActions()}
  <button class="tdc-gh-refresh" onclick={handleRefreshClick} {@attach attachTooltip('Refresh GitHub data')}>
    <Icon name="refreshCard" size={16} />
  </button>
  {#if onunlink !== undefined}
    <button class="tdc-gh-unlink" onclick={handleUnlinkClick} {@attach attachTooltip('Remove GitHub link')}>
      <Icon name="unlink" size={16} />
    </button>
  {/if}
{/snippet}

{#snippet repoStats(includeOpenIssues: boolean)}
  <div class="tdc-gh-repo-stats">
    {#if metadata.stars > 0}
      <span class="tdc-gh-repo-stat">
        <Icon name="star" size={16} />
        <span>{formatStarCount(metadata.stars)}</span>
      </span>
    {/if}
    {#if metadata.forksCount > 0}
      <span class="tdc-gh-repo-stat">
        <Icon name="fork" size={16} />
        <span>{metadata.forksCount}</span>
      </span>
    {/if}
    {#if metadata.language !== ''}
      <span class="tdc-gh-repo-stat tdc-gh-repo-language">{metadata.language}</span>
    {/if}
    {#if includeOpenIssues && metadata.openIssuesCount > 0}
      <span class="tdc-gh-repo-stat">{metadata.openIssuesCount} open issues</span>
    {/if}
  </div>
{/snippet}

{#if displayMode === 'minimal'}
  <div class="tdc-gh-card tdc-gh-card-minimal tdc-gh-card-repo">
    <a class="tdc-gh-link" href={metadata.url} target="_blank">
      <Icon name="repo" size={16} />
      <span>{metadata.fullName}</span>
    </a>
    {#if metadata.stars > 0}
      <span class="tdc-gh-repo-stars">
        <Icon name="star" size={16} />
        <span>{formatStarCount(metadata.stars)}</span>
      </span>
    {/if}
    {@render cardActions()}
  </div>
{:else if displayMode === 'compact'}
  <div class="tdc-gh-card tdc-gh-card-compact tdc-gh-card-repo">
    <div class="tdc-gh-header">
      <a class="tdc-gh-link" href={metadata.url} target="_blank">
        <Icon name="repo" size={16} />
        <span class="tdc-gh-repo-name">{metadata.fullName}</span>
      </a>
      <span class={`tdc-gh-state ${visibilityStateClass}`}>{visibilityText}</span>
      {@render cardActions()}
    </div>
    {@render repoStats(false)}
    {#if hasDescription}
      <div class="tdc-gh-preview">{truncateText(metadata.description, 100)}</div>
    {/if}
  </div>
{:else}
  <div class="tdc-gh-card tdc-gh-card-full tdc-gh-card-repo">
    <div class="tdc-gh-header">
      <a class="tdc-gh-link" href={metadata.url} target="_blank">
        <Icon name="repo" size={16} />
        <span class="tdc-gh-repo-name">{metadata.fullName}</span>
      </a>
      <span class={`tdc-gh-state ${visibilityStateClass}`}>{visibilityText}</span>
      {@render cardActions()}
    </div>
    {#if hasDescription}
      <div class="tdc-gh-body">{truncateText(metadata.description, 200)}</div>
    {/if}
    {@render repoStats(true)}
    <div class="tdc-gh-footer">
      <span class="tdc-gh-repo">{metadata.fullName}</span>
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

.tdc-gh-state {
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 12px;
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

.tdc-gh-repo-name {
  font-weight: 600;
}

.tdc-gh-repo-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  font-size: 0.85em;
  color: var(--text-muted);
}

.tdc-gh-repo-stat,
.tdc-gh-repo-stars {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85em;
  color: var(--text-muted);
}

.tdc-gh-repo-stat :global(svg),
.tdc-gh-repo-stars :global(svg) {
  width: 14px;
  height: 14px;
}

.tdc-gh-repo-language {
  font-family: monospace;
  font-size: 0.85em;
}

.tdc-gh-preview {
  margin-top: 8px;
  font-size: 0.9em;
  color: var(--text-muted);
  font-style: italic;
}

.tdc-gh-body {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--background-modifier-border);
  color: var(--text-muted);
  font-size: 0.9em;
  line-height: 1.5;
}

.tdc-gh-footer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--background-modifier-border);
  color: var(--text-muted);
  display: flex;
  justify-content: space-between;
  font-size: 0.8em;
}

.tdc-gh-repo {
  font-family: monospace;
}
</style>
