import type { Anchor } from './bounds';
import { contentHandles, type HandleType } from './curves/handles';
import type { EdgeRef, Path } from './curves/path';

/** Half the drawn size of each handle, pixels (dots 5.5 + outline, rings 7 + outline). */
const HANDLE_RADIUS_PX: Record<HandleType, number> = {
  node: 7,
  head: 7,
  ctrl: 7,
  s1: 7,
  s2: 7,
  rad: 9,
};

/** Everything the user can grab, as camera-bounds anchors (^38). */
export function contentAnchors(path: Path, edges: EdgeRef[]): Anchor[] {
  return contentHandles(path, edges).map((h) => {
    const r = HANDLE_RADIUS_PX[h.type];
    const node = h.type === 'head' ? path.nodes[h.i] : undefined;
    return node ? { x: node.x, y: node.y, r, heading: node.th } : { x: h.x, y: h.y, r };
  });
}
