import { chunkId, chunkOf } from '../map/chunks';
import type { NodeRow } from '../project/storage';
import type { Selection } from './selection';

/**
 * Where the selected nodes are (^1257): the chunks of the selected nodes are pinned and stay in
 * memory, far from the view as they are. The chunk of a node is noted when its row is there, and
 * kept after: a selection that is undone and done again needs the chunk of a node whose row was
 * let go in between.
 */
export class SelectionPins {
  private chunks = new Map<number, string>();

  /** The chunks to pin for a selection: noted from the rows that are loaded now (`nodeOf`). */
  pinnedFor(sel: Selection, nodeOf: (id: number) => NodeRow | undefined): Set<string> {
    const out = new Set<string>();
    for (const id of sel) {
      const row = nodeOf(id);
      if (row) this.chunks.set(id, chunkId(...chunkOf(row[1] / 1000, row[2] / 1000)));
      const chunk = this.chunks.get(id);
      if (chunk) out.add(chunk);
    }
    return out;
  }

  /** Another project is open: nothing is known of the nodes of the one before. */
  reset() {
    this.chunks.clear();
  }
}
