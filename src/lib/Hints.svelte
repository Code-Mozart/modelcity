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
    left: 14px;
    top: 12px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--ink);
    pointer-events: none;
    /* No background; a halo keeps the text readable over the map. */
    filter: drop-shadow(0 0 2px var(--bg)) drop-shadow(0 0 2px var(--bg));
  }
  li {
    display: flex;
    gap: 8px;
    align-items: center;
    min-height: 34px;
    font:
      500 var(--font-size) / 1.3 system-ui,
      sans-serif;
  }
  .inputs {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: flex-start;
  }
  .or {
    color: var(--muted);
    font-size: var(--font-size);
  }
</style>
