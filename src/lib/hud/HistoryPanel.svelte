<script lang="ts">
  import Hints from '../hints/Hints.svelte';
  import type { Hint } from '../hints/hints';
  import type { PanelGroup } from './panel';

  /**
   * The recent history panel (^107, ^108, ^109): top right over the map, no background. It shows
   * the last steps; steps that are undone are grayed out, with their line on the right, until they
   * are redone. The steps of a batch sit together and their lines join. The undo and redo hints
   * are at the bottom.
   */
  let { groups, hints }: { groups: PanelGroup[]; hints: Hint[] } = $props();
</script>

<div class="panel" aria-label="Recent history">
  {#each groups as group, g (g)}
    <div class="group">
      {#if group.more > 0}
        <div class="more" class:undone={group.rows[0]?.undone}>({group.more} more steps)</div>
      {/if}
      {#each group.rows as row (row.step)}
        <div class:undone={row.undone}>{row.name}</div>
      {/each}
    </div>
  {/each}
  {#if hints.length}<Hints {hints} inline label="Undo and redo" />{/if}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5em;
    color: var(--ink);
    text-align: right;
    pointer-events: none;
    filter: drop-shadow(0 0 2px var(--bg)) drop-shadow(0 0 2px var(--bg));
    font:
      500 var(--font-size) / 1.3 system-ui,
      sans-serif;
  }
  /* Every step has its own line on the right; those of a batch touch and so look like one. */
  .group > div {
    padding-right: 0.6em;
    border-right: 2px solid var(--ink);
  }
  /* Undone steps are grayed out with the muted color, like other secondary text, line included. */
  .group > .undone {
    color: var(--muted);
    border-right-color: var(--muted);
  }
  .more {
    color: var(--muted);
    font-style: italic;
  }
</style>
