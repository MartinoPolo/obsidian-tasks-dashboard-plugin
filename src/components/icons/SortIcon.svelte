<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<IconBase {size} class={className}>
  <path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>
</IconBase>
