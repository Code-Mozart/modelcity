<script lang="ts">
  import { arrowPath } from './arrows';
  import MouseGlyph from './MouseGlyph.svelte';

  /**
   * A mouse button being dragged (^50): the mouse with the dragged button filled, a bit smaller,
   * and four arrows in the style of the node headings pointing up, left, down and right.
   */
  let {
    lmb = false,
    mmb = false,
    rmb = false,
    label,
  }: { lmb?: boolean; mmb?: boolean; rmb?: boolean; label?: string } = $props();

  const ARROWS = [
    arrowPath({ x: 20, y: 9.5 }, { x: 20, y: 2 }),
    arrowPath({ x: 20, y: 30.5 }, { x: 20, y: 38 }),
    arrowPath({ x: 11, y: 20 }, { x: 2, y: 20 }),
    arrowPath({ x: 29, y: 20 }, { x: 38, y: 20 }),
  ];
</script>

<svg
  viewBox="0 0 40 40"
  width="38"
  height="38"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  <g transform="translate(14 11.6) scale(0.6)">
    <MouseGlyph {lmb} {mmb} {rmb} stroke={3} />
  </g>
  {#each ARROWS as d (d)}
    <path
      {d}
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {/each}
</svg>
