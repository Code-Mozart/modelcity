<script lang="ts">
  import type { Snippet } from 'svelte';

  /** The 30 x 30 box all input symbols share, so they work well together (^50). */
  let { label, children }: { label?: string; children: Snippet } = $props();
</script>

<svg
  viewBox="0 0 30 30"
  style="width: var(--symbol-size); height: var(--symbol-size)"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  {@render children()}
</svg>
