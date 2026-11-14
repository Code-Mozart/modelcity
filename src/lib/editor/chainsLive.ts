import { boxAround, boxesMeet, type Box } from '../curves/hull';
import { LANE_WIDTH_M } from '../curves/lane';
import { SAME_PLACE_M } from '../curves/tolerance';
import { changesBetween } from '../model/changes';
import { edgeOfId, nodeOf, type Graph } from '../model/graph';
import type { Chain } from './chains';
import { buildChains, loneChain, toChain } from './chainsBuild';
import { withParallelS } from './parallelS';

/**
 * The chains of a graph (^106), made again only where an edit changed something (^941). The chains
 * of the graph before it (made without the S-curves that run beside each other, and with them) are
 * kept, and a graph that is the same but for some changed nodes or segments gets the chains of
 * those made again, and the S-curve lanes near them (their curves follow one another). Any other
 * graph (something added or removed) gets all of its chains, as before. The result is what making
 * all of them gives: the test `chainsLive.test` compares the two on random edits.
 */
interface Live {
  g: Graph;
  /** The chains as the segments give them, and as the S-curves beside each other change them. */
  base: Chain[];
  chains: Chain[];
  /** Where in the lists the chain of a segment and the chains at a node are (they stay while the shape does). */
  ofEdge: Map<number, number>;
  ofNode: Map<number, number[]>;
}

const cache = new WeakMap<Graph, Chain[]>();
/** The graphs whose chains were made last, a few: the whole map, the part of it in the window, the part before a drag... Each edit goes on from the one it has the same shape as. */
const lives: Live[] = [];
const KEPT = 6;

export function chainsOf(g: Graph): Chain[] {
  let chains = cache.get(g);
  if (!chains) {
    const next = remembered(g);
    lives.unshift(next);
    lives.length = Math.min(lives.length, KEPT);
    chains = next.chains;
    cache.set(g, chains);
  }
  return chains;
}

/** The chains of a graph made from those of a graph of the same shape that was seen last, or from nothing. */
function remembered(g: Graph): Live {
  for (const was of lives) {
    const next = changed(was, g);
    if (next) return next;
  }
  return whole(g);
}

/** All the chains of a graph, from nothing. */
export function chainsFromNothing(g: Graph): Chain[] {
  return whole(g).chains;
}

function whole(g: Graph): Live {
  const base = buildChains(g);
  const [ofEdge, ofNode] = [new Map<number, number>(), new Map<number, number[]>()];
  base.forEach((c, i) => {
    c.edgeIds.forEach((id) => ofEdge.set(id, i));
    c.nodeIds.forEach((id) => ofNode.set(id, [...(ofNode.get(id) ?? []), i]));
  });
  return { g, base, chains: withParallelS(g, base), ofEdge, ofNode };
}

/** How far the ends of two lanes that touch can be apart (meters). */
const REACH_M = LANE_WIDTH_M + SAME_PLACE_M;

/** The box of a chain, found once for each chain object. */
const boxes = new WeakMap<Chain, Box | null>();
const boxOfChain = (c: Chain): Box | null => {
  if (!boxes.has(c)) {
    const pieces = c.edges.flatMap((r) => r.E.pieces);
    boxes.set(c, pieces.length ? boxAround(pieces) : null);
  }
  return boxes.get(c)!;
};

const grown = (b: Box): Box => ({
  x0: b.x0 - REACH_M,
  x1: b.x1 + REACH_M,
  y0: b.y0 - REACH_M,
  y1: b.y1 + REACH_M,
});

const merged = (a: Box, b: Box): Box => ({
  x0: Math.min(a.x0, b.x0),
  x1: Math.max(a.x1, b.x1),
  y0: Math.min(a.y0, b.y0),
  y1: Math.max(a.y1, b.y1),
});

/** The chains of `g` from those of the graph before it, if `g` differs from it in some nodes and segments only. */
function changed(was: Live, g: Graph): Live | null {
  const changes = changesBetween(was.g, g);
  if (!changes) return null;
  const dirty = new Set<number>();
  for (const i of changes.edges) dirty.add(was.ofEdge.get(g.edges[i]!.id)!);
  for (const i of changes.nodes) for (const c of was.ofNode.get(g.nodes[i]!.id) ?? []) dirty.add(c);
  if (!dirty.size) return { ...was, g };
  const base = [...was.base];
  let reach: Box | null = null;
  const reaching = (c: Chain) => {
    const b = boxOfChain(c);
    if (b) reach = reach ? merged(reach, b) : b;
  };
  for (const i of dirty) {
    reaching(was.base[i]!);
    base[i] = remade(g, was.base[i]!);
    reaching(base[i]!);
  }
  const near = lanesNear(base, dirty, reach as Box | null);
  const chains = [...was.chains];
  for (const i of dirty) chains[i] = base[i]!;
  const done = withParallelS(
    g,
    near.map((i) => base[i]!),
  );
  near.forEach((i, k) => (chains[i] = done[k]!));
  return { g, base, chains, ofEdge: was.ofEdge, ofNode: was.ofNode };
}

/** A chain with the same segments and nodes, made again from the graph. */
function remade(g: Graph, c: Chain): Chain {
  if (!c.edgeIds.length) return loneChain(g, nodeOf(g, c.nodeIds[0]!)!);
  return toChain(
    g,
    c.edgeIds.map((id) => edgeOfId(g, id)!),
  );
}

/** The chains with an S-curve that can be beside one that changed (also through other lanes beside it) and the chains that changed, in the order of the list. */
function lanesNear(base: Chain[], dirty: Set<number>, reach: Box | null): number[] {
  const boxes = base.map((c) => (c.edges.some((r) => r.E.kind === 'S') ? boxOfChain(c) : null));
  const found = new Set(dirty);
  if (reach) {
    let area = grown(reach);
    for (let grew = true; grew;) {
      grew = false;
      boxes.forEach((b, i) => {
        if (!b || found.has(i) || !boxesMeet(b, area)) return;
        found.add(i);
        area = merged(area, grown(b));
        grew = true;
      });
    }
  }
  return [...found].sort((a, b) => a - b);
}
