<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<IconBase {size} class={className}>
  <path d="M4 4h10l-1.5 4L14 12H4z"/><path d="M4 4v16"/>
</IconBase>
