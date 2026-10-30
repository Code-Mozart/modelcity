<script lang="ts">
  import type { Input } from './hints';
  import KeyCap from './KeyCap.svelte';
  import MouseDragIcon from './MouseDragIcon.svelte';
  import MouseIcon from './MouseIcon.svelte';
  import MouseWheelIcon from './MouseWheelIcon.svelte';

  /** The symbol for one input of a control hint (^49, ^50). */
  let { input }: { input: Input } = $props();
</script>

{#if input.kind === 'mouse' && input.shift}
  <KeyCap>Shift</KeyCap><span class="plus">+</span>
{/if}
{#if input.kind === 'key'}
  <KeyCap>{input.label}</KeyCap>
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

<style>
  .plus {
    color: var(--muted);
    font-size: 12px;
  }
</style>
