<script lang="ts">
  import type { ProjectSession } from './project/session.svelte';

  /** The projects of the browser, opened with Ctrl+O (^168, ^171): open, delete, new, import a file. */
  let { session }: { session: ProjectSession } = $props();
  let file = $state<HTMLInputElement>();

  async function pick() {
    const f = file?.files?.[0];
    if (f) await session.importText(await f.text());
    if (file) file.value = '';
  }

  const when = (iso: string) => new Date(iso).toLocaleString();
</script>

{#if session.dialogOpen}
  <div class="backdrop" role="presentation" onpointerdown={() => session.closeDialog()}>
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Projects"
      tabindex="-1"
      onpointerdown={(e) => e.stopPropagation()}
    >
      <h2>Projects</h2>
      <ul>
        {#each session.projects as p (p.id)}
          <li class:current={p.id === session.id}>
            <button class="open" onclick={() => session.open(p.id)}>
              <span class="title">{p.file.title}</span>
              <span class="date">{when(p.file.lastUpdatedAt)}</span>
            </button>
            <button
              class="remove"
              aria-label="Delete {p.file.title}"
              onclick={() => session.remove(p.id)}>Delete</button
            >
          </li>
        {/each}
      </ul>
      {#if session.error}<p class="error" role="alert">{session.error}</p>{/if}
      <div class="actions">
        <button onclick={() => session.create().then(() => session.closeDialog())}>
          New project
        </button>
        <button onclick={() => file?.click()}>Import file…</button>
        <button onclick={() => session.closeDialog()}>Close</button>
      </div>
      <input
        bind:this={file}
        type="file"
        accept=".json,application/json"
        aria-label="Project file"
        hidden
        onchange={pick}
      />
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--bg) 60%, transparent);
  }
  .dialog {
    width: min(32em, calc(100% - 2em));
    max-height: calc(100% - 2em);
    overflow: auto;
    padding: 1.2em;
    color: var(--ink);
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 0.6em;
    box-shadow: 0 0.5em 2em color-mix(in srgb, var(--ink) 25%, transparent);
    font:
      500 var(--font-size) / 1.4 system-ui,
      sans-serif;
  }
  h2 {
    margin: 0 0 0.8em;
    font-size: 1.3em;
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    margin: 0 0 1em;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    gap: 0.4em;
  }
  li.current .open {
    outline: 2px solid var(--blue);
  }
  button {
    padding: 0.5em 0.9em;
    color: var(--ink);
    background: var(--btn);
    border: 1px solid var(--line);
    border-radius: 0.4em;
    font: inherit;
    cursor: pointer;
  }
  .open {
    flex: 1;
    display: flex;
    justify-content: space-between;
    gap: 1em;
    text-align: left;
  }
  .date {
    color: var(--muted);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
  }
  .error {
    margin: 0 0 1em;
    color: var(--red-ink);
  }
</style>
