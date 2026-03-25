<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<!-- Lucide scissors (24px) — prune closed worktrees -->
<IconBase viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {size} class={className}>
  <circle cx="6" cy="6" r="3"/>
  <path d="M8.12 8.12 12 12"/>
  <path d="M20 4 8.12 15.88"/>
  <circle cx="6" cy="18" r="3"/>
  <path d="M14.8 14.8 20 20"/>
</IconBase>
