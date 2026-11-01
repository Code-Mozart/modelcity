<script lang="ts">
  import type { DialogTarget } from './hints';
  import Icon from './Icon.svelte';
  import type { ProjectSession } from './project/session.svelte';
  import type { StoredProject } from './project/storage';
  import { formatLocal, formatLocalIso } from './time';

  /**
   * One project in the projects dialog (^168): title and date, the pen and the bin inside the card.
   * Renaming and asking about a delete change the card in place, with the same two icon places.
   * Styles: `ProjectDialog.svelte` (all cards look alike).
   */
  let {
    session,
    project: p,
    over,
  }: {
    session: ProjectSession;
    project: StoredProject;
    over: (target: DialogTarget) => Record<string, () => void>;
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
      <span class="title">{p.file.title}</span>
      <span class="date" title={formatLocalIso(p.file.lastUpdatedAt)}>
        {formatLocal(p.file.lastUpdatedAt)}
      </span>
    </button>
  {/if}
  {#if mode === 'rename'}
    <button
      class="icon"
      aria-label="Confirm rename"
      onclick={() => session.rename(p.id, draft)}
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
  {:else if mode === 'delete'}
    <button
      class="icon danger"
      aria-label="Confirm delete {p.file.title}"
      onclick={() => session.confirmDelete()}
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
