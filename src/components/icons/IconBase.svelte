<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    viewBox?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: string;
    size?: number;
    class?: string;
    children: Snippet;
  }

  let {
    viewBox = '0 0 24 24',
    fill = 'none',
    stroke = 'currentColor',
    strokeWidth = '2',
    size = 16,
    class: className,
    children
  }: Props = $props();
</script>

<svg
  class={['tdc-icon', className]}
  width={size}
  height={size}
  {viewBox}
  {fill}
  {stroke}
  stroke-width={strokeWidth}
  stroke-linecap={stroke !== 'none' ? 'round' : undefined}
  stroke-linejoin={stroke !== 'none' ? 'round' : undefined}
  aria-hidden="true"
>
  {@render children()}
</svg>
