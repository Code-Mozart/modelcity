<script lang="ts">
  import type { FrameStats } from './frameStats.svelte';

  /** The frame times, under the version, while `Ctrl+Period` has them on (^1252). */
  let { stats }: { stats: FrameStats } = $props();
</script>

{#if stats.visible}
  <div class="frames" role="status" aria-label="Frame times">{stats.text || 'move the view'}</div>
{/if}

<style>
  .frames {
    position: absolute;
    top: 2.2em;
    left: 50%;
    transform: translateX(-50%);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
</style>
