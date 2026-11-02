<script lang="ts">
  import { tick } from 'svelte';
  import './cards.css';
  import FilterList from '../ui/FilterList.svelte';
  import type { ModalTarget } from './modalHints';
  import Icon from '../ui/Icon.svelte';
  import Notice from '../ui/Notice.svelte';
  import { titleOf } from './file';
  import ProjectCard from './ProjectCard.svelte';
  import type { ProjectSession } from './session.svelte';

  /**
   * The projects of the browser, opened with Ctrl+O (^168, ^171): search, open, rename, delete,
   * import a file, export JSON, new project. Everything is a card of the full width; only the list
   * of projects scrolls (^211).
   */
  let { session }: { session: ProjectSession } = $props();
  let file = $state<HTMLInputElement>();
  let list = $state<ReturnType<typeof FilterList<(typeof session.projects)[number]>>>();
  let query = $state('');
  let searching = $state(false);

  // Typing right after Ctrl+O searches (^178); with `Ctrl+O` the file window opens as well (^223).
  $effect(() => {
    if (!session.modalOpen) return;
    query = '';
    void tick().then(() => {
      if (session.wantsImport) file?.click();
      session.wantsImport = false;
      list?.focus();
    });
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
    { target: 'export', label: 'Export JSON', run: () => session.exportJson(), current: false },
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
        textOf={(p) => titleOf(p.file)}
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
</style>
