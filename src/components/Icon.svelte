<script lang="ts">
  import { ICON_COMPONENTS, type IconName } from './icons/index';

  interface Props {
    name: IconName;
    size?: number;
    class?: string;
  }

  let { name, size = 16, class: className }: Props = $props();

  let IconComponent = $derived(ICON_COMPONENTS[name]);
</script>

<IconComponent {size} class={className} />
