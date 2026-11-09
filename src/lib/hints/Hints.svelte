<script lang="ts">
  import type { Hint } from './hints';
  import InputIcon from './InputIcon.svelte';
  import KeyCap from './KeyCap.svelte';

  /** Control hints in the top left corner over the map, without a background (^41, ^49). */
  let {
    hints,
    inline = false,
    label = 'Controls',
  }: { hints: Hint[]; inline?: boolean; label?: string } = $props();
</script>

<ul class="hints" class:inline aria-label={label}>
  {#each hints as h (h.text + h.inputs.map((i) => JSON.stringify(i)).join())}
    <li>
      <span class="inputs">
        {#each h.inputs as input, n (n)}
          {#if n > 0}<span class="or">or</span>{/if}
          <InputIcon {input} />
        {/each}
      </span>
      <span>{h.text}</span>
      {#if h.note}
        <span class="note"
          >(<span class="cap"><KeyCap>{h.note.key}</KeyCap></span>{h.note.text})</span
        >
      {/if}
    </li>
  {/each}
</ul>

<style>
  .hints {
    position: absolute;
    left: 1.1667em;
    top: 4em; /* below the modes (^119) */
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
    filter: drop-shadow(0 0 2px var(--glow)) drop-shadow(0 0 2px var(--glow));
  }
  /* In the recent history panel (^109): in the flow, right-aligned. */
  .hints.inline {
    position: static;
    gap: 0.5em;
    margin-top: 0.8em;
    filter: none;
    align-items: flex-end;
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
  .note {
    display: inline-flex;
    align-items: center;
    color: var(--muted);
  }
  /* The key cap sits close to the bracket and has a normal space after it. */
  .cap {
    display: inline-flex;
    margin: 0 0.35em 0 0.15em;
  }
  .or {
    color: var(--muted);
    font-size: var(--font-size);
  }
</style>
