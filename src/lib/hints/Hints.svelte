<script lang="ts">
  import type { Hint } from './hints';
  import InputIcon from './InputIcon.svelte';

  /** Control hints in the top left corner over the map, without a background (^41, ^49). */
  let { hints }: { hints: Hint[] } = $props();
</script>

<ul class="hints" aria-label="Controls">
  {#each hints as h (h.text + h.inputs.map((i) => JSON.stringify(i)).join())}
    <li>
      <span class="inputs">
        {#each h.inputs as input, n (n)}
          {#if n > 0}<span class="or">or</span>{/if}
          <InputIcon {input} />
        {/each}
      </span>
      <span>{h.text}</span>
    </li>
  {/each}
</ul>

<style>
  .hints {
    position: absolute;
    left: 1.1667em;
    top: 1em;
    display: flex;
    flex-direction: column;
    gap: 1.1667em;
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--ink);
    pointer-events: none;
    /* Above the backdrop of the projects modal, whose controls it shows (^168). */
    z-index: 2;
    /* No background; a halo keeps the text readable over the map. */
    filter: drop-shadow(0 0 2px var(--bg)) drop-shadow(0 0 2px var(--bg));
  }
  li {
    display: flex;
    gap: 0.6667em;
    align-items: center;
    min-height: var(--symbol-size);
    font:
      500 var(--font-size) / 1.3 system-ui,
      sans-serif;
  }
  .inputs {
    display: flex;
    gap: 0.5em;
    align-items: center;
    justify-content: flex-start;
  }
  .or {
    color: var(--muted);
    font-size: var(--font-size);
  }
</style>
