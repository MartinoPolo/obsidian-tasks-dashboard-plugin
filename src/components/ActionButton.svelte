<script lang="ts">
  import type { IconName } from './icons/index';
  import { attachTooltip } from '../lib/attach-tooltip';
  import Icon from './Icon.svelte';

  type ButtonVariant = 'default' | 'accent' | 'delete' | 'vscode';

  interface Props {
    icon: IconName;
    label: string;
    class?: string;
    labelText?: string;
    faded?: boolean;
    variant?: ButtonVariant;
    onclick: (event: MouseEvent) => void;
    oncontextmenu?: (event: MouseEvent) => void;
  }

  let {
    icon,
    label,
    class: className,
    labelText,
    faded = false,
    variant = 'default',
    onclick,
    oncontextmenu
  }: Props = $props();
</script>

<button
  class={['tdc-btn', className, faded && 'tdc-btn-faded', variant !== 'default' && `tdc-btn-variant-${variant}`]}
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
  background: color-mix(in srgb, var(--text-normal) 15%, transparent);
  color: var(--text-normal);
}

.tdc-btn :global(svg) {
  width: var(--tdc-btn-icon-size);
  height: var(--tdc-btn-icon-size);
}

.tdc-btn-label {
  font-size: 0.85em;
  margin-left: 4px;
}

/* accent: folder, terminal, github-quickopen, archive */
.tdc-btn-variant-accent {
  background: color-mix(in srgb, var(--interactive-accent) 15%, transparent);
  color: var(--interactive-accent);
}

.tdc-btn-variant-accent:hover {
  background: color-mix(in srgb, var(--text-normal) 15%, transparent);
  color: var(--text-normal);
}

/* delete: red-tinted */
.tdc-btn-variant-delete {
  background: color-mix(in srgb, var(--tdc-priority-high) 15%, transparent);
  color: var(--tdc-priority-high);
}

.tdc-btn-variant-delete:hover {
  background: color-mix(in srgb, var(--tdc-priority-high) 25%, transparent);
}

/* vscode: blue-tinted */
.tdc-btn-variant-vscode {
  background: color-mix(in srgb, var(--tdc-vscode-accent) 15%, transparent);
  color: var(--tdc-vscode-accent);
}

.tdc-btn-variant-vscode:hover {
  background: color-mix(in srgb, var(--text-normal) 15%, transparent);
  color: var(--text-normal);
}

/* faded: reduced opacity for unset/unavailable actions */
.tdc-btn-faded {
  opacity: 0.4;
}

.tdc-btn-faded:hover {
  opacity: 0.8;
}
</style>
