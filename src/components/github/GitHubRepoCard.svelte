<script lang="ts">
  import type { GitHubDisplayMode, GitHubRepoMetadata } from '../../types';
  import { formatRelativeDate, formatStarCount, truncateText } from '../../utils/github-helpers';
  import Icon from '../Icon.svelte';
  import GitHubCardActions from './GitHubCardActions.svelte';

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
</script>

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
    <GitHubCardActions {onrefresh} {onunlink} />
  </div>
{:else if displayMode === 'compact'}
  <div class="tdc-gh-card tdc-gh-card-compact tdc-gh-card-repo">
    <div class="tdc-gh-header">
      <a class="tdc-gh-link" href={metadata.url} target="_blank">
        <Icon name="repo" size={16} />
        <span class="tdc-gh-repo-name">{metadata.fullName}</span>
      </a>
      <span class={`tdc-gh-state ${visibilityStateClass}`}>{visibilityText}</span>
      <GitHubCardActions {onrefresh} {onunlink} />
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
      <GitHubCardActions {onrefresh} {onunlink} />
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
