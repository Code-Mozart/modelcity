<svelte:options namespace="svg" />

<script lang="ts">
  /**
   * The drawing of the simplified mouse (^50, ^56), for use inside an <svg>, in a box of
   * 22 x 27 units: a rounded body, the buttons in the top half and the palm rest in the bottom
   * half, and a long wheel that dips into the palm. A filled part means that the button is
   * pressed, or has to be pressed. `stroke` is the outline width in these units.
   */
  let {
    lmb = false,
    mmb = false,
    rmb = false,
    stroke = 1.7,
  }: { lmb?: boolean; mmb?: boolean; rmb?: boolean; stroke?: number } = $props();

  const W = 22;
  const H = 27;
  /** Body corner radius (rounder than the first drafts of the user's design). */
  const R = 9.5;
  const CX = W / 2;
  /** Where the buttons end and the palm rest begins: half the height. */
  const SPLIT = H / 2;
  const WHEEL = { w: 4.4, top: 3.2, bottom: 17.2 };

  const LEFT = `M0 ${SPLIT} V${R} A${R} ${R} 0 0 1 ${R} 0 H${CX} V${SPLIT} Z`;
  const RIGHT = `M${CX} 0 H${W - R} A${R} ${R} 0 0 1 ${W} ${R} V${SPLIT} H${CX} Z`;
  const half = $derived(stroke / 2);
</script>

{#if lmb}<path d={LEFT} fill="currentColor" />{/if}
{#if rmb}<path d={RIGHT} fill="currentColor" />{/if}
<rect
  x={half}
  y={half}
  width={W - stroke}
  height={H - stroke}
  rx={R - half}
  fill="none"
  stroke="currentColor"
  stroke-width={stroke}
/>
<path d="M{half} {SPLIT} H{W - half}" fill="none" stroke="currentColor" stroke-width={stroke} />
<!-- The wheel is filled with the background color, so the split does not show through it. -->
<rect
  x={CX - (WHEEL.w - stroke) / 2}
  y={WHEEL.top + half}
  width={WHEEL.w - stroke}
  height={WHEEL.bottom - WHEEL.top - stroke}
  rx={(WHEEL.w - stroke) / 2}
  fill={mmb ? 'currentColor' : 'var(--bg)'}
  stroke="currentColor"
  stroke-width={stroke}
/>
