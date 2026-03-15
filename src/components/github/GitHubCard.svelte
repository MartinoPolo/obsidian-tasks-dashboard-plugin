<script lang="ts">
  import type { GitHubDisplayMode, GitHubIssueMetadata, GitHubLabel } from '../../types';
  import {
    formatRelativeDate,
    getContrastColor,
    getStateClass,
    getStateText,
    truncateText
  } from '../../utils/github-helpers';
  import Icon from '../Icon.svelte';
  import GitHubCardActions from './GitHubCardActions.svelte';

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
</script>

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
    <GitHubCardActions {onrefresh} {onunlink} />
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
      <GitHubCardActions {onrefresh} {onunlink} />
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
      <GitHubCardActions {onrefresh} {onunlink} />
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
