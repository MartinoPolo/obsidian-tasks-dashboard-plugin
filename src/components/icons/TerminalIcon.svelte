<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<IconBase {size} class={className}>
  <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
</IconBase>
