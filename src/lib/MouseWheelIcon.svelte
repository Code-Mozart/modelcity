<script lang="ts">
  import { SYMBOL_STROKE, chevronPath } from './arrows';
  import MouseGlyph from './MouseGlyph.svelte';

  /**
   * The mouse wheel being turned (^50, ^59): the mouse with an arrowhead (no shaft) above and one
   * below it. Same 30 x 30 box and line width as the other mouse symbols.
   */
  let { label }: { label?: string } = $props();

  const SCALE = 0.64;
  /** The mouse is 14.1 x 17.3 here, centered at (15, 15). */
  const CHEVRONS = [
    chevronPath({ x: 15, y: 1.6 }, -Math.PI / 2),
    chevronPath({ x: 15, y: 28.4 }, Math.PI / 2),
  ];
</script>

<svg
  viewBox="0 0 30 30"
  width="34"
  height="34"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  <g transform="translate({15 - 11 * SCALE} {15 - 13.5 * SCALE}) scale({SCALE})">
    <MouseGlyph stroke={SYMBOL_STROKE / SCALE} />
  </g>
  {#each CHEVRONS as d (d)}
    <path
      {d}
      fill="none"
      stroke="currentColor"
      stroke-width={SYMBOL_STROKE}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {/each}
</svg>
