<script lang="ts">
  import { VERSION_TEXT } from '../version';

  /** The version and moniker at the top center, on a transparent background like the other overlays (^787). */
  let { visible }: { visible: boolean } = $props();
</script>

{#if visible}<div class="version">{VERSION_TEXT}</div>{/if}

<style>
  .version {
    position: absolute;
    top: 0.8em;
    left: 50%;
    transform: translateX(-50%);
    color: var(--muted);
    font:
      500 var(--font-size) / 1.3 system-ui,
      sans-serif;
    white-space: nowrap;
    pointer-events: none;
    filter: drop-shadow(0 0 2px var(--glow)) drop-shadow(0 0 2px var(--glow));
  }
</style>
