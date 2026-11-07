import type { Graph } from '../model/graph';
import { chainSegments, type Chain } from './chains';
import { hoveredEdges, selectedSegments } from './selection';
import type { Hover, Press } from './types';

/** The segments whose two nodes are selected, as (chain, index) pairs (^133). */
export const selectedSegmentsOf = (chains: Chain[], graph: Graph, selection: number[]) =>
  chainSegments(chains, selectedSegments(graph, selection));

/** The segments under the pointer that get an outline: the one, or with Alt held the whole branch (^99, ^128). */
export const hoveredSegmentsOf = (
  chains: Chain[],
  graph: Graph,
  hover: Hover | null,
  alt: boolean,
) => chainSegments(chains, hoveredEdges(graph, hover, alt));

/** Moving several nodes hides all scaffolds meanwhile (^78). */
export const movingGroupOf = (press: Press | null) =>
  press?.kind === 'drag' && press.moved && press.group.length > 0;
