import type { Band } from '../editor/editor.svelte';
import type { Branch } from '../map/branch';
import { nodesOf, type Hover } from '../editor/pick';
import type { Selection } from '../editor/selection';
import type { SkeletonEdge } from '../map/curve';
import type { EdgeRow, NodeRow } from '../project/storage';
import type { Marks } from './marks';

type InView = {
  nodes: readonly (readonly NodeRow[])[];
  edges: ReadonlyMap<number, { row: EdgeRow; edge: SkeletonEdge }>;
};

/** The selected nodes and segments (both nodes selected) of what is in view. */
function selectedIn(sel: Selection, inView: InView) {
  const nodes = inView.nodes.flatMap((list) => list.filter((n) => sel.has(n[0])));
  const edges = [...inView.edges.values()]
    .filter(({ row }) => sel.has(row[1]) && sel.has(row[2]))
    .map((e) => e.edge);
  return { nodes, edges };
}

/** What of the selection, the hover and the box is on the screen (^1257): the selection is looked up for the nodes in view, not the other way round (it can be larger than what is in view). */
export function marksOf(
  state: { selection: Selection; hover: Hover | null; band: Band | null; branch: Branch | null },
  inView: InView,
  nodeOf: (id: number) => NodeRow | undefined,
): Marks {
  const { selection: sel, hover, band, branch } = state;
  const picked = sel.size ? selectedIn(sel, inView) : { nodes: [], edges: [] };
  const hoverNodes = nodesOf(hover)
    .map(nodeOf)
    .filter((n): n is NodeRow => n !== undefined);
  const ids = branch ? branch.edges : hover?.kind === 'segment' ? [hover.edge] : [];
  const hoverEdges = ids
    .map((id) => inView.edges.get(id)?.edge)
    .filter((e): e is SkeletonEdge => e !== undefined);
  return { selected: picked.nodes, selectedEdges: picked.edges, hoverNodes, hoverEdges, band };
}

/** The node the road being drawn goes on from is marked like a selected node (^65; on `main` it was the selection). */
export const withTip = (marks: Marks, tip: NodeRow | undefined): Marks =>
  tip ? { ...marks, selected: [...marks.selected, tip] } : marks;
