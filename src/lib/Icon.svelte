<script lang="ts">
  /** Small stroke icons (24x24 grid, drawn after Lucide's rotate and plus/minus shapes). */
  export type IconName = 'ccw' | 'cw' | 'plus' | 'minus';

  const PATHS: Record<IconName, string[]> = {
    cw: ['M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8', 'M21 3v5h-5'],
    ccw: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
    plus: ['M12 5v14', 'M5 12h14'],
    minus: ['M5 12h14'],
  };

  let { name }: { name: IconName } = $props();
</script>

<svg
  viewBox="0 0 24 24"
  width="16"
  height="16"
  fill="none"
  stroke="currentColor"
  stroke-width="2.4"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#each PATHS[name] as d (d)}
    <path {d} />
  {/each}
</svg>
