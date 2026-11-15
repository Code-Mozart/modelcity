<script lang="ts">
  import type { IndexBuild } from './indexBuild.svelte';

  /**
   * What the segment index of the open project is doing (^1239): it is built before the map is
   * shown, so that no segment is missing from it. Shown while it is built, stopped or failed.
   */
  let { build, title }: { build: IndexBuild; title: string } = $props();
  const shown = $derived(
    build.status === 'building' || build.status === 'stopped' || build.status === 'failed',
  );
  const count = (n: number) => n.toLocaleString('en');
</script>

{#if shown}
  <div class="panel" role="status" aria-label="Segment index">
    {#if build.status === 'building'}
      <p class="what">Building the segment index of “{title}”</p>
      <progress max={Math.max(build.total, 1)} value={build.done}></progress>
      <p>{count(build.done)} of {count(build.total)} segments</p>
      <p class="note">The map is shown when it is complete.</p>
      <button onclick={() => build.stop()}>Cancel</button>
    {:else if build.status === 'stopped'}
      <p class="what">The segment index of “{title}” is not complete</p>
      <p class="note">
        {count(build.done)} of {count(build.total)} segments. The map is not shown without it, because
        segments would be missing.
      </p>
      <button onclick={() => void build.resume()}>Build it</button>
    {:else}
      <p class="what">The segment index of “{title}” could not be built</p>
      <p class="note">{build.error}</p>
      <button onclick={() => void build.resume()}>Try again</button>
    {/if}
  </div>
{/if}

<style>
  .panel {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    gap: 0.6em;
    min-width: 24em;
    max-width: 34em;
    padding: 1.2em 1.4em;
    background: var(--panel);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 0.5em;
  }
  p {
    margin: 0;
  }
  .what {
    font-weight: 600;
  }
  .note {
    color: var(--muted);
  }
  progress {
    width: 100%;
  }
  button {
    align-self: flex-start;
    font: inherit;
    padding: 0.35em 0.9em;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 0.35em;
    cursor: pointer;
  }
</style>
