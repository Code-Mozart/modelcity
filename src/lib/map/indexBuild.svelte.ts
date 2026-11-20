import { ProjectFileError } from '../project/file';
import type { ProjectStorage } from '../project/storage';
import { isComplete } from './segmentIndex';
import { workerRunner, type Runner } from './workerRunner';
/** `none`: no project; `ready`: the index is complete; `stopped`: the user stopped the build (or it has not begun); `failed`: it could not be built. */
export type BuildStatus = 'none' | 'building' | 'ready' | 'stopped' | 'failed';

const aborted = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

/**
 * Makes sure the open project has a complete segment index (^1239) before its map is shown: it is
 * checked by counting (one record for each segment of this version; a record that is there is
 * trusted), and what is missing is built in the background, with how far it is, and can be stopped
 * and started again. A project whose index is not complete is not displayed (a missing record would
 * be a missing segment, not a slow one).
 */
export class IndexBuild {
  status = $state<BuildStatus>('none');
  project = $state('');
  done = $state(0);
  total = $state(0);
  error = $state<string | null>(null);
  private control: AbortController | null = null;
  private generation = 0;

  constructor(
    private storage: ProjectStorage,
    /** How the build is run; the tests of the screen put theirs. */
    public run: Runner = workerRunner,
  ) {}

  /** Check the index of a project, and build what is missing. Another project (or none, '') stops the build of the one before. */
  /** A project that was just made with a complete (empty) index: it is ready at once, without a look into the storage. */
  madeComplete(project: string) {
    this.stop(false);
    ++this.generation;
    [this.project, this.status, this.error, this.done, this.total] = [project, 'ready', null, 0, 0];
  }

  async ensure(project: string) {
    this.stop(false);
    const generation = ++this.generation;
    this.project = project;
    this.error = null;
    this.done = this.total = 0;
    if (!project) {
      this.status = 'none';
      return;
    }
    const complete = await isComplete(this.storage, project);
    if (generation !== this.generation) return;
    if (complete) this.status = 'ready';
    else await this.build(generation);
  }

  /** Build what is missing, again after it was stopped or failed. */
  async resume() {
    if (this.project && this.status !== 'building') await this.build(this.generation);
  }

  /** Throw the index away and build it from the nodes and segments alone (`Ctrl+Comma`). */
  async rebuild() {
    const project = this.project;
    if (!project) return;
    this.stop(false);
    ++this.generation;
    this.status = 'stopped';
    await this.storage.clearIndex(project);
    await this.ensure(project);
  }

  /** Stop the build: what is written stays, and a later build goes on from there. */
  stop(report = true) {
    this.control?.abort();
    this.control = null;
    if (report && this.status === 'building') this.status = 'stopped';
  }

  private async build(generation: number) {
    const control = (this.control = new AbortController());
    this.status = 'building';
    try {
      await this.run(this.project, {
        signal: control.signal,
        onProgress: (done, total) =>
          generation === this.generation && ([this.done, this.total] = [done, total]),
      });
      if (generation !== this.generation) return;
      this.status = (await isComplete(this.storage, this.project)) ? 'ready' : 'failed';
      if (this.status === 'failed')
        this.error = 'The segment index is not complete after it was built.';
    } catch (e) {
      if (generation !== this.generation || aborted(e) || control.signal.aborted) return;
      this.status = 'failed';
      this.error =
        e instanceof ProjectFileError ? e.message : e instanceof Error ? e.message : String(e);
    }
  }
}
