<script lang="ts">
  import type { Vec } from '../curves/vec';
  import { coordinatesText } from './debugTools.svelte';

  /** The mouse coordinates under the version at the top center, in the same style (^833). */
  let { pt }: { pt: Vec | null | undefined } = $props();
</script>

<div class="coordinates">{coordinatesText(pt)}</div>

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
    filter: drop-shadow(0 0 2px var(--bg)) drop-shadow(0 0 2px var(--bg));
  }
</style>
