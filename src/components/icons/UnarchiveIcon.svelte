<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<IconBase {size} class={className}>
  <path d="M6 9v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9"/><path d="M3 5h18"/><path d="M10 12l2-2 2 2"/><path d="M12 10v6"/>
</IconBase>
