<script lang="ts">
  import type { Summary } from '../curves/measure';
  import { boxText, lengthText, radiusText } from './measureText';

  /**
   * The measurements panel (^323): bottom left over the map, above the scale bar while that shows.
   * The total length of all segments and statistics of the bend radii.
   */
  let { summary, lifted }: { summary: Summary; lifted: boolean } = $props();

  const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;
  const radius = $derived(radiusText(summary));
</script>

<div class="panel" class:lifted aria-label="Measurements">
  <div>{count(summary.nodes, 'node')} and {count(summary.segments, 'segment')} selected</div>
  <div>Box: {boxText(summary.box)}</div>
  <div>Length: {lengthText(summary.length)}</div>
  {#if radius}<div>{radius}</div>{/if}
</div>

<style>
  .panel {
    position: absolute;
    left: 16px;
    bottom: 12px;
    color: var(--ink);
    pointer-events: none;
    filter: drop-shadow(0 0 2px var(--surface)) drop-shadow(0 0 2px var(--surface));
    font:
      500 var(--font-size) / 1.3 system-ui,
      sans-serif;
  }
  /* The scale bar and its label take the bottom 40 px while they show. */
  .lifted {
    bottom: 48px;
  }
</style>
