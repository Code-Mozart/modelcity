import { branchOfEdge, branchOfNode, type Branch, type Network } from '../map/branch';
import type { Hover } from './pick';

/** The branch of what is under the pointer (^128): of a node, or of a segment. */
export function branchOf(net: Network, on: Hover, max = Infinity): Branch {
  if (on.kind === 'node') return branchOfNode(net, on.id, max);
  // A heading point is of its node, a bend or radius point of its segment.
  if (on.kind === 'handle') {
    const h = on.handle;
    if (h.type === 'head') return branchOfNode(net, h.node, max);
    return branchOf(net, { kind: 'segment', edge: h.edge, nodes: h.nodes }, max);
  }
  const edge = net.edgesAt(on.nodes[0]).find((e) => e[0] === on.edge);
  return edge
    ? branchOfEdge(net, edge, max)
    : { nodes: [...on.nodes], edges: [on.edge], complete: false };
}
