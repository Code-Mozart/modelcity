<script lang="ts">
  import MouseGlyph from './MouseGlyph.svelte';

  /**
   * A simplified mouse (^41, ^50): left button, wheel (middle button) and right button. A filled
   * part means that this button is pressed, or has to be pressed, to trigger the action. Uses the
   * current text color, so it fits anywhere text does.
   */
  let {
    lmb = false,
    mmb = false,
    rmb = false,
    label,
  }: { lmb?: boolean; mmb?: boolean; rmb?: boolean; label?: string } = $props();
</script>

<svg
  viewBox="0 0 20 28"
  width="17"
  height="24"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  <MouseGlyph {lmb} {mmb} {rmb} />
</svg>
