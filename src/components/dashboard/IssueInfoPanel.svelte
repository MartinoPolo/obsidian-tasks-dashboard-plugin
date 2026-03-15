<script lang="ts">
  import { attachAnchoredPanel } from '../../lib/anchored-panel';

  interface Props {
    content: string;
    anchorElement: HTMLElement;
    onclose: () => void;
  }

  let { content, anchorElement, onclose }: Props = $props();
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
  <div class="tdc-issue-info-panel-content">{content}</div>
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
</style>
