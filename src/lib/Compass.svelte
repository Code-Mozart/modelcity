<script lang="ts">
  import type { Camera } from './camera.svelte';
  import { CARDINALS } from './compass';

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
      <span class="chip" style:left="{c.dx}px" style:top="{c.dy}px">{c.label}</span>
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
  .ring {
    position: absolute;
    left: -16px;
    top: -16px;
    width: 32px;
    height: 32px;
    border: 2px solid var(--ink);
    border-radius: 50%;
    background: color-mix(in srgb, var(--panel) 80%, transparent);
  }
  .needle {
    position: absolute;
    left: -6px;
    top: -14px;
    width: 12px;
    height: 28px;
  }
  .needle i {
    position: absolute;
    left: 0;
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
  }
  .north {
    top: 0;
    border-bottom: 14px solid var(--red);
  }
  .south {
    bottom: 0;
    border-top: 14px solid var(--muted);
  }
  .chip {
    position: absolute;
    width: 24px;
    height: 24px;
    margin: -12px 0 0 -12px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--panel);
    color: var(--ink);
    font:
      600 12px/22px system-ui,
      sans-serif;
    text-align: center;
  }
</style>
