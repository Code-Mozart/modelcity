/**
 * The nodes whose snap suggestions are pinned (^258): editor state like the selection, with no
 * history step and not in the file. A node that is gone drops out by itself (derived).
 */
export class Pins {
  private ids = $state.raw<number[]>([]);
  readonly list = $derived(this.ids.filter((id) => this.exists(id)));

  constructor(private exists: (id: number) => boolean) {}

  /** `S`: pin these nodes, each pin replaces the one before; none unpins all. */
  set(nodes: number[]) {
    this.ids = [...nodes];
  }
}
