<script lang="ts">
  import IconBase from './IconBase.svelte';

  interface Props {
    size?: number;
    class?: string;
  }

  let { size, class: className }: Props = $props();
</script>

<!-- Octicon unlink (16px) — remote branch deleted -->
<IconBase viewBox="0 0 16 16" fill="currentColor" stroke="none" strokeWidth="0" {size} class={className}>
  <path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-1.25 1.25a.75.75 0 0 0 1.06 1.06l1.25-1.25a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25Zm-1.55 8.45a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83-2.83l1.25-1.25a.75.75 0 0 0-1.06-1.06L.005 7.999a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25Zm5.694-1.644a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM2.08 5.919a.75.75 0 0 0 0-1.5H.58a.75.75 0 0 0 0 1.5h1.5Zm8.997 6.081a.75.75 0 0 0 1.5 0v-1.5a.75.75 0 0 0-1.5 0v1.5ZM5.919 2.08a.75.75 0 0 0-1.5 0V.58a.75.75 0 0 0 1.5 0v1.5Z"/>
</IconBase>
