<script lang="ts">
  import type { ModalTarget } from './modalHints';
  import Icon from '../ui/Icon.svelte';
  import type { ProjectSession } from './session.svelte';
  import { titleOf, versionLabel } from './file';
  import type { StoredHeader } from './storage';
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
    project: StoredHeader;
    over: (target: ModalTarget) => Record<string, () => void>;
  } = $props();

  let draft = $state('');
  const mode = $derived(session.row?.id === p.id ? session.row.mode : null);
  // A name that was changed is work that closing the modal would throw away (^233).
  $effect(() => {
    if (mode === 'rename') session.renameDirty = draft.trim() !== titleOf(p.file);
  });

  function startRename() {
    draft = titleOf(p.file);
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
    <button
      class="open"
      title={titleOf(p.file)}
      onclick={() => session.open(p.id)}
      {...over('card')}
    >
      {#if p.id === session.id}<span class="label">open</span>{/if}
      <span class="line">
        <span class="title">{titleOf(p.file)}</span>
        {#if versionLabel(p.file)}<span class="version">{versionLabel(p.file)}</span>{/if}
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
      aria-label={mode === 'rename' ? 'Confirm rename' : `Confirm delete ${titleOf(p.file)}`}
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
      aria-label="Rename {titleOf(p.file)}"
      onclick={startRename}
      {...over('rename')}
    >
      <Icon name="pen" />
    </button>
    <button
      class="icon"
      aria-label="Delete {titleOf(p.file)}"
      onclick={() => session.startDelete(p.id)}
      {...over('delete')}
    >
      <Icon name="trash" />
    </button>
  {/if}
</li>
