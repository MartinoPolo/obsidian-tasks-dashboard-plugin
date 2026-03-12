<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<IconBase viewBox="0 0 16 16" fill="currentColor" stroke="none" strokeWidth="0" {size} class={className}>
  <path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 3.25 1Zm9.5 14a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Zm0-8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 3a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>
</IconBase>
