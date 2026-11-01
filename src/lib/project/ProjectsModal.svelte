<script lang="ts">
  import { tick } from 'svelte';
  import FilterList from '../ui/FilterList.svelte';
  import type { ModalTarget } from './modalHints';
  import Icon from '../ui/Icon.svelte';
  import Notice from '../ui/Notice.svelte';
  import ProjectCard from './ProjectCard.svelte';
  import type { ProjectSession } from './session.svelte';

  /**
   * The projects of the browser, opened with Ctrl+O (^168, ^171): search, open, rename, delete,
   * import a file, save to disc, new project. Everything is a card of the full width; only the list
   * of projects scrolls (^211).
   */
  let { session }: { session: ProjectSession } = $props();
  let file = $state<HTMLInputElement>();
  let list = $state<ReturnType<typeof FilterList<(typeof session.projects)[number]>>>();
  let query = $state('');
  let searching = $state(false);

  // Typing right after Ctrl+O searches (^178).
  $effect(() => {
    if (!session.modalOpen) return;
    query = '';
    void tick().then(() => list?.focus());
  });

  async function pick() {
    const f = file?.files?.[0];
    if (f) await session.importFile(f);
    if (file) file.value = '';
  }

  /** What the pointer is over, for the control hints (^181). */
  const over = (target: ModalTarget) => ({
    onpointerenter: () => (session.over = target),
    onpointerleave: () => (session.over = null),
  });

  /** The cards below the list. */
  const actions = $derived([
    { target: 'import', label: 'Import file…', run: () => file?.click(), current: false },
    { target: 'save', label: 'Save to disc…', run: () => session.download(), current: false },
    {
      target: 'new',
      label: 'New project',
      run: () => session.newProject(),
      current: session.noProject,
    },
  ] as const);

  /** The search field says "search" while the pointer is over it and it is not the one that is typed in. */
  const searchAttrs = {
    onpointerenter: () => !searching && (session.over = 'search'),
    onpointerleave: () => (session.over = null),
    onfocus: () => {
      searching = true;
      session.over = null;
    },
    onblur: () => (searching = false),
  };
</script>

{#if session.modalOpen}
  <div class="backdrop" role="presentation" onpointerdown={() => session.closeModal()}>
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
          onclick={() => session.closeModal()}
          {...over('close')}
        >
          <Icon name="x" />
        </button>
      </header>
      <FilterList
        bind:this={list}
        bind:query
        items={session.projects}
        key={(p) => p.id}
        textOf={(p) => p.file.title}
        label="Search projects"
        none="No project matches."
        {searchAttrs}
      >
        {#snippet item(project)}
          <ProjectCard {session} {project} {over} />
        {/snippet}
      </FilterList>
      {#if session.error}<div class="gap"><Notice kind="error">{session.error}</Notice></div>{/if}
      <ul class="actions">
        {#each actions as a (a.target)}
          <li class="card" class:current={a.current}>
            <button class="open" onclick={a.run} {...over(a.target)}>{a.label}</button>
          </li>
        {/each}
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
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--bg) 60%, transparent);
  }
  /* Wide, and as tall as the content up to three quarters of the screen (^211); only the list scrolls. */
  .dialog {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: min(60em, calc(100% - 2em));
    max-height: 75%;
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
  .dialog :global(.name) {
    box-sizing: border-box;
    padding: 0.5em 0.7em;
    color: var(--ink);
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 0.4em;
    font: inherit;
    flex: 1;
    min-width: 0;
    margin: 0.3em 0 0.3em 0.3em;
    border-color: var(--blue);
  }
  ul.actions {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: 0.4em;
    margin: 1.6em 0 0;
    padding: 0.2em;
    list-style: none;
  }
  .gap {
    flex: none;
    margin-top: 0.8em;
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
    flex-direction: column;
    gap: 0.1em;
    padding: 0.7em 0.9em;
    text-align: left;
    background: transparent;
    border: 0;
  }
  .dialog :global(.line) {
    display: flex;
    justify-content: space-between;
    gap: 1em;
  }
  /* The mark of the open project: a word, not only a color (^177). */
  .dialog :global(.label) {
    color: var(--muted);
    font-size: 0.85em;
    font-style: italic;
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
</style>
