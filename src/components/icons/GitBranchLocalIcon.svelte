<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<!-- Octicon upload (16px) — local only / not pushed -->
<IconBase viewBox="0 0 16 16" fill="currentColor" stroke="none" strokeWidth="0" {size} class={className}>
  <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14ZM11.28 4.72a.749.749 0 0 1-1.06 0L8.75 3.25V9.5a.75.75 0 0 1-1.5 0V3.25L5.78 4.72a.749.749 0 1 1-1.06-1.06l2.75-2.75a.749.749 0 0 1 1.06 0l2.75 2.75a.749.749 0 0 1 0 1.06Z"/>
</IconBase>
