<script lang="ts">
  import { attachPortal } from '../../lib/attach-portal';

  interface Props {
    content: string;
    anchorElement: HTMLElement;
    onclose: () => void;
  }

  let { content, anchorElement, onclose }: Props = $props();

  let panelElement: HTMLDivElement | undefined = $state(undefined);
  let position = $state({ top: 0, left: 0, maxHeight: 0 });

  const positionPanel = () => {
    if (panelElement === undefined || !anchorElement.isConnected) {
      onclose();
      return;
    }

    const triggerRect = anchorElement.getBoundingClientRect();
    const viewportPadding = 8;
    const panelWidth = Math.max(panelElement.offsetWidth, 320);
    const verticalOffset = 4;
    const availableSpaceBelow = Math.max(
      120,
      window.innerHeight - triggerRect.bottom - viewportPadding - verticalOffset
    );
    const availableSpaceAbove = Math.max(
      120,
      triggerRect.top - viewportPadding - verticalOffset
    );
    const shouldOpenAbove = availableSpaceAbove > availableSpaceBelow;
    const maxPanelHeight = shouldOpenAbove ? availableSpaceAbove : availableSpaceBelow;

    const panelHeight = panelElement.offsetHeight;
    const maxLeft = window.innerWidth - panelWidth - viewportPadding;
    const alignedLeft = triggerRect.right - panelWidth;
    const left = Math.max(viewportPadding, Math.min(alignedLeft, maxLeft));

    let top = triggerRect.bottom + verticalOffset;
    if (shouldOpenAbove) {
      top = Math.max(viewportPadding, triggerRect.top - panelHeight - verticalOffset);
    } else {
      const maxTop = window.innerHeight - panelHeight - viewportPadding;
      top = Math.max(viewportPadding, Math.min(top, maxTop));
    }

    position = { top, left, maxHeight: maxPanelHeight };
  };

  const handleOutsideClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      onclose();
      return;
    }
    if (panelElement !== undefined && panelElement.contains(target)) {
      return;
    }
    if (anchorElement.contains(target)) {
      return;
    }
    onclose();
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    onclose();
  };

  $effect(() => {
    positionPanel();

    window.addEventListener('scroll', positionPanel, true);
    window.addEventListener('resize', positionPanel);
    window.addEventListener('blur', onclose);
    document.addEventListener('click', handleOutsideClick, true);
    document.addEventListener('keydown', handleEscape, true);

    return () => {
      window.removeEventListener('scroll', positionPanel, true);
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('blur', onclose);
      document.removeEventListener('click', handleOutsideClick, true);
      document.removeEventListener('keydown', handleEscape, true);
    };
  });
</script>

<div
  class="tdc-overflow-panel tdc-overflow-panel-portal tdc-issue-info-panel"
  bind:this={panelElement}
  style:top="{position.top}px"
  style:left="{position.left}px"
  style:max-height="{position.maxHeight}px"
  {@attach attachPortal()}
>
  <div class="tdc-issue-info-panel-content">{content}</div>
</div>

<style>
.tdc-overflow-panel {
  position: fixed;
  right: auto;
  top: 0;
  left: 0;
  z-index: 10000;
  min-width: 280px;
  padding: 8px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--tdc-border-radius);
  box-shadow: var(--shadow-s);
  max-height: calc(100vh - 16px);
  overflow-y: auto;
  overflow-x: auto;
}

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
