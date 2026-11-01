<script lang="ts">
  import { tick } from 'svelte';
  import Icon from './Icon.svelte';
  import type { ProjectSession } from './project/session.svelte';

  /** The projects of the browser, opened with Ctrl+O (^168, ^171): search, open, rename, delete, new, import a file. */
  let { session }: { session: ProjectSession } = $props();
  let file = $state<HTMLInputElement>();
  let search = $state<HTMLInputElement>();
  let draft = $state('');

  // Typing right after Ctrl+O searches (^178).
  $effect(() => {
    if (session.dialogOpen) void tick().then(() => search?.focus());
  });

  async function pick() {
    const f = file?.files?.[0];
    if (f) await session.importText(await f.text());
    if (file) file.value = '';
  }

  function rename(id: string, title: string) {
    draft = title;
    session.startRename(id);
  }

  function renameKey(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter') void session.rename(id, draft);
    else if (e.key === 'Escape') session.cancelRow();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  /** Select the whole name when the text field appears. */
  function focusAll(input: HTMLInputElement) {
    input.focus();
    input.select();
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
      <header>
        <h2>Projects</h2>
        <button class="icon" aria-label="Close" onclick={() => session.closeDialog()}>
          <Icon name="x" />
        </button>
      </header>
      <input
        class="search"
        type="search"
        placeholder="Search…"
        aria-label="Search projects"
        bind:this={search}
        bind:value={session.query}
      />
      <ul>
        {#each session.shown as p (p.id)}
          {@const mode = session.row?.id === p.id ? session.row.mode : null}
          <li class:current={p.id === session.id}>
            {#if mode === 'rename'}
              <input
                class="name"
                aria-label="Project name"
                maxlength="100"
                bind:value={draft}
                use:focusAll
                onkeydown={(e) => renameKey(e, p.id)}
              />
            {:else}
              <button class="open" onclick={() => session.open(p.id)}>
                <span class="title">{p.file.title}</span>
                <span class="date">{when(p.file.lastUpdatedAt)}</span>
              </button>
            {/if}
            {#if mode === 'rename'}
              <button
                class="icon"
                aria-label="Confirm rename"
                onclick={() => session.rename(p.id, draft)}
              >
                <Icon name="check" />
              </button>
              <button class="icon" aria-label="Cancel" onclick={() => session.cancelRow()}>
                <Icon name="x" />
              </button>
            {:else if mode === 'delete'}
              <span class="ask">Delete for good?</span>
              <button
                class="icon danger"
                aria-label="Confirm delete {p.file.title}"
                onclick={() => session.confirmDelete()}
              >
                <Icon name="check" />
              </button>
              <button class="icon" aria-label="Cancel" onclick={() => session.cancelRow()}>
                <Icon name="x" />
              </button>
            {:else}
              <button
                class="icon"
                aria-label="Rename {p.file.title}"
                onclick={() => rename(p.id, p.file.title)}
              >
                <Icon name="pen" />
              </button>
              <button
                class="icon"
                aria-label="Delete {p.file.title}"
                onclick={() => session.startDelete(p.id)}
              >
                <Icon name="trash" />
              </button>
            {/if}
          </li>
        {:else}
          <li class="none">No project matches.</li>
        {/each}
      </ul>
      {#if session.error}<p class="error" role="alert">{session.error}</p>{/if}
      <div class="actions">
        <button onclick={() => session.create().then(() => session.closeDialog())}>
          New project
        </button>
        <button onclick={() => file?.click()}>Import file…</button>
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
    z-index: 1;
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
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.8em;
  }
  h2 {
    margin: 0;
    font-size: 1.3em;
  }
  .search,
  .name {
    width: 100%;
    box-sizing: border-box;
    padding: 0.5em 0.7em;
    color: var(--ink);
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 0.4em;
    font: inherit;
  }
  .search {
    margin-bottom: 0.8em;
  }
  .name {
    flex: 1;
    width: auto;
    border-color: var(--blue);
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
    align-items: stretch;
    gap: 0.4em;
  }
  li.none {
    color: var(--muted);
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
  button.icon {
    display: grid;
    place-items: center;
    padding: 0.4em;
    background: transparent;
    border-color: transparent;
  }
  button.icon:hover {
    background: var(--btn);
  }
  button.danger {
    color: var(--red-ink);
  }
  .open {
    flex: 1;
    display: flex;
    justify-content: space-between;
    gap: 1em;
    text-align: left;
  }
  .date,
  .ask {
    color: var(--muted);
  }
  .ask {
    align-self: center;
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
