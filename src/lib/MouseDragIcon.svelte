<script lang="ts">
  import { arrowPath } from './arrows';
  import MouseGlyph from './MouseGlyph.svelte';

  /**
   * A mouse button being dragged (^50, ^56): the mouse with the dragged button filled, smaller,
   * and four arrows in the style of the node headings pointing up, left, down and right. Same
   * 30 x 30 box as the other mouse symbols.
   */
  let {
    lmb = false,
    mmb = false,
    rmb = false,
    label,
  }: { lmb?: boolean; mmb?: boolean; rmb?: boolean; label?: string } = $props();

  const SCALE = 0.6;
  /** The mouse is 13.2 x 16.2 here, centered at (15, 15). */
  const ARROWS = [
    arrowPath({ x: 15, y: 5.4 }, { x: 15, y: 0.9 }),
    arrowPath({ x: 15, y: 24.6 }, { x: 15, y: 29.1 }),
    arrowPath({ x: 7.2, y: 15 }, { x: 0.9, y: 15 }),
    arrowPath({ x: 22.8, y: 15 }, { x: 29.1, y: 15 }),
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
  <g transform="translate({15 - 11 * SCALE} {15 - 13.5 * SCALE}) scale({SCALE})">
    <MouseGlyph {lmb} {mmb} {rmb} stroke={2.1} />
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
