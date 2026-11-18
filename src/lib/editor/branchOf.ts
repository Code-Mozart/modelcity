import { branchOfEdge, branchOfNode, type Branch, type Network } from '../map/branch';
import type { Hover } from './pick';

/** The branch of what is under the pointer (^128): of a node, or of a segment. */
export function branchOf(net: Network, on: Hover): Branch {
  if (on.kind === 'node') return branchOfNode(net, on.id);
  const edge = net.edgesAt(on.nodes[0]).find((e) => e[0] === on.edge);
  return edge
    ? branchOfEdge(net, edge)
    : { nodes: [...on.nodes], edges: [on.edge], complete: false };
}
