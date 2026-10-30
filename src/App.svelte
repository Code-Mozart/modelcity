<script lang="ts">
  import { Camera } from './lib/camera.svelte';
  import Compass from './lib/Compass.svelte';
  import { Editor } from './lib/editor.svelte';
  import Hints from './lib/Hints.svelte';
  import { hintsFor } from './lib/hints';
  import MapCanvas from './lib/MapCanvas.svelte';

  const editor = new Editor();
  const camera = new Camera();
  const hints = $derived(hintsFor(editor.drawing, editor.hintTarget));

  function onKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return;
    if (camera.key(e.key) || editor.key(e.key)) e.preventDefault();
  }
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={(e) => camera.keyUp(e.key)} />

<main>
  <MapCanvas {editor} {camera} />
  <Hints {hints} />
  <Compass {camera} />
</main>

<style>
  main {
    position: relative;
    flex: 1;
    min-height: 0;
  }
</style>
