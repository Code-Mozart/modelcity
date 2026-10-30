<script lang="ts">
  import type { PresetName } from './curves/presets';
  import type { Editor, Tool } from './editor.svelte';
  import KeyCap from './KeyCap.svelte';

  let { editor }: { editor: Editor } = $props();

  const tools: { id: Tool; label: string; title: string; key: string }[] = [
    { id: 'move', label: 'Move', title: 'Move / edit', key: 'M' },
    { id: 'append', label: 'Append', title: 'Append at an end', key: 'A' },
    { id: 'insert', label: 'Insert', title: 'Insert on a curve', key: 'I' },
  ];
  const presets: { id: PresetName; label: string }[] = [
    { id: 'H', label: 'Reset to Fig H' },
    { id: 'G', label: 'Fig G (S-curve)' },
    { id: 'hook', label: 'Hook' },
  ];
</script>

<header>
  <h1>modelcity</h1>
  <div class="group" role="group" aria-label="Tool">
    {#each tools as t (t.id)}
      <button
        title={t.title}
        aria-pressed={editor.tool === t.id}
        onclick={() => editor.setTool(t.id)}
      >
        {t.label}
        <KeyCap>{t.key}</KeyCap>
      </button>
    {/each}
    <button
      title="Delete the selected node (Del) or right-click a node"
      onclick={() => editor.deleteSelected()}
    >
      Delete node <KeyCap>Del</KeyCap>
    </button>
  </div>
  <div class="group">
    <label><input type="checkbox" bind:checked={editor.showCircles} />circles</label>
    <label><input type="checkbox" bind:checked={editor.showLines} />tangent lines</label>
    <label>
      <input type="checkbox" bind:checked={editor.equidistant} />blue point stays equidistant from
      both nodes
    </label>
  </div>
  <div class="group">
    {#each presets as p (p.id)}
      <button onclick={() => editor.loadPreset(p.id)}>{p.label}</button>
    {/each}
  </div>
</header>

<style>
  header {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    align-items: center;
    padding: 8px 12px;
    background: var(--panel);
    border-bottom: 1px solid var(--line);
  }
  h1 {
    margin: 0 6px 0 0;
    font-size: 15px;
    font-weight: 650;
  }
  .group {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  button {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding: 5px 10px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: var(--btn);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  button:hover {
    border-color: var(--line);
  }
  button[aria-pressed='true'] {
    background: var(--btn-on);
    color: var(--btn-on-text);
  }
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--blue);
    outline-offset: 2px;
  }
  label {
    display: flex;
    gap: 5px;
    align-items: center;
    color: var(--muted);
    white-space: nowrap;
    cursor: pointer;
  }
</style>
