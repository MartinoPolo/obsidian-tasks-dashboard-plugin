<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<IconBase viewBox="0 0 16 16" fill="currentColor" stroke="none" strokeWidth="0" {size} class={className}>
  <path d="M3.25 1A2.25 2.25 0 0 1 4 5.372v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 3.25 1Zm9.5 5.5a.75.75 0 0 1 .75.75v3.378a2.251 2.251 0 1 1-1.5 0V7.25a.75.75 0 0 1 .75-.75Zm-1.72-4.28a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1-1.06 1.06L12 4.31l-.97.97a.75.75 0 1 1-1.06-1.06l2-2Z"/>
</IconBase>
