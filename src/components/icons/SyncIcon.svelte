<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<!-- Octicon sync (16px) — branch behind base / needs sync -->
<IconBase viewBox="0 0 16 16" fill="currentColor" stroke="none" strokeWidth="0" {size} class={className}>
  <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 .93 8.84a.75.75 0 0 1 .656-.834ZM15.07 7.16a.75.75 0 0 1-.656.834 5.5 5.5 0 0 0-9.592-2.97l1.204 1.204a.25.25 0 0 1-.177.427H2.203a.25.25 0 0 1-.25-.25V2.759a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 15.07 7.16Z"/>
</IconBase>
