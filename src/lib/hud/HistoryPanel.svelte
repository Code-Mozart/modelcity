<script lang="ts">
  import Hints from '../hints/Hints.svelte';
  import type { Hint } from '../hints/hints';
  import type { PanelGroup } from './panel';

  /**
   * The recent history panel (^107, ^108, ^109): top right over the map, no background. It shows
   * the last steps; steps that are undone are grayed out until they are redone. A batch of several
   * steps has a bold title over its steps and one line on the right. The undo and redo hints sit at
   * the bottom.
   */
  let { groups, hints }: { groups: PanelGroup[]; hints: Hint[] } = $props();
</script>

<div class="panel" aria-label="Recent history">
  {#each groups as group, g (g)}
    <div class="item">
      {#if group.title}
        <div class="title" class:undone={group.rows.every((r) => r.undone)}>{group.title}</div>
      {/if}
      {#if group.more > 0}<div class="more">({group.more} more steps)</div>{/if}
      {#each group.rows as row (row.step)}
        <div class:undone={row.undone}>{row.step.name}</div>
      {/each}
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
  /* Undone steps are grayed out with the muted color, like other secondary text. */
  .undone {
    color: var(--muted);
  }
  .more {
    color: var(--muted);
    font-style: italic;
  }
</style>
