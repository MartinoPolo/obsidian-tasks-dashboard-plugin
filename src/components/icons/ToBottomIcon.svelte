<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<IconBase {size} class={className}>
  <path d="M12 5v12"/><path d="M19 12l-7 7-7-7"/><line x1="5" y1="21" x2="19" y2="21"/>
</IconBase>
