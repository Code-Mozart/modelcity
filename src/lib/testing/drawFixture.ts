import { at, editing } from './editHarness';
import { edge, node } from './loadedMap';
import { editorKey } from '../editor/keys';

/**
 * A road A B C from (-100, 0) to (100, 0) through B at (0, 0), segments 10 (A to B) and 11 (B to C),
 * and a lone node D at (0, 100); with the editor in draw mode and the press of draw mode.
 */
export async function drawing() {
  const e = await editing(
    [node(1, -100, 0), node(2, 0, 0), node(3, 100, 0), node(4, 0, 100)],
    [edge(10, 1, 2), edge(11, 2, 3)],
  );
  e.editor.enterDraw();
  const click = async (x: number, y: number, alt = false) => {
    e.draw.down(at(x, y), alt);
    e.draw.up();
    await e.settle();
  };
  const drag = async (x: number, y: number, to: { x: number; y: number }, ctrl = false) => {
    e.draw.down(at(x, y), false);
    e.draw.move(at(to.x, to.y), ctrl);
    e.draw.up();
    await e.settle();
  };
  const right = async (x: number, y: number, alt = false) => {
    await e.editor.rightClick(e.draw.pickAt(at(x, y)), alt);
    await e.settle();
  };
  const key = async (k: string) => {
    editorKey(e.editor, {
      key: k,
      code: '',
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    });
    await e.settle();
  };
  const ids = async () => {
    const r = await e.rows();
    return { nodes: r.nodes.map((n) => n[0]), edges: r.edges.map((x) => x.slice(0, 3)) };
  };
  return { ...e, click, drag, right, key, ids };
}
