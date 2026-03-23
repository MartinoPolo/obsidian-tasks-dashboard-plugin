<script lang="ts">
  import { attachTooltip } from '../../lib/attach-tooltip';
  import Icon from '../Icon.svelte';

  interface Props {
    onrefresh: () => void;
    onunlink?: () => void;
  }

  let { onrefresh, onunlink }: Props = $props();

  function handleRefreshClick(event: MouseEvent): void {
    event.stopPropagation();
    onrefresh();
  }

  function handleUnlinkClick(event: MouseEvent): void {
    event.stopPropagation();
    onunlink?.();
  }
</script>

<button class="tdc-gh-refresh" onclick={handleRefreshClick} {@attach attachTooltip('Refresh GitHub data')}>
  <Icon name="refreshCard" size={16} />
</button>
{#if onunlink !== undefined}
  <button class="tdc-gh-unlink" onclick={handleUnlinkClick} {@attach attachTooltip('Remove GitHub link')}>
    <Icon name="unlink" size={16} />
  </button>
{/if}
