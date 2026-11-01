<script lang="ts">
  import { tick } from 'svelte';
  import type { DialogTarget } from './hints';
  import Icon from './Icon.svelte';
  import ProjectCard from './ProjectCard.svelte';
  import type { ProjectSession } from './project/session.svelte';

  /**
   * The projects of the browser, opened with Ctrl+O (^168, ^171): search, open, rename, delete,
   * import a file, save to disc, new project. Everything is a card of the full width.
   */
  let { session }: { session: ProjectSession } = $props();
  let file = $state<HTMLInputElement>();
  let search = $state<HTMLInputElement>();

  // Typing right after Ctrl+O searches (^178).
  $effect(() => {
    if (session.dialogOpen) void tick().then(() => search?.focus());
  });

  async function pick() {
    const f = file?.files?.[0];
    if (f) await session.importText(await f.text());
    if (file) file.value = '';
  }

  /** What the pointer is over, for the control hints (^181). */
  const over = (target: DialogTarget) => ({
    onpointerenter: () => (session.over = target),
    onpointerleave: () => (session.over = null),
  });
</script>

{#if session.dialogOpen}
  <div class="backdrop" role="presentation" onpointerdown={() => session.closeDialog()}>
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      aria-label="Projects"
      aria-busy={session.busy}
      inert={session.busy}
      tabindex="-1"
      onpointerdown={(e) => e.stopPropagation()}
    >
      <header>
        <h2>Projects</h2>
        <button
          class="icon"
          aria-label="Close"
          onclick={() => session.closeDialog()}
          {...over('close')}
        >
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
          <ProjectCard {session} project={p} {over} />
        {:else}
          <li class="none">No project matches.</li>
        {/each}
      </ul>
      {#if session.error}<p class="error" role="alert">{session.error}</p>{/if}
      <ul class="actions">
        <li class="card">
          <button class="open" onclick={() => file?.click()} {...over('import')}>
            Import file…
          </button>
        </li>
        <li class="card">
          <button class="open" onclick={() => session.download()} {...over('save')}>
            Save to disc…
          </button>
        </li>
        <li class="card" class:current={session.noProject}>
          <button class="open" onclick={() => session.newProject()} {...over('new')}>
            New project
          </button>
        </li>
      </ul>
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
    width: min(34em, calc(100% - 2em));
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
  .dialog :global(.name) {
    box-sizing: border-box;
    padding: 0.5em 0.7em;
    color: var(--ink);
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 0.4em;
    font: inherit;
  }
  .search {
    width: 100%;
    margin-bottom: 0.8em;
  }
  .dialog :global(.name) {
    flex: 1;
    min-width: 0;
    margin: 0.3em 0 0.3em 0.3em;
    border-color: var(--blue);
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
    margin: 0 0 0.8em;
    padding: 0;
    list-style: none;
  }
  ul.actions {
    margin: 0;
  }
  li.none {
    color: var(--muted);
  }
  /* A card spans the whole width; what it has to the right (the icons) is inside it. */
  .dialog :global(li.card) {
    display: flex;
    align-items: center;
    gap: 0.2em;
    padding-right: 0.3em;
    background: var(--btn);
    border: 1px solid var(--line);
    border-radius: 0.4em;
  }
  .dialog :global(li.card:hover) {
    border-color: var(--muted);
  }
  .dialog :global(li.current) {
    outline: 2px solid var(--blue);
  }
  /* The card that is asked about deletion. */
  .dialog :global(li.asking) {
    outline: 2px solid var(--red);
  }
  .dialog :global(button) {
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  /* The icon buttons keep their place and size in every state, and have no background. */
  .dialog :global(button.icon) {
    flex: none;
    display: grid;
    place-items: center;
    width: 2.4em;
    height: 2.4em;
    padding: 0;
    background: transparent;
    border: 0;
    border-radius: 0.4em;
  }
  .dialog :global(button.icon:hover) {
    color: var(--blue);
  }
  .dialog :global(button.danger),
  .dialog :global(button.danger:hover) {
    color: var(--red-ink);
  }
  .dialog :global(.open) {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: space-between;
    gap: 1em;
    padding: 0.7em 0.9em;
    text-align: left;
    background: transparent;
    border: 0;
  }
  .dialog :global(.title) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dialog :global(.date) {
    flex: none;
    white-space: nowrap;
    color: var(--muted);
  }
  .error {
    margin: 0 0 0.8em;
    color: var(--red-ink);
  }
</style>
