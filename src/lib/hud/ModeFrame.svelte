<script lang="ts">
  import type { Phase } from '../editor/phase';
  import Icon from '../ui/Icon.svelte';
  import { MODES, shownIn } from './modes';

  let { phase }: { phase: Phase } = $props();
  const mode = $derived(MODES[phase]);
</script>

<div class="frame" data-testid="mode-frame" data-mode={phase} style:--mode={mode.outline}></div>
<div class="modes" aria-hidden="true">
  {#each shownIn(phase) as p (p)}
    <span class="mode" class:on={p === phase} style:--mode={MODES[p].color}>
      <Icon name={MODES[p].icon} />
    </span>
  {/each}
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
    filter: drop-shadow(0 0 2px var(--glow)) drop-shadow(0 0 2px var(--glow));
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
</style>
