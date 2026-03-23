<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<IconBase {size} class={className}>
  <path d="M12 21v-7"/><path d="m8 14 4-8 4 8z"/><path d="m6 14-2.5 4h17L18 14"/>
</IconBase>
