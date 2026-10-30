<script lang="ts">
  import { Editor } from './lib/editor.svelte';
  import Legend from './lib/Legend.svelte';
  import MapCanvas from './lib/MapCanvas.svelte';
  import Toolbar from './lib/Toolbar.svelte';

  const editor = new Editor();

  function onKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return;
    if (editor.key(e.key)) e.preventDefault();
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<Toolbar {editor} />
<main>
  <MapCanvas {editor} />
  <pre class="readout">{editor.readout}</pre>
</main>
<Legend />

<style>
  main {
    position: relative;
    flex: 1;
    min-height: 0;
  }
  .readout {
    position: absolute;
    left: 10px;
    top: 8px;
    margin: 0;
    padding: 6px 8px;
    max-width: 70%;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: color-mix(in srgb, var(--panel) 88%, transparent);
    color: var(--muted);
    font:
      12px/1.5 ui-monospace,
      SFMono-Regular,
      Menlo,
      Consolas,
      monospace;
    pointer-events: none;
    white-space: pre;
  }
</style>
