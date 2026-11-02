<script lang="ts">
  import { untrack } from 'svelte';
  import type { Phase } from '../editor/phase';
  import Icon from '../ui/Icon.svelte';
  import { LABEL_MS, MODES, PHASES } from './modes';

  let { phase }: { phase: Phase } = $props();
  const mode = $derived(MODES[phase]);

  // The name shows for a moment when the mode changes, not at the start (^119).
  let shown = $state(false);
  let first = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    void phase;
    untrack(() => {
      clearTimeout(timer);
      if (first) return void (first = false);
      shown = true;
      timer = setTimeout(() => (shown = false), LABEL_MS);
    });
    return () => clearTimeout(timer);
  });
</script>

<div class="frame" data-testid="mode-frame" data-mode={phase} style:--mode={mode.color}></div>
<div class="modes" aria-hidden="true">
  {#each PHASES as p (p)}
    <span class="mode" class:on={p === phase} style:--mode={MODES[p].color} title={MODES[p].label}>
      <Icon name={MODES[p].icon} />
    </span>
  {/each}
  {#if shown}
    <span class="label" data-testid="mode-label" style:--mode={mode.color}>{mode.label}</span>
  {/if}
</div>

<style>
  .frame {
    position: absolute;
    inset: 0;
    border: 0.5px solid var(--mode);
    pointer-events: none;
  }
  .modes {
    position: absolute;
    top: 0.8em;
    left: 1.1667em;
    display: flex;
    align-items: center;
    gap: 0.5em;
    color: var(--ink);
    pointer-events: none;
    filter: drop-shadow(0 0 2px var(--bg)) drop-shadow(0 0 2px var(--bg));
  }
  /* The current mode: its icon in the mode's color, in a ring of that color. */
  .mode {
    display: grid;
    place-items: center;
    width: 2.2em;
    height: 2.2em;
    border: 1.5px solid transparent;
    border-radius: 0.6em;
  }
  .mode.on {
    color: var(--mode);
    border-color: var(--mode);
  }
  .label {
    margin-left: 0.5em;
    color: var(--mode);
    font-weight: 600;
    font-size: 1.2em;
  }
</style>
