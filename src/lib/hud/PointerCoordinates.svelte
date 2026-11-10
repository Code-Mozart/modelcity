<script lang="ts">
  import type { Vec } from '../curves/vec';
  import { coordinatesText } from './debugTools.svelte';

  /** The mouse coordinates under the version at the top center, in the same style (^833), and what the pointer is on (^871). */
  let {
    pt,
    over,
    sign = null,
    misses = [],
  }: {
    pt: Vec | null | undefined;
    over: string;
    /** The sign of the hovered segment (^1017). */
    sign?: string | null;
    misses?: string[];
  } = $props();
</script>

<div class="coordinates">
  {coordinatesText(pt)}<br />{over}{#if sign}<br />{sign}{/if}{#each misses as line (line)}<br
    />near miss, {line}{/each}
</div>

<style>
  .coordinates {
    position: absolute;
    top: 2.4em;
    left: 50%;
    transform: translateX(-50%);
    color: var(--muted);
    font:
      500 var(--font-size) / 1.3 system-ui,
      sans-serif;
    white-space: nowrap;
    pointer-events: none;
    filter: drop-shadow(0 0 2px var(--glow)) drop-shadow(0 0 2px var(--glow));
  }
</style>
