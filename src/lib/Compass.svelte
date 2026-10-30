<script lang="ts">
  import type { Camera } from './camera.svelte';
  import { CARDINALS, DRAG_HINTS, chipOffset } from './compass';
  import Icon from './Icon.svelte';
  import KeyCap from './KeyCap.svelte';

  let { camera }: { camera: Camera } = $props();
</script>

{#if camera.rotating}
  <div
    class="compass"
    style:left="{camera.cursor.x}px"
    style:top="{camera.cursor.y}px"
    aria-hidden="true"
  >
    <div class="ring"></div>
    <div class="needle" style:transform="rotate({camera.view.rot}rad)">
      <i class="north"></i>
      <i class="south"></i>
    </div>
    {#each CARDINALS as c (c.key)}
      {@const o = chipOffset(c, camera.view.rot)}
      <span class="at" style:left="{o.x}px" style:top="{o.y}px">
        <KeyCap pressed={camera.pressed === c.key}>{c.label}</KeyCap>
      </span>
    {/each}
    {#each DRAG_HINTS as h (h.id)}
      <span class="at hint" style:left="{h.dx}px" style:top="{h.dy}px" title={h.label}>
        <Icon name={h.icon} />
      </span>
    {/each}
  </div>
{/if}

<style>
  .compass {
    position: absolute;
    width: 0;
    height: 0;
    pointer-events: none;
  }
  .at {
    position: absolute;
    display: flex;
    transform: translate(-50%, -50%);
  }
  /* Monochrome like the compass outline, no background; a halo keeps it readable over the map. */
  .hint {
    color: var(--ink);
    filter: drop-shadow(0 0 1.5px var(--bg)) drop-shadow(0 0 1.5px var(--bg));
  }
  .ring {
    position: absolute;
    left: -1.3333em;
    top: -1.3333em;
    width: 2.6667em;
    height: 2.6667em;
    border: 2px solid var(--ink);
    border-radius: 50%;
    background: color-mix(in srgb, var(--panel) 80%, transparent);
  }
  .needle {
    position: absolute;
    left: -0.5em;
    top: -1.1667em;
    width: 1em;
    height: 2.3333em;
  }
  .needle i {
    position: absolute;
    left: 0;
    width: 0;
    height: 0;
    border-left: 0.5em solid transparent;
    border-right: 0.5em solid transparent;
  }
  .north {
    top: 0;
    border-bottom: 1.1667em solid var(--red);
  }
  .south {
    bottom: 0;
    border-top: 1.1667em solid var(--muted);
  }
</style>
