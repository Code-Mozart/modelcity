<script lang="ts">
  import { untrack } from 'svelte';
  import type { Phase } from '../editor/phase';
  import { LABEL_MS, MODES } from './modes';

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
{#if shown}
  <div class="label" data-testid="mode-label" style:--mode={mode.color}>{mode.label}</div>
{/if}

<style>
  .frame {
    position: absolute;
    inset: 0;
    border: 2px solid var(--mode);
    pointer-events: none;
  }
  .label {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--mode);
    font-weight: 600;
    font-size: 1.4em;
    pointer-events: none;
  }
</style>
