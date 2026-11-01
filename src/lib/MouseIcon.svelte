<script lang="ts">
  import MouseGlyph from './MouseGlyph.svelte';
  import SymbolSvg from './SymbolSvg.svelte';

  /**
   * A simplified mouse (^41, ^50, ^56): left button, wheel (middle button) and right button. A
   * filled part means that this button is pressed, or has to be pressed, to trigger the action.
   * All mouse symbols share a 30 x 30 box and are centered in it, so they work well together.
   */
  let {
    lmb = false,
    mmb = false,
    rmb = false,
    label,
  }: { lmb?: boolean; mmb?: boolean; rmb?: boolean; label?: string } = $props();
</script>

<SymbolSvg {label}>
  <g transform="translate(4 1.5)">
    <MouseGlyph {lmb} {mmb} {rmb} />
  </g>
</SymbolSvg>
