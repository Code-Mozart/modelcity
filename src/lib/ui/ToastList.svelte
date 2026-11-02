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
      <span>{toast.text}</span>
      <Icon name={toast.kind} />
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
    text-align: right;
    max-width: 28em;
    font:
      500 var(--font-size) / 1.3 system-ui,
      sans-serif;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.5em;
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
