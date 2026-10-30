<script lang="ts">
  import { arrowPath } from './arrows';
  import MouseGlyph from './MouseGlyph.svelte';

  /** The mouse wheel being turned (^50): the mouse with its wheel filled, arrows up and down. */
  let { label }: { label?: string } = $props();

  const ARROWS = [
    arrowPath({ x: 12, y: 8 }, { x: 12, y: 1.5 }),
    arrowPath({ x: 12, y: 32 }, { x: 12, y: 38.5 }),
  ];
</script>

<svg
  viewBox="0 0 24 40"
  width="17"
  height="28"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  <g transform="translate(4 9.2) scale(0.8)">
    <MouseGlyph mmb />
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
