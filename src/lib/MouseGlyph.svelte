<svelte:options namespace="svg" />

<script lang="ts">
  /**
   * The drawing of the simplified mouse (^50), in a 20 x 28 box, for use inside an <svg>: the
   * buttons are the top half and the palm rest the bottom half. A filled part means that the
   * button is pressed, or has to be pressed.
   */
  let {
    lmb = false,
    mmb = false,
    rmb = false,
    stroke = 2,
  }: { lmb?: boolean; mmb?: boolean; rmb?: boolean; stroke?: number } = $props();

  const LEFT = 'M1.5 10 A8.5 8.5 0 0 1 10 1.5 V14 H1.5 Z';
  const RIGHT = 'M10 1.5 A8.5 8.5 0 0 1 18.5 10 V14 H10 Z';
</script>

{#if lmb}<path d={LEFT} fill="currentColor" />{/if}
{#if rmb}<path d={RIGHT} fill="currentColor" />{/if}
<rect
  x="1.5"
  y="1.5"
  width="17"
  height="25"
  rx="8.5"
  fill="none"
  stroke="currentColor"
  stroke-width={stroke}
/>
<path d="M1.5 14 H18.5 M10 1.5 V14" fill="none" stroke="currentColor" stroke-width={stroke} />
<!-- The wheel has an outline in the background color, so it stays distinct on a filled button. -->
<rect
  x="8"
  y="4.5"
  width="4"
  height="6"
  rx="2"
  fill={mmb ? 'currentColor' : 'var(--bg)'}
  stroke={mmb ? 'var(--bg)' : 'currentColor'}
  stroke-width={stroke * 0.7}
/>
