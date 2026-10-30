<script lang="ts">
  import MouseIcon from './MouseIcon.svelte';

  /** Tooltips in the top left corner over the map, without a background (^41). */
</script>

<ul class="hints" aria-label="Controls">
  <li><MouseIcon lmb /> <span>create node</span></li>
</ul>

<style>
  .hints {
    position: absolute;
    left: 14px;
    top: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--ink);
    pointer-events: none;
    /* No background; a halo keeps the text readable over the map. */
    filter: drop-shadow(0 0 2px var(--bg)) drop-shadow(0 0 2px var(--bg));
  }
  li {
    display: flex;
    gap: 8px;
    align-items: center;
    font:
      500 14px/1.3 system-ui,
      sans-serif;
  }
</style>
