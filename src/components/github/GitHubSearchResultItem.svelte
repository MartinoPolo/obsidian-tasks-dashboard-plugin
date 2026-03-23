<script lang="ts">
  import type { GitHubIssueMetadata } from '../../types';
  import { getStateClass, getStateText, truncateText } from '../../utils/github-helpers';
  import Icon from '../Icon.svelte';

  interface Props {
    item: GitHubIssueMetadata;
    isSelected: boolean;
    titleTruncationLength: number;
    onclick: () => void;
  }

  let { item, isSelected, titleTruncationLength, onclick }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class={['tdc-gh-result-item', isSelected && 'tdc-gh-selected']}
  {onclick}
>
  <span class="tdc-gh-result-icon">
    <Icon name={item.isPR ? 'pr' : 'issue'} size={16} />
  </span>
  <span class="tdc-gh-result-number">#{item.number}</span>
  <span class="tdc-gh-result-title">{truncateText(item.title, titleTruncationLength)}</span>
  <span class={`tdc-gh-result-state tdc-gh-state-${getStateClass(item)}`}>{getStateText(item)}</span>
  {#if item.repository !== ''}
    <span class="tdc-gh-result-repo">{item.repository}</span>
  {/if}
</div>

<style>
.tdc-gh-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: var(--tdc-transition-fast);
}

.tdc-gh-result-item:hover,
.tdc-gh-selected {
  background: var(--background-modifier-hover);
}

.tdc-gh-result-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.tdc-gh-result-icon :global(svg) {
  width: 16px;
  height: 16px;
}

.tdc-gh-result-number {
  font-weight: 600;
  color: var(--text-accent);
  flex-shrink: 0;
}

.tdc-gh-result-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tdc-gh-result-state {
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.tdc-gh-result-repo {
  font-size: 0.75em;
  color: var(--text-faint);
  font-family: monospace;
}
</style>
