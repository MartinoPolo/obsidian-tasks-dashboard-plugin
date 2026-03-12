<script lang="ts">
  import type { IconName } from './icons/index';
  import { attachTooltip } from '../lib/attach-tooltip';
  import Icon from './Icon.svelte';

  interface Props {
    icon: IconName;
    label: string;
    class?: string;
    labelText?: string;
    faded?: boolean;
    onclick: (event: MouseEvent) => void;
    oncontextmenu?: (event: MouseEvent) => void;
  }

  let {
    icon,
    label,
    class: className,
    labelText,
    faded = false,
    onclick,
    oncontextmenu
  }: Props = $props();
</script>

<button
  class={['tdc-btn', className, faded && 'tdc-btn-faded']}
  aria-label={label}
  {onclick}
  {oncontextmenu}
  {@attach attachTooltip(label)}
>
  <Icon name={icon} size={16} />
  {#if labelText}<span class="tdc-btn-label">{labelText}</span>{/if}
</button>

<style>
.tdc-btn {
  width: var(--tdc-btn-square-size);
  height: var(--tdc-btn-square-size);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: var(--tdc-transition-fast);
  border-radius: var(--tdc-border-radius);
  background: var(--background-modifier-hover);
  color: var(--text-normal);
}

.tdc-btn:hover {
  background: var(--interactive-accent);
  color: var(--text-on-accent);
}

.tdc-btn :global(svg) {
  width: var(--tdc-btn-icon-size);
  height: var(--tdc-btn-icon-size);
}

.tdc-btn-faded {
  opacity: 0.4;
}

.tdc-btn-faded:hover {
  opacity: 0.8;
}

.tdc-btn-label {
  font-size: 0.85em;
  margin-left: 4px;
}
</style>
