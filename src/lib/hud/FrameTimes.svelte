<script lang="ts">
  import type { FrameStats } from './frameStats.svelte';

  /**
   * The frame times under the version, while `Ctrl+Period` has them on (^1252), with the world
   * coordinates of the pointer and what it is on (^833, ^871).
   */
  let { stats, lines = [] }: { stats: FrameStats; lines?: string[] } = $props();
</script>

{#if stats.visible}
  <div class="frames" role="status" aria-label="Frame times">
    <div>{stats.text || 'move the view'}</div>
    {#each lines as line, i (i)}<div>{line}</div>{/each}
  </div>
{/if}

<style>
  .frames {
    position: absolute;
    top: 2.2em;
    left: 50%;
    transform: translateX(-50%);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    text-align: center;
    pointer-events: none;
  }
</style>
