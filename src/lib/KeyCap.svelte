<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * The one look for hotkey hints and key-like icons (^32): a raised cap with a thick bottom edge
   * that sinks in and turns blue while the key is pressed.
   */
  let { pressed = false, children }: { pressed?: boolean; children: Snippet } = $props();
</script>

<kbd class:pressed>{@render children()}</kbd>

<style>
  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 2em;
    height: 2em;
    padding: 0 0.5em;
    border: 1px solid var(--key-edge);
    border-bottom-width: 0.3333em;
    border-radius: 0.5em;
    background: var(--key-bg);
    color: var(--key-ink);
    font:
      600 var(--font-size) / 1 system-ui,
      sans-serif;
    vertical-align: middle;
    user-select: none;
  }
  kbd.pressed {
    border-color: var(--key-on-edge);
    border-bottom-width: 1px;
    background: var(--key-on-bg);
    color: var(--key-on-ink);
    transform: translateY(0.25em);
  }
</style>
