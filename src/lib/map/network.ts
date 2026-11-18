import { chunkId, chunkOf } from './chunks';
import type { Network } from './branch';
import type { LoadedMap } from './hit';

/** The loaded map as the network a branch is followed in (^1258): a node is complete when its own chunk is loaded, because a segment's box touches the chunk of both its nodes (^1239), so all the segments of such a node are loaded; of a node that is only the far end of a loaded segment there may be more. */
export function networkOf(map: LoadedMap): Network {
  return {
    edgesAt: (n) => map.edgesAt(n),
    complete: (n) => {
      const row = map.nodeOf(n);
      if (!row) return false;
      return map.chunks.get(chunkId(...chunkOf(row[1] / 1000, row[2] / 1000)))?.status === 'ready';
    },
  };
}
