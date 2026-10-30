<script lang="ts">
  import { arrowPath } from './arrows';
  import MouseGlyph from './MouseGlyph.svelte';

  /**
   * The mouse wheel being turned (^50, ^56): the mouse with an arrow up above it and one down
   * inside the palm rest. Same 30 x 30 box as the other mouse symbols.
   */
  let { label }: { label?: string } = $props();

  const SCALE = 0.74;
  const TOP = 8.6;
  const ARROWS = [
    arrowPath({ x: 15, y: TOP }, { x: 15, y: 1.2 }),
    arrowPath({ x: 15, y: TOP + 27 * SCALE * 0.55 }, { x: 15, y: TOP + 27 * SCALE * 0.88 }),
  ];
</script>

<svg
  viewBox="0 0 30 30"
  width="30"
  height="30"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  <g transform="translate({15 - 11 * SCALE} {TOP}) scale({SCALE})">
    <MouseGlyph stroke={2.2} />
  </g>
  {#each ARROWS as d (d)}
    <path
      {d}
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {/each}
</svg>
