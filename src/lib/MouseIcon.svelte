<script lang="ts">
  /**
   * A simplified mouse (^41): left button, wheel (middle button) and right button. A filled part
   * means that this button is pressed, or has to be pressed, to trigger the action. Uses the
   * current text color, so it fits anywhere text does.
   */
  let {
    lmb = false,
    mmb = false,
    rmb = false,
    label,
  }: { lmb?: boolean; mmb?: boolean; rmb?: boolean; label?: string } = $props();

  const BODY = 'M3 10 A9 9 0 0 1 21 10 V22 A9 9 0 0 1 3 22 Z';
  const LEFT = 'M3 10 A9 9 0 0 1 12 1 V12 H3 Z';
  const RIGHT = 'M12 1 A9 9 0 0 1 21 10 V12 H12 Z';
</script>

<svg
  viewBox="0 0 24 32"
  width="18"
  height="24"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  {#if lmb}<path d={LEFT} fill="currentColor" />{/if}
  {#if rmb}<path d={RIGHT} fill="currentColor" />{/if}
  <path d={BODY} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
  <path d="M3 12 H21 M12 1 V12" fill="none" stroke="currentColor" stroke-width="1.8" />
  <!-- The wheel has a halo in the background color, so it stays distinct on a filled button. -->
  <rect x="8.5" y="2" width="7" height="9.5" rx="3.5" fill="var(--bg)" />
  <rect
    x="10"
    y="3.5"
    width="4"
    height="6.5"
    rx="2"
    fill={mmb ? 'currentColor' : 'var(--bg)'}
    stroke="currentColor"
    stroke-width="1.5"
  />
</svg>
