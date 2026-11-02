<script lang="ts">
  import KeyCap from '../hints/KeyCap.svelte';
  import Icon from './Icon.svelte';
  import { partsOf } from './toastText';
  import type { Toasts } from './toasts.svelte';

  /**
   * The toasts (^232), one under the other in the top right corner, on a transparent background
   * like the recent history panel: the text with the icon of its kind in front (^210), no box.
   */
  let { toasts }: { toasts: Toasts } = $props();

  /** A wrapped text is as wide as its longest line, so that the toast stays at the right edge, not as wide as its room. */
  function fit(node: HTMLElement) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()];
    // The text is left aligned: its longest line ends at the rightmost box.
    const width = Math.max(...rects.map((r) => r.right)) - node.getBoundingClientRect().left;
    if (rects.length > 1) node.style.width = `${Math.ceil(width) + 1}px`;
  }
</script>

<ul class="toasts" aria-label="Messages">
  {#each toasts.items as toast (toast.key)}
    <li
      class={toast.kind}
      role={toast.kind === 'error' || toast.kind === 'warning' ? 'alert' : 'status'}
    >
      <Icon name={toast.kind} />
      <span use:fit
        >{#each partsOf(toast.text) as part, i (i)}{#if 'key' in part}<KeyCap>{part.key}</KeyCap
            >{:else}{part.text}{/if}{/each}</span
      >
    </li>
  {/each}
</ul>

<style>
  .toasts {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5em;
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--ink);
    max-width: 28em;
    font:
      500 var(--font-size) / 1.3 system-ui,
      sans-serif;
  }
  /* The icon beside the text; a long text wraps left aligned under its first line, not under the icon (^210). */
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.5em;
  }
  li span {
    text-align: left;
    text-wrap: balance;
  }
  li :global(svg) {
    flex: none;
  }
  /* The icon has the color of its kind, the text stays readable (^210). */
  .info :global(svg) {
    color: var(--blue);
  }
  .warning :global(svg) {
    color: var(--orange-ink);
  }
  .success :global(svg) {
    color: var(--green-ink, #1a7f37);
  }
  .error :global(svg) {
    color: var(--red-ink);
  }
</style>
