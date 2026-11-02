<script lang="ts">
  import Icon from './Icon.svelte';
  import type { Toasts } from './toasts.svelte';

  /**
   * The toasts (^232), one under the other in the top right corner, on a transparent background
   * like the recent history panel: the text with the icon of its kind in front (^210), no box.
   */
  let { toasts }: { toasts: Toasts } = $props();
</script>

<ul class="toasts" aria-label="Messages">
  {#each toasts.items as toast (toast.key)}
    <li
      class={toast.kind}
      role={toast.kind === 'error' || toast.kind === 'warning' ? 'alert' : 'status'}
    >
      <Icon name={toast.kind} />{toast.text}
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
  /* The icon is the first character of the text, so a long message wraps under it at the right edge (^210). */
  li {
    text-align: right;
    text-wrap: balance;
  }
  li :global(svg) {
    display: inline-block;
    vertical-align: -0.3em;
    margin-right: 0.5em;
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
