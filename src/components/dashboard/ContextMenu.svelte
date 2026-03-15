<script lang="ts">
  import { attachAnchoredPanel } from '../../lib/anchored-panel';

  interface ContextMenuItem {
    label: string;
    action: () => void;
  }

  interface Props {
    items: ContextMenuItem[];
    position: { x: number; y: number };
    onclose: () => void;
  }

  let { items, position, onclose }: Props = $props();

  const positionAtCursor = (): Record<string, string> => {
    const viewportPadding = 8;
    return {
      top: `${Math.max(viewportPadding, position.y)}px`,
      left: `${Math.max(viewportPadding, position.x)}px`
    };
  };

  /**
   * Dummy anchor element placed at cursor position.
   * attachAnchoredPanel requires an anchor; this invisible element satisfies that
   * while the customPosition callback ignores it entirely.
   */
  let anchorElement: HTMLDivElement | undefined = $state(undefined);

  const handleItemActivate = (item: ContextMenuItem) => {
    onclose();
    item.action();
  };
</script>

<div
  class="tdc-context-menu-anchor"
  bind:this={anchorElement}
  style:position="fixed"
  style:left="{position.x}px"
  style:top="{position.y}px"
  style:width="0"
  style:height="0"
  style:pointer-events="none"
></div>

{#if anchorElement !== undefined}
  <div
    class="tdc-sort-dropdown tdc-sort-dropdown-portal"
    {@attach attachAnchoredPanel({
      anchorElement,
      onclose,
      closeOnBlur: true,
      closeOnEscape: true,
      outsideClickCapture: true,
      customPosition: positionAtCursor
    })}
  >
    {#each items as item (item.label)}
      <div
        class="tdc-sort-dropdown-item"
        role="button"
        tabindex="0"
        onclick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleItemActivate(item);
        }}
        onkeydown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            handleItemActivate(item);
          }
        }}
      >
        {item.label}
      </div>
    {/each}
  </div>
{/if}
