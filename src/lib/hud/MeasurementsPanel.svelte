<script lang="ts">
  import type { Summary } from '../curves/measure';

  /**
   * The measurements panel (^323): bottom left over the map, above the scale bar while that shows.
   * The total length of all segments and statistics of the bend radii.
   */
  let { summary, lifted }: { summary: Summary; lifted: boolean } = $props();

  const meters = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(1)} m`);
</script>

<div class="panel" class:lifted aria-label="Measurements">
  <div>Roads: {meters(summary.length)}</div>
  {#if summary.radius}
    <div>
      Radius: min {meters(summary.radius.min)}, max {meters(summary.radius.max)}, average {meters(
        summary.radius.avg,
      )}, median {meters(summary.radius.median)}
    </div>
  {/if}
</div>

<style>
  .panel {
    position: absolute;
    left: 16px;
    bottom: 12px;
    color: var(--ink);
    pointer-events: none;
    filter: drop-shadow(0 0 2px var(--bg)) drop-shadow(0 0 2px var(--bg));
    font:
      500 var(--font-size) / 1.3 system-ui,
      sans-serif;
  }
  /* The scale bar and its label take the bottom 40 px while they show. */
  .lifted {
    bottom: 48px;
  }
</style>
