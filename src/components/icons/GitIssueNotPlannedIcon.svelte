<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<IconBase viewBox="0 0 16 16" fill="currentColor" stroke="none" strokeWidth="0" {size} class={className}>
  <path d="M4.72 3.22a.75.75 0 0 1 1.06 0L8 5.44l2.22-2.22a.75.75 0 1 1 1.06 1.06L9.06 6.5l2.22 2.22a.75.75 0 1 1-1.06 1.06L8 7.56 5.78 9.78a.75.75 0 0 1-1.06-1.06L6.94 6.5 4.72 4.28a.75.75 0 0 1 0-1.06Z"/><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"/>
</IconBase>
