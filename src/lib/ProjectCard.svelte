<script lang="ts">
  import type { ModalTarget } from './hints';
  import Icon from './Icon.svelte';
  import type { ProjectSession } from './project/session.svelte';
  import type { StoredProject } from './project/storage';
  import { formatAgo, formatLocalIso } from './time';

  /**
   * One project in the projects modal (^168): title and how long ago it was changed (the exact time is the tooltip), the pen and the bin inside the card.
   * Renaming and asking about a delete change the card in place, with the same two icon places.
   * Styles: `ProjectsModal.svelte` (all cards look alike).
   */
  let {
    session,
    project: p,
    over,
  }: {
    session: ProjectSession;
    project: StoredProject;
    over: (target: ModalTarget) => Record<string, () => void>;
  } = $props();

  let draft = $state('');
  const mode = $derived(session.row?.id === p.id ? session.row.mode : null);

  function startRename() {
    draft = p.file.title;
    session.startRename(p.id);
  }

  function renameKey(e: KeyboardEvent) {
    if (e.key === 'Enter') void session.rename(p.id, draft);
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
</script>

<li class="card" class:current={p.id === session.id} class:asking={mode === 'delete'}>
  {#if mode === 'rename'}
    <input
      class="name"
      aria-label="Project name"
      maxlength="100"
      bind:value={draft}
      use:focusAll
      onkeydown={renameKey}
    />
  {:else}
    <button class="open" title={p.file.title} onclick={() => session.open(p.id)} {...over('card')}>
      {#if p.id === session.id}<span class="label">open</span>{/if}
      <span class="line">
        <span class="title">{p.file.title}</span>
        <span class="date" title={formatLocalIso(p.file.lastUpdatedAt)}>
          {formatAgo(p.file.lastUpdatedAt, Date.now())}
        </span>
      </span>
    </button>
  {/if}
  {#if mode}
    <button
      class="icon"
      class:danger={mode === 'delete'}
      aria-label={mode === 'rename' ? 'Confirm rename' : `Confirm delete ${p.file.title}`}
      onclick={() => (mode === 'rename' ? session.rename(p.id, draft) : session.confirmDelete())}
      {...over('confirm')}
    >
      <Icon name="check" />
    </button>
    <button
      class="icon"
      aria-label="Cancel"
      onclick={() => session.cancelRow()}
      {...over('cancel')}
    >
      <Icon name="x" />
    </button>
  {:else}
    <button
      class="icon"
      aria-label="Rename {p.file.title}"
      onclick={startRename}
      {...over('rename')}
    >
      <Icon name="pen" />
    </button>
    <button
      class="icon"
      aria-label="Delete {p.file.title}"
      onclick={() => session.startDelete(p.id)}
      {...over('delete')}
    >
      <Icon name="trash" />
    </button>
  {/if}
</li>
