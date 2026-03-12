<script lang="ts">
  import type { Priority } from '../../types';
  import PrioritySelector from './PrioritySelector.svelte';

  interface Props {
    onselect: (priority: Priority) => void;
    oncancel: () => void;
  }

  let { onselect, oncancel }: Props = $props();
</script>

<PrioritySelector
  title="Select priority"
  {onselect}
  {oncancel}
/>
