<script lang="ts">
  import { batchTitle } from '../editor/stepNames';
  import Hints from '../hints/Hints.svelte';
  import type { Hint } from '../hints/hints';
  import type { Recent } from './recent.svelte';

  /**
   * The recent history panel (^107, ^108, ^109): top right over the map, no background. Each item
   * has a line on its right; a batch has a bold title with its steps below, and shows only the last
   * 4 when there are more than 5. The undo and redo hints sit at its bottom.
   */
  let { recent, hints }: { recent: Recent; hints: Hint[] } = $props();

  const SHOWN = 4;
  const MANY = 5;
</script>

<div class="panel" aria-label="Recent history">
  {#each recent.items as item (item.key)}
    <div class="item">
      {#if item.steps.length > 1}
        <div class="title">{item.prefix}{batchTitle(item.steps)}</div>
        {#if item.steps.length > MANY}
          <div class="more">({item.steps.length - SHOWN} more steps)</div>
        {/if}
        {#each item.steps.length > MANY ? item.steps.slice(-SHOWN) : item.steps as step (step.after)}
          <div>{step.name}</div>
        {/each}
      {:else}
        <div>{item.prefix}{item.steps[0]!.name}</div>
      {/if}
    </div>
  {/each}
  {#if hints.length}<Hints {hints} inline label="Undo and redo" />{/if}
</div>

<style>
  .panel {
    position: absolute;
    right: 1.1667em;
    top: 1em;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5em;
    color: var(--ink);
    text-align: right;
    pointer-events: none;
    z-index: 2;
    filter: drop-shadow(0 0 2px var(--bg)) drop-shadow(0 0 2px var(--bg));
    font:
      500 var(--font-size) / 1.3 system-ui,
      sans-serif;
  }
  /* The line on the right belongs to the whole item: a batch shares one. */
  .item {
    padding-right: 0.6em;
    border-right: 2px solid var(--ink);
  }
  .title {
    font-weight: 700;
  }
  .more {
    color: var(--muted);
    font-style: italic;
  }
</style>
