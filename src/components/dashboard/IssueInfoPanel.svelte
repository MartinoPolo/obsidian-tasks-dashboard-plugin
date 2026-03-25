<script lang="ts">
  import { INFO_SECTION_HEADER_PREFIX } from '../../git-status/git-status-helpers';
  import { attachAnchoredPanel } from '../../lib/anchored-panel';

  interface Props {
    content: string;
    anchorElement: HTMLElement;
    onclose: () => void;
  }

  let { content, anchorElement, onclose }: Props = $props();

  interface ContentBlock {
    type: 'section-header' | 'text';
    text: string;
  }

  let blocks = $derived.by((): ContentBlock[] => {
    const result: ContentBlock[] = [];
    for (const line of content.split('\n')) {
      if (line.startsWith(INFO_SECTION_HEADER_PREFIX)) {
        result.push({ type: 'section-header', text: line.slice(INFO_SECTION_HEADER_PREFIX.length) });
      } else {
        result.push({ type: 'text', text: line });
      }
    }
    return result;
  });
</script>

<div
  class="tdc-overflow-panel tdc-overflow-panel-portal tdc-issue-info-panel"
  {@attach attachAnchoredPanel({
    anchorElement,
    onclose,
    minPanelWidth: 320,
    useRequestAnimationFrame: false
  })}
>
  <div class="tdc-issue-info-panel-content">
    {#each blocks as block}
      {#if block.type === 'section-header'}
        <div class="tdc-info-section-header">{block.text}</div>
      {:else}
        {block.text}{'\n'}
      {/if}
    {/each}
  </div>
</div>

<style>
.tdc-issue-info-panel {
  min-width: 340px;
  max-width: min(560px, 92vw);
}

.tdc-issue-info-panel-content {
  padding: 2px;
  font-size: 0.82em;
  line-height: 1.45;
  white-space: pre-line;
  word-break: break-word;
}

.tdc-info-section-header {
  font-weight: 600;
  font-size: 1.05em;
  margin-top: 6px;
  padding-bottom: 2px;
  border-bottom: 1px solid var(--background-modifier-border);
  color: var(--text-normal);
}

.tdc-info-section-header:first-child {
  margin-top: 2px;
}
</style>
