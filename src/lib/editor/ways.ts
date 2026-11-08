import { edgesAt, nodeOf, type Graph } from '../model/graph';
import type { Drawn } from './targets';
import type { Press } from './types';

/** The headings the node of a press has around it: where the segments of the node run to (^888). */
export const waysOfPress = (g: Graph, press: Press): number[] =>
  press.kind === 'drag' || press.kind === 'place' ? waysAround(g, press.id) : [];

/** The heading of the node a road is being extended from: the one the new node's segment runs to (^888). */
export const tipWays = (d: Drawn): number[] => {
  const tip = d.active === null ? undefined : nodeOf(d.graph, d.active);
  return tip ? [tip.th] : [];
};

/** The headings of the nodes that the segments of a node run to (^888). */
export function waysAround(g: Graph | undefined, id: number): number[] {
  if (!g) return [];
  return edgesAt(g, id).flatMap((e) => {
    const other = nodeOf(g, e.start === id ? e.end : e.start);
    return other ? [other.th] : [];
  });
}
