<script lang="ts">
  import { attachAnchoredPanel } from '../../lib/anchored-panel';

  interface SortOption {
    label: string;
    action: () => void;
  }

  interface Props {
    options: SortOption[];
    anchorElement: HTMLElement;
    onclose: () => void;
  }

  let { options, anchorElement, onclose }: Props = $props();

  const positionSortDropdown = (panelElement: HTMLElement, anchor: HTMLElement): Record<string, string> => {
    const anchorRect = anchor.getBoundingClientRect();
    const viewportPadding = 8;
    const dropdownWidth = Math.max(panelElement.offsetWidth, anchorRect.width);
    const maxLeft = window.innerWidth - dropdownWidth - viewportPadding;
    const left = Math.max(viewportPadding, Math.min(anchorRect.left, maxLeft));
    return {
      top: `${anchorRect.bottom + 4}px`,
      left: `${left}px`,
      'min-width': `${anchorRect.width}px`
    };
  };

  const handleItemActivate = (option: SortOption) => {
    onclose();
    option.action();
  };
</script>

<div
  class="tdc-sort-dropdown tdc-sort-dropdown-portal"
  {@attach attachAnchoredPanel({
    anchorElement,
    onclose,
    closeOnBlur: false,
    closeOnEscape: false,
    outsideClickCapture: false,
    customPosition: positionSortDropdown
  })}
>
  {#each options as option (option.label)}
    <div
      class="tdc-sort-dropdown-item"
      role="button"
      tabindex="0"
      onclick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        handleItemActivate(option);
      }}
      onkeydown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          handleItemActivate(option);
        }
      }}
    >
      {option.label}
    </div>
  {/each}
</div>

<style>
.tdc-sort-dropdown {
  position: fixed;
  z-index: 10000;
  min-width: 200px;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: var(--tdc-border-radius);
  box-shadow: var(--tdc-shadow-dropdown);
  overflow: hidden;
}

.tdc-sort-dropdown-item {
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.9em;
  color: var(--text-normal);
  transition: var(--tdc-transition-fast);
}

.tdc-sort-dropdown-item:hover {
  background: var(--background-modifier-hover);
}
</style>
