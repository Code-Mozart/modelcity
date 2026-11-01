<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  /**
   * A message to the user (^210): always with the icon of its kind in front, so it is not told by
   * color alone. Information: a lower case i in a blue circle; warning: an exclamation mark in an
   * orange triangle; success: a check mark in a green circle; error: an exclamation mark in a red circle.
   */
  let { kind, children }: { kind: 'info' | 'warning' | 'success' | 'error'; children: Snippet } =
    $props();
</script>

<p class="notice {kind}" role={kind === 'error' || kind === 'warning' ? 'alert' : 'status'}>
  <Icon name={kind} />
  <span>{@render children()}</span>
</p>

<style>
  .notice {
    display: flex;
    align-items: flex-start;
    gap: 0.6em;
    margin: 0;
  }
  .notice :global(svg) {
    flex: none;
    margin-top: 0.05em;
  }
  .info {
    color: var(--blue);
  }
  .warning {
    color: var(--orange-ink);
  }
  .success {
    color: var(--green-ink, #1a7f37);
  }
  .error {
    color: var(--red-ink);
  }
</style>
