<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { fuzzyFilter } from './fuzzy';

  /**
   * A fuzzy-searchable list that scrolls on its own (^178, ^213): the search field stays where it is
   * and only the items scroll. For every list the user sees: the projects, later the operations
   * search (^97). `item` draws one item (it must render its own `li`); `searchAttrs` go on the
   * search field (hover and focus events for the control hints).
   */
  let {
    items,
    key,
    textOf,
    label,
    item,
    none = 'Nothing matches.',
    empty = 'Nothing here yet.',
    query = $bindable(''),
    searchAttrs = {},
    onpick,
  }: {
    items: T[];
    key: (item: T) => string | number;
    textOf: (item: T) => string;
    label: string;
    item: Snippet<[T]>;
    /** What the list says when the search matches nothing, and when there is nothing to search (^385). */
    none?: string;
    empty?: string;
    query?: string;
    searchAttrs?: Record<string, unknown>;
    /** `Enter` in the search field acts on the first item found, as a click on it would (^745). */
    onpick?: (item: T) => void;
  } = $props();

  let search = $state<HTMLInputElement>();
  const shown = $derived(fuzzyFilter(items, query, textOf));

  /** Put the cursor in the search field, so that typing searches. */
  export function focus() {
    search?.focus();
  }
</script>

<div class="filter">
  <input
    class="search"
    type="search"
    placeholder="Search…"
    aria-label={label}
    bind:this={search}
    bind:value={query}
    onkeydown={(e) => e.key === 'Enter' && shown[0] !== undefined && onpick?.(shown[0])}
    {...searchAttrs}
  />
  <ul>
    {#each shown as it (key(it))}
      {@render item(it)}
    {:else}
      <li class="none">{items.length === 0 ? empty : none}</li>
    {/each}
  </ul>
</div>

<style>
  .filter {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .search {
    flex: none;
    box-sizing: border-box;
    width: 100%;
    margin-bottom: 0.8em;
    padding: 0.5em 0.7em;
    color: var(--ink);
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 0.4em;
    font: inherit;
  }
  ul {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 0.4em;
    min-height: 0;
    margin: 0;
    padding: 0.2em;
    overflow-y: auto;
    list-style: none;
  }
  .none {
    color: var(--muted);
  }
</style>
