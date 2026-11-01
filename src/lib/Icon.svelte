<script lang="ts">
  /** Small stroke icons (24x24 grid, drawn after Lucide's rotate and zoom shapes). */
  export type IconName =
    | 'ccw'
    | 'cw'
    | 'zoomIn'
    | 'zoomOut'
    | 'pen'
    | 'check'
    | 'x'
    | 'trash'
    | 'info'
    | 'warning'
    | 'success'
    | 'error';

  /** Magnifying glass: the lens circle and the handle. */
  const LENS = 'M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M21 21l-4.35-4.35';

  /** A circle, the frame of the information, success and error icons. */
  const CIRCLE = 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0';

  const PATHS: Record<IconName, string[]> = {
    cw: ['M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8', 'M21 3v5h-5'],
    ccw: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
    zoomIn: [LENS, 'M11 8v6', 'M8 11h6'],
    zoomOut: [LENS, 'M8 11h6'],
    pen: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z', 'm15 5 4 4'],
    check: ['M20 6 9 17l-5-5'],
    x: ['M18 6 6 18', 'm6 6 12 12'],
    info: [CIRCLE, 'M12 16v-4', 'M12 8h.01'],
    warning: [
      'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
      'M12 9v4',
      'M12 17h.01',
    ],
    success: [CIRCLE, 'm9 12 2 2 4-4'],
    error: [CIRCLE, 'M12 8v4', 'M12 16h.01'],
    trash: [
      'M3 6h18',
      'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6',
      'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2',
      'M10 11v6',
      'M14 11v6',
    ],
  };

  let { name }: { name: IconName } = $props();
</script>

<svg
  viewBox="0 0 24 24"
  style="width: 1.3333em; height: 1.3333em"
  fill="none"
  stroke="currentColor"
  stroke-width="2.4"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#each PATHS[name] as d (d)}
    <path {d} />
  {/each}
</svg>
