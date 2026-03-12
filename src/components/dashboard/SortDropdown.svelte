<script lang="ts">
  import { attachPortal } from '../../lib/attach-portal';

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

  let dropdownElement: HTMLDivElement | undefined = $state(undefined);
  let position = $state({ top: 0, left: 0, minWidth: 0 });

  const positionDropdown = () => {
    if (dropdownElement === undefined) {
      return;
    }
    const rect = anchorElement.getBoundingClientRect();
    const viewportPadding = 8;
    const dropdownWidth = Math.max(dropdownElement.offsetWidth, rect.width);
    const maxLeft = window.innerWidth - dropdownWidth - viewportPadding;
    const left = Math.max(viewportPadding, Math.min(rect.left, maxLeft));
    position = {
      top: rect.bottom + 4,
      left,
      minWidth: rect.width
    };
  };

  const handleOutsideClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      onclose();
      return;
    }
    if (dropdownElement !== undefined && dropdownElement.contains(target)) {
      return;
    }
    if (anchorElement.contains(target)) {
      return;
    }
    onclose();
  };

  $effect(() => {
    requestAnimationFrame(positionDropdown);

    window.addEventListener('scroll', positionDropdown, true);
    window.addEventListener('resize', positionDropdown);
    document.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('scroll', positionDropdown, true);
      window.removeEventListener('resize', positionDropdown);
      document.removeEventListener('click', handleOutsideClick);
    };
  });

  const handleItemClick = (event: MouseEvent, option: SortOption) => {
    event.preventDefault();
    event.stopPropagation();
    onclose();
    option.action();
  };
</script>

<div
  class="tdc-sort-dropdown tdc-sort-dropdown-portal"
  bind:this={dropdownElement}
  style:top="{position.top}px"
  style:left="{position.left}px"
  style:min-width="{position.minWidth}px"
  {@attach attachPortal()}
>
  {#each options as option (option.label)}
    <div
      class="tdc-sort-dropdown-item"
      role="button"
      tabindex="0"
      onclick={(event) => handleItemClick(event, option)}
      onkeydown={(event) => {
        if (event.key === 'Enter') {
          handleItemClick(event as unknown as MouseEvent, option);
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
