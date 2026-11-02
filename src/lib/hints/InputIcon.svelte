<script lang="ts">
  import type { Input } from './hints';
  import KeyCap from './KeyCap.svelte';
  import MouseDragIcon from './MouseDragIcon.svelte';
  import MouseIcon from './MouseIcon.svelte';
  import MouseWheelIcon from './MouseWheelIcon.svelte';

  /** The symbol for one input of a control hint (^49, ^50). */
  let { input }: { input: Input } = $props();
</script>

<span class="combo">
  {#if input.kind === 'mouse' && input.alt}<KeyCap>Alt</KeyCap>{/if}
  {#if input.kind === 'mouse' && input.shift}<KeyCap>Shift</KeyCap>{/if}
  {#if input.kind === 'key'}
    <KeyCap>{input.label}</KeyCap>
  {:else if input.kind === 'keys'}
    {#each input.labels as label, n (n)}
      <KeyCap>{label}</KeyCap>
    {/each}
  {:else if input.kind === 'wheel'}
    <MouseWheelIcon label="mouse wheel" />
  {:else if input.drag}
    <MouseDragIcon
      lmb={input.button === 'lmb'}
      mmb={input.button === 'mmb'}
      rmb={input.button === 'rmb'}
      label="{input.button.toUpperCase()} drag"
    />
  {:else}
    <MouseIcon
      lmb={input.button === 'lmb'}
      mmb={input.button === 'mmb'}
      rmb={input.button === 'rmb'}
      label={input.button.toUpperCase()}
    />
  {/if}
</span>

<style>
  /* Keys pressed together sit close together, with no plus sign between them. */
  .combo {
    display: inline-flex;
    gap: 0.25em;
    align-items: center;
  }
</style>
